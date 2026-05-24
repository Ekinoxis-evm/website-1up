import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { seedBracket } from "@/lib/bracket/seed";
import { nextPow2 } from "@/lib/bracket/byes";
import { planPlayIn } from "@/lib/bracket/playIn";
import { derivePodium } from "@/lib/bracket/podium";
import { pointsFor } from "@/lib/tournamentPoints";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

// ── DE bye-cascading (v2.36.14) ────────────────────────────────────────────
// When a WB BYE leaves an LB slot with `p_source='bye'`, the LB match has
// effectively one real seat. As soon as the *other* seat is filled (by the
// real WB feeder's loser), the LB match auto-completes for the present
// participant — they advance to the next LB match. That advance can itself
// land in a slot whose other side is phantom, triggering another cascade.
// This helper handles the chain.
//
// Call after writing the loser into `lbMatchId` slot `arrivedSlot`. Reads
// the LB match state to decide:
//   • If the OTHER slot is `p_source='bye'`        → auto-complete + cascade
//   • If both real participants are present        → mark `state='ready'`
//   • Otherwise (still waiting for another source) → leave as-is
async function cascadeLbAdvance(
  lbMatchId:   number,
  arrivedId:   number,
  arrivedSlot: 1 | 2,
): Promise<void> {
  const { data: lb } = await supabaseAdmin
    .from("bracket_matches")
    .select("id, p1_id, p2_id, p1_source, p2_source, state, next_match_id, next_match_slot")
    .eq("id", lbMatchId)
    .single();
  if (!lb) return;

  const otherSource = arrivedSlot === 1 ? lb.p2_source : lb.p1_source;
  const otherId     = arrivedSlot === 1 ? lb.p2_id     : lb.p1_id;

  // Case 1 — both real participants are seated: ready to play.
  if (otherId !== null && otherSource !== "bye") {
    if (lb.state !== "completed" && lb.state !== "bye") {
      await supabaseAdmin
        .from("bracket_matches")
        .update({ state: "ready" })
        .eq("id", lbMatchId);
    }
    return;
  }

  // Case 2 — the other side is a phantom: cascade the arrived participant
  // forward as the de-facto winner of this match.
  if (otherSource === "bye") {
    await supabaseAdmin
      .from("bracket_matches")
      .update({
        state: "bye",
        winner_id: arrivedId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lbMatchId);

    if (!lb.next_match_id || !lb.next_match_slot) return;

    const nextSlot = lb.next_match_slot as 1 | 2;
    const slotUpd  = nextSlot === 1
      ? { p1_id: arrivedId, p1_source: "winner_of" as const, p1_source_match_id: lbMatchId }
      : { p2_id: arrivedId, p2_source: "winner_of" as const, p2_source_match_id: lbMatchId };
    await supabaseAdmin
      .from("bracket_matches")
      .update(slotUpd)
      .eq("id", lb.next_match_id);

    // Recurse on the downstream match — it might also be a phantom-chain.
    await cascadeLbAdvance(lb.next_match_id, arrivedId, nextSlot);
    return;
  }

  // Case 3 — other slot still waiting for a non-bye source; no action.
}

// GET /api/admin/brackets?tournamentId=xxx
export async function GET(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tournamentId = searchParams.get("tournamentId");
  if (!tournamentId) return NextResponse.json({ error: "tournamentId requerido" }, { status: 400 });

  const { data: bracket } = await supabaseAdmin
    .from("brackets")
    .select("*")
    .eq("tournament_id", parseInt(tournamentId))
    .maybeSingle();

  if (!bracket) return NextResponse.json(null);

  const [{ data: participants }, { data: matches }] = await Promise.all([
    // Same shape as the public bracket endpoint — joining user_profiles so
    // the admin's interactive tree can render avatar match cards.
    supabaseAdmin
      .from("bracket_participants")
      .select("*, user_profiles(avatar_url, username, nombre, apellidos)")
      .eq("bracket_id", bracket.id)
      .order("seed"),
    supabaseAdmin
      .from("bracket_matches")
      .select("*")
      .eq("bracket_id", bracket.id)
      .order("bracket_side")
      .order("round")
      .order("match_number"),
  ]);

  return NextResponse.json({ bracket, participants: participants ?? [], matches: matches ?? [] });
}

// POST /api/admin/brackets — seed a new DRAFT bracket.
// Body: { tournamentId, format, participantIds? }
//   participantIds — ordered array of user_profile_ids; index defines the seed.
//   When omitted, falls back to every registered participant in registration order.
export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { tournamentId, format, participantIds } = body as {
    tournamentId: number;
    format: "single_elimination" | "double_elimination";
    participantIds?: number[];
  };

  if (!tournamentId || !format)
    return NextResponse.json({ error: "tournamentId y format son requeridos" }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from("brackets")
    .select("id")
    .eq("tournament_id", tournamentId)
    .maybeSingle();

  if (existing) return NextResponse.json({ error: "Ya existe un bracket para este torneo" }, { status: 409 });

  // Registered / attended participants for this tournament
  const { data: registrations, error: regError } = await supabaseAdmin
    .from("tournament_registrations")
    .select("user_profile_id, user_profiles(id, nombre, apellidos, username)")
    .eq("tournament_id", tournamentId)
    .in("status", ["registered", "attended"]);

  if (regError) return NextResponse.json({ error: regError.message }, { status: 500 });
  if (!registrations || registrations.length < 2)
    return NextResponse.json({ error: "Se necesitan al menos 2 participantes registrados" }, { status: 400 });

  // Resolve the seed order: explicit participantIds, else registration order
  const regByProfile = new Map(registrations.map(r => [r.user_profile_id, r]));
  const ordered = (participantIds && participantIds.length > 0)
    ? participantIds.map(id => regByProfile.get(id)).filter((r): r is NonNullable<typeof r> => !!r)
    : registrations;

  if (ordered.length < 2)
    return NextResponse.json({ error: "Selecciona al menos 2 participantes registrados" }, { status: 400 });

  const n = ordered.length;

  // For non-pow2 single-elim, the new play-in path uses a smaller MAIN bracket
  // (size = largest pow2 ≤ N) with a pre-round absorbing the excess players.
  // `rounds_winners` stored on the bracket reflects the main bracket's depth
  // — the play-in (round 0) sits outside that count so labels like "Final"
  // and "Semifinal" still compute correctly from `rounds_winners`.
  //
  // Power-of-2 N and all double-elim still use `nextPow2(N)` (standard
  // seeding via `distributeByes`).
  const sePlan   = format === "single_elimination" ? planPlayIn(n) : null;
  const size     = sePlan ? sePlan.prevPow2 : nextPow2(n);
  const wRounds  = Math.log2(size);
  const lRounds  = format === "double_elimination" ? 2 * (wRounds - 1) : 0;

  const seeds = seedBracket(n, format);

  // 1. Bracket row — created as DRAFT (editable, not public)
  const { data: bracket, error: bracketError } = await supabaseAdmin
    .from("brackets")
    .insert({
      tournament_id:     tournamentId,
      format,
      status:            "draft",
      participant_count: n,
      rounds_winners:    wRounds,
      rounds_losers:     lRounds,
    })
    .select()
    .single();

  if (bracketError || !bracket)
    return NextResponse.json({ error: bracketError?.message ?? "Error al crear bracket" }, { status: 500 });

  // 2. Participants — seeded by the resolved order
  const participantInserts = ordered.map((reg, idx) => {
    const profile = reg.user_profiles as { nombre: string | null; apellidos: string | null; username: string | null } | null;
    const fullName = `${profile?.nombre ?? ""} ${profile?.apellidos ?? ""}`.trim();
    const displayName = profile?.username ?? (fullName || `Participante ${idx + 1}`);
    return {
      bracket_id:      bracket.id,
      seed:            idx + 1,
      display_name:    displayName,
      user_profile_id: reg.user_profile_id,
      eliminated:      false,
    };
  });

  const { data: participants, error: partError } = await supabaseAdmin
    .from("bracket_participants")
    .insert(participantInserts)
    .select();

  if (partError || !participants)
    return NextResponse.json({ error: partError?.message ?? "Error al crear participantes" }, { status: 500 });

  const seedToId = new Map<number, number>();
  participants.forEach(p => seedToId.set(p.seed, p.id));

  // 3. Matches (no pointers yet)
  const matchInserts = seeds.map(s => {
    const p1Id = s.p1Seed ? (seedToId.get(s.p1Seed) ?? null) : null;
    const p2Id = s.p2Seed ? (seedToId.get(s.p2Seed) ?? null) : null;
    const state = s.isBye ? "bye" as const
      : (p1Id && p2Id ? "ready" as const : "pending" as const);

    return {
      bracket_id:   bracket.id,
      bracket_side: s.side,
      round:        s.round,
      match_number: s.matchNumber,
      p1_id:        p1Id,
      p1_source:    p1Id ? "seed" as const : null,
      p2_id:        p2Id,
      p2_source:    p2Id ? "seed" as const : (s.isBye ? "bye" as const : null),
      state,
      winner_id:    s.isBye ? p1Id : null,
      loser_id:     null,
    };
  });

  const { data: insertedMatches, error: matchError } = await supabaseAdmin
    .from("bracket_matches")
    .insert(matchInserts)
    .select();

  if (matchError || !insertedMatches)
    return NextResponse.json({ error: matchError?.message ?? "Error al crear matches" }, { status: 500 });

  // 4. Pointer lookup
  const matchKey = (side: string, round: number, num: number) => `${side}-${round}-${num}`;
  const matchMap = new Map<string, number>();
  insertedMatches.forEach(m => matchMap.set(matchKey(m.bracket_side, m.round, m.match_number), m.id));

  // 5. Wire next_match_id / next_loser_match_id
  await Promise.all(seeds.map(s => {
    const id = matchMap.get(matchKey(s.side, s.round, s.matchNumber));
    if (!id) return Promise.resolve();
    const update: Record<string, unknown> = {};
    if (s.nextMatchNum !== null && s.nextSide !== null && s.nextRound !== null) {
      update.next_match_id   = matchMap.get(matchKey(s.nextSide, s.nextRound, s.nextMatchNum)) ?? null;
      update.next_match_slot = s.nextMatchSlot;
    }
    if (s.loserNextMatchNum !== null && s.loserNextSide !== null && s.loserNextRound !== null) {
      update.next_loser_match_id = matchMap.get(matchKey(s.loserNextSide, s.loserNextRound, s.loserNextMatchNum)) ?? null;
      update.next_loser_slot     = s.loserNextSlot;
    }
    if (Object.keys(update).length === 0) return Promise.resolve();
    return supabaseAdmin.from("bracket_matches").update(update).eq("id", id);
  }));

  // 6. Auto-advance BYE winners
  await Promise.all(seeds.filter(s => s.isBye && s.nextMatchNum !== null).map(async s => {
    const p1Id = s.p1Seed ? (seedToId.get(s.p1Seed) ?? null) : null;
    if (!p1Id || !s.nextSide || !s.nextRound || !s.nextMatchNum) return;
    const byeMatchId  = matchMap.get(matchKey(s.side, s.round, s.matchNumber))!;
    const nextMatchId = matchMap.get(matchKey(s.nextSide, s.nextRound, s.nextMatchNum));
    if (!nextMatchId) return;
    const slotUpdate = s.nextMatchSlot === 1
      ? { p1_id: p1Id, p1_source: "winner_of" as const, p1_source_match_id: byeMatchId }
      : { p2_id: p1Id, p2_source: "winner_of" as const, p2_source_match_id: byeMatchId };
    await supabaseAdmin.from("bracket_matches").update(slotUpdate).eq("id", nextMatchId);
    const { data: nm } = await supabaseAdmin
      .from("bracket_matches").select("p1_id, p2_id").eq("id", nextMatchId).single();
    if (nm?.p1_id && nm?.p2_id) {
      await supabaseAdmin.from("bracket_matches").update({ state: "ready" }).eq("id", nextMatchId);
    }
  }));

  // 6b. DE bye-cascading: for each WB BYE match, mark the corresponding LB
  // slot as `p_source='bye'` (a phantom). Then if any LB match ends up with
  // BOTH slots marked phantom, the LB match is fully dead — mark it
  // `state='bye'` and cascade the phantom forward to its `next_match` slot.
  // Without this, non-pow2 DE brackets (e.g. N=3, N=5) end up with LB
  // matches stuck pending because the WB BYE side never sends a loser.
  // Runtime cascading-on-result lives in PATCH `result` below.
  if (format === "double_elimination") {
    // Mark LB R1 slots whose WB R1 feeder is a BYE
    const byeWbR1 = seeds.filter(s =>
      s.side === "winners" && s.round === 1 && s.isBye &&
      s.loserNextSide && s.loserNextRound && s.loserNextMatchNum && s.loserNextSlot,
    );
    for (const bye of byeWbR1) {
      const lbId = matchMap.get(matchKey(bye.loserNextSide!, bye.loserNextRound!, bye.loserNextMatchNum!));
      if (!lbId) continue;
      const update = bye.loserNextSlot === 1
        ? { p1_source: "bye" as const }
        : { p2_source: "bye" as const };
      await supabaseAdmin.from("bracket_matches").update(update).eq("id", lbId);
    }

    // Cascade fully-phantom LB matches forward, round by round.
    for (let r = 1; r <= lRounds; r++) {
      const { data: lbRoundMatches } = await supabaseAdmin
        .from("bracket_matches")
        .select("id, p1_source, p2_source, next_match_id, next_match_slot")
        .eq("bracket_id", bracket.id)
        .eq("bracket_side", "losers")
        .eq("round", r);
      if (!lbRoundMatches) continue;

      for (const lb of lbRoundMatches) {
        if (lb.p1_source === "bye" && lb.p2_source === "bye") {
          // Fully phantom — no participant will ever arrive. Mark state=bye
          // and propagate the phantom to the next match's slot.
          await supabaseAdmin
            .from("bracket_matches")
            .update({ state: "bye" })
            .eq("id", lb.id);
          if (lb.next_match_id && lb.next_match_slot) {
            const update = lb.next_match_slot === 1
              ? { p1_source: "bye" as const }
              : { p2_source: "bye" as const };
            await supabaseAdmin
              .from("bracket_matches")
              .update(update)
              .eq("id", lb.next_match_id);
          }
        }
      }
    }
  }

  revalidatePath("/torneos");
  revalidatePath("/torneos/[slug]", "page");

  return NextResponse.json({ bracket, participants, matchCount: insertedMatches.length });
}

// PATCH /api/admin/brackets — action-based:
//   { action: "start",  tournamentId }      draft -> in_progress (locks the structure)
//   { action: "result", matchId, winnerId } record a winner and advance them
//   { action: "undo",   matchId }           revert a result (only if no played match downstream)
export async function PATCH(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const action = body.action as "start" | "result" | "undo" | undefined;

  // ── START ──────────────────────────────────────────────────────────────
  if (action === "start") {
    const tournamentId = body.tournamentId as number;
    if (!tournamentId) return NextResponse.json({ error: "tournamentId requerido" }, { status: 400 });

    const { data: bracket } = await supabaseAdmin
      .from("brackets").select("id, status").eq("tournament_id", tournamentId).maybeSingle();
    if (!bracket) return NextResponse.json({ error: "No existe bracket" }, { status: 404 });
    // `published` is a vestigial enum value the current code never writes but
    // some legacy brackets still sit in. Treat it as equivalent to `draft` so
    // a bracket created by an older code path can still be started.
    if (bracket.status !== "draft" && bracket.status !== "published")
      return NextResponse.json({ error: "El torneo ya fue iniciado" }, { status: 400 });

    await supabaseAdmin
      .from("brackets")
      .update({ status: "in_progress", updated_at: new Date().toISOString() })
      .eq("id", bracket.id);

    // Starting the bracket puts the tournament live, closes registration,
    // AND makes it publicly visible. The `is_active` flag is the "Visible"
    // toggle on the admin edit form — admins typically keep it off while
    // configuring (private setup) and forget to flip it back on once the
    // tournament is ready. If they explicitly clicked "Iniciar Torneo",
    // we treat that as a clear signal to publish: status=live + is_active=true
    // is the only coherent state for a tournament that's about to start
    // accepting check-ins and broadcasting on the TV view.
    await supabaseAdmin
      .from("tournaments")
      .update({ status: "live", is_registration_open: false, is_active: true })
      .eq("id", tournamentId)
      .neq("status", "completed");

    revalidatePath("/torneos");
    revalidatePath("/torneos/[slug]", "page");
    revalidatePath("/admin/torneos");
    return NextResponse.json({ ok: true });
  }

  // ── RESULT (pick winner) ───────────────────────────────────────────────
  if (action === "result") {
    const { matchId, winnerId } = body as { matchId: number; winnerId: number };
    if (matchId == null || winnerId == null)
      return NextResponse.json({ error: "matchId y winnerId son requeridos" }, { status: 400 });

    const { data: match } = await supabaseAdmin
      .from("bracket_matches").select("*").eq("id", matchId).single();
    if (!match) return NextResponse.json({ error: "Match no encontrado" }, { status: 404 });

    const { data: bracket } = await supabaseAdmin
      .from("brackets").select("status, tournament_id").eq("id", match.bracket_id).single();
    if (bracket?.status !== "in_progress")
      return NextResponse.json({ error: "El torneo no está en curso" }, { status: 400 });
    if (match.state === "completed" || match.state === "bye")
      return NextResponse.json({ error: "Este match ya está cerrado" }, { status: 400 });
    if (!match.p1_id || !match.p2_id)
      return NextResponse.json({ error: "El match aún no tiene ambos participantes" }, { status: 400 });
    if (winnerId !== match.p1_id && winnerId !== match.p2_id)
      return NextResponse.json({ error: "El ganador debe ser uno de los participantes" }, { status: 400 });

    const loserId = winnerId === match.p1_id ? match.p2_id : match.p1_id;

    await supabaseAdmin.from("bracket_matches").update({
      winner_id: winnerId, loser_id: loserId, state: "completed",
      updated_at: new Date().toISOString(),
    }).eq("id", matchId);

    // Advance winner
    if (match.next_match_id && match.next_match_slot) {
      const upd = match.next_match_slot === 1
        ? { p1_id: winnerId, p1_source: "winner_of" as const, p1_source_match_id: matchId }
        : { p2_id: winnerId, p2_source: "winner_of" as const, p2_source_match_id: matchId };
      await supabaseAdmin.from("bracket_matches").update(upd).eq("id", match.next_match_id);
      const { data: nm } = await supabaseAdmin
        .from("bracket_matches").select("p1_id, p2_id, state").eq("id", match.next_match_id).single();
      if (nm?.p1_id && nm?.p2_id && nm.state !== "completed")
        await supabaseAdmin.from("bracket_matches").update({ state: "ready" }).eq("id", match.next_match_id);
    }

    // Advance loser (double elimination). If the destination LB slot's
    // *other* side is `p_source='bye'` (a phantom from an upstream WB BYE),
    // the LB match has effectively a single participant — auto-advance them
    // through the cascade.
    if (match.next_loser_match_id && match.next_loser_slot) {
      const upd = match.next_loser_slot === 1
        ? { p1_id: loserId, p1_source: "loser_of" as const, p1_source_match_id: matchId }
        : { p2_id: loserId, p2_source: "loser_of" as const, p2_source_match_id: matchId };
      await supabaseAdmin.from("bracket_matches").update(upd).eq("id", match.next_loser_match_id);
      await cascadeLbAdvance(match.next_loser_match_id, loserId, match.next_loser_slot as 1 | 2);
    }

    // Eliminated when knocked out of losers / grand final
    if (match.bracket_side === "losers" || match.bracket_side === "grand_final")
      await supabaseAdmin.from("bracket_participants").update({ eliminated: true }).eq("id", loserId);

    const { data: allMatches } = await supabaseAdmin
      .from("bracket_matches").select("state").eq("bracket_id", match.bracket_id).neq("state", "bye");
    const allDone = allMatches?.every(m => m.state === "completed") ?? false;
    await supabaseAdmin
      .from("brackets")
      .update({ status: allDone ? "completed" : "in_progress", updated_at: new Date().toISOString() })
      .eq("id", match.bracket_id);

    // Tournament lifecycle is driven by the bracket — when the bracket completes,
    // the tournament does too. The status is a derived value, not editor-controlled.
    let podiumWritten = 0;
    if (allDone && bracket.tournament_id) {
      await supabaseAdmin
        .from("tournaments")
        .update({ status: "completed" })
        .eq("id", bracket.tournament_id);

      // Auto-derive the podium from the completed bracket. Manual overrides
      // are preserved — `ignoreDuplicates: true` on the unique
      // `(tournament_id, position)` index means a position the admin already
      // set via `POST /api/admin/tournament-results` is never overwritten.
      // Admins can still re-derive any row manually if the auto-pick is wrong.
      const { data: bracketMatches } = await supabaseAdmin
        .from("bracket_matches")
        .select("id, bracket_side, round, winner_id, loser_id, next_match_id, state")
        .eq("bracket_id", match.bracket_id);
      const { data: bracketParticipants } = await supabaseAdmin
        .from("bracket_participants")
        .select("id, user_profile_id")
        .eq("bracket_id", match.bracket_id);
      const { data: bracketMeta } = await supabaseAdmin
        .from("brackets").select("format").eq("id", match.bracket_id).single();

      if (bracketMatches && bracketParticipants && bracketMeta?.format) {
        const claims = await verifyToken(req.headers.get("authorization"));
        const adminEmail = claims ? await resolveUserEmail(claims.userId) : null;

        const podium = derivePodium(
          bracketMeta.format as "single_elimination" | "double_elimination",
          bracketMatches,
          bracketParticipants,
        );

        // Pre-fetch the positions that already exist — manual overrides set
        // via /api/admin/tournament-results before the bracket finished must
        // be preserved. We only INSERT for missing positions, never overwrite.
        const { data: existingResults } = await supabaseAdmin
          .from("tournament_results")
          .select("position")
          .eq("tournament_id", bracket.tournament_id);
        const taken = new Set((existingResults ?? []).map(r => r.position));

        for (const entry of podium) {
          if (taken.has(entry.position)) continue;

          const { data: prize } = await supabaseAdmin
            .from("tournament_prizes")
            .select("id")
            .eq("tournament_id", bracket.tournament_id)
            .eq("position", entry.position)
            .maybeSingle();
          const prizeStatus: "pending" | "no_prize" = prize ? "pending" : "no_prize";

          const { error } = await supabaseAdmin
            .from("tournament_results")
            .insert({
              tournament_id:   bracket.tournament_id,
              user_profile_id: entry.userProfileId,
              position:        entry.position,
              points:          pointsFor(entry.position),
              awarded_by:      adminEmail ?? "system:auto-podium",
              prize_status:    prizeStatus,
            });

          if (!error) podiumWritten++;
          // A race (admin sets the row between our check + insert) returns
          // a unique-violation — swallowed; the admin's value wins, which is
          // exactly the manual-override-always contract.
        }

        revalidatePath("/team");
      }
    }

    revalidatePath("/torneos");
    revalidatePath("/torneos/[slug]", "page");
    revalidatePath("/admin/torneos");
    return NextResponse.json({ ok: true, winnerId, loserId, tournamentCompleted: allDone, podiumWritten });
  }

  // ── UNDO (safe revert) ─────────────────────────────────────────────────
  if (action === "undo") {
    const matchId = body.matchId as number;
    if (matchId == null) return NextResponse.json({ error: "matchId requerido" }, { status: 400 });

    const { data: match } = await supabaseAdmin
      .from("bracket_matches").select("*").eq("id", matchId).single();
    if (!match) return NextResponse.json({ error: "Match no encontrado" }, { status: 404 });
    if (match.state !== "completed")
      return NextResponse.json({ error: "Solo se puede deshacer un match finalizado" }, { status: 400 });

    // Refuse if a downstream match was already played
    for (const nextId of [match.next_match_id, match.next_loser_match_id]) {
      if (!nextId) continue;
      const { data: nx } = await supabaseAdmin
        .from("bracket_matches").select("state").eq("id", nextId).single();
      if (nx?.state === "completed")
        return NextResponse.json(
          { error: "No se puede deshacer: un match posterior ya fue jugado." },
          { status: 409 },
        );
    }

    const advancedWinner = match.winner_id;
    const advancedLoser  = match.loser_id;

    // Clear the slot this match fed in each downstream match
    async function clearSlot(nextId: number | null, slot: number | null) {
      if (!nextId || !slot) return;
      const upd = slot === 1
        ? { p1_id: null, p1_source: null, p1_source_match_id: null, state: "pending" as const }
        : { p2_id: null, p2_source: null, p2_source_match_id: null, state: "pending" as const };
      await supabaseAdmin.from("bracket_matches").update(upd).eq("id", nextId);
    }
    await clearSlot(match.next_match_id, match.next_match_slot);
    await clearSlot(match.next_loser_match_id, match.next_loser_slot);

    // Reset this match
    await supabaseAdmin.from("bracket_matches").update({
      winner_id: null, loser_id: null, p1_score: null, p2_score: null,
      state: "ready", updated_at: new Date().toISOString(),
    }).eq("id", matchId);

    // Un-eliminate whoever this match had eliminated
    if ((match.bracket_side === "losers" || match.bracket_side === "grand_final") && advancedLoser)
      await supabaseAdmin.from("bracket_participants").update({ eliminated: false }).eq("id", advancedLoser);
    void advancedWinner;

    await supabaseAdmin
      .from("brackets")
      .update({ status: "in_progress", updated_at: new Date().toISOString() })
      .eq("id", match.bracket_id);

    // If the undo was on the final-final match, the tournament had already been
    // auto-completed — revert it to `live` so the lifecycle stays in sync with
    // the bracket. Safe no-op for any other undo because of the .eq guard.
    const { data: br } = await supabaseAdmin
      .from("brackets").select("tournament_id").eq("id", match.bracket_id).single();
    if (br?.tournament_id) {
      await supabaseAdmin
        .from("tournaments")
        .update({ status: "live" })
        .eq("id", br.tournament_id)
        .eq("status", "completed");

      // When we revert the tournament out of `completed`, drop the rows that
      // auto-podium derivation wrote so a future re-completion can re-derive
      // accurately. Manual overrides (rows where `awarded_by !=
      // 'system:auto-podium'`) are kept — the admin's intent persists.
      await supabaseAdmin
        .from("tournament_results")
        .delete()
        .eq("tournament_id", br.tournament_id)
        .eq("awarded_by", "system:auto-podium");
    }

    revalidatePath("/torneos");
    revalidatePath("/torneos/[slug]", "page");
    revalidatePath("/admin/torneos");
    return NextResponse.json({ ok: true });
  }

  // ── SWAP SLOTS (manual override of draft pairings) ────────────────────
  // Lets the admin re-arrange specific matchups before starting. Useful when
  // the random seeding produced a pair the admin wants to swap manually
  // (e.g. a player just dropped out, or two friends ended up in R1).
  //
  // Body: { matchId1, slot1, matchId2, slot2 }  (slots are 1 or 2)
  //
  // Constraints:
  //   • bracket must be `draft` (no re-arranging a running tournament)
  //   • both source slots must contain real participants (no BYE / phantom)
  //   • both matches must be in the same bracket
  // The swap is purely a participant-id swap — `p_source` stays as it was
  // (typically 'seed' for R1 matches), `winner_id` is null on draft matches
  // anyway, and `bracket_participants.seed` is left alone (it reflects the
  // original ranking; the swap is a manual override on top).
  if (action === "swap_slots") {
    const { matchId1, slot1, matchId2, slot2 } = body as {
      matchId1: number; slot1: 1 | 2; matchId2: number; slot2: 1 | 2;
    };
    if (matchId1 == null || matchId2 == null || ![1, 2].includes(slot1) || ![1, 2].includes(slot2))
      return NextResponse.json({ error: "matchId1, slot1, matchId2, slot2 son requeridos" }, { status: 400 });

    if (matchId1 === matchId2 && slot1 === slot2)
      return NextResponse.json({ error: "Ambos slots son el mismo — nada que intercambiar" }, { status: 400 });

    const { data: matches } = await supabaseAdmin
      .from("bracket_matches")
      .select("*")
      .in("id", [matchId1, matchId2]);
    if (!matches || matches.length !== 2)
      return NextResponse.json({ error: "Match(es) no encontrado(s)" }, { status: 404 });

    const m1 = matches.find(m => m.id === matchId1)!;
    const m2 = matches.find(m => m.id === matchId2)!;
    if (m1.bracket_id !== m2.bracket_id)
      return NextResponse.json({ error: "Los matches deben pertenecer al mismo bracket" }, { status: 400 });

    const { data: bracketRow } = await supabaseAdmin
      .from("brackets").select("status").eq("id", m1.bracket_id).single();
    if (bracketRow?.status !== "draft")
      return NextResponse.json(
        { error: "Solo se pueden intercambiar participantes mientras el bracket es borrador." },
        { status: 400 },
      );

    const idA = slot1 === 1 ? m1.p1_id : m1.p2_id;
    const idB = slot2 === 1 ? m2.p1_id : m2.p2_id;
    if (idA == null || idB == null)
      return NextResponse.json(
        { error: "Ambos slots deben tener un participante real. Los BYE no se pueden intercambiar." },
        { status: 400 },
      );

    // Atomic swap — apply both updates regardless of order
    const updateA = slot1 === 1 ? { p1_id: idB } : { p2_id: idB };
    const updateB = slot2 === 1 ? { p1_id: idA } : { p2_id: idA };

    if (matchId1 === matchId2) {
      // Same match — combine into one update so we don't read the in-between state
      const combined = { ...updateA, ...updateB };
      await supabaseAdmin.from("bracket_matches").update(combined).eq("id", matchId1);
    } else {
      await Promise.all([
        supabaseAdmin.from("bracket_matches").update(updateA).eq("id", matchId1),
        supabaseAdmin.from("bracket_matches").update(updateB).eq("id", matchId2),
      ]);
    }

    revalidatePath("/admin/torneos");
    revalidatePath("/torneos/[slug]", "page");
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}

// DELETE /api/admin/brackets — remove the entire bracket.
// Only a DRAFT bracket can be deleted. Once the tournament has started
// (in_progress / completed) the structure is locked — no re-seeding,
// no editing participants. This matches the documented flow:
// "after the tournament start it is not possible to edit or add people."
export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tournamentId } = await req.json();
  if (!tournamentId) return NextResponse.json({ error: "tournamentId requerido" }, { status: 400 });

  const { data: bracket } = await supabaseAdmin
    .from("brackets").select("id, status").eq("tournament_id", tournamentId).maybeSingle();
  if (!bracket) return NextResponse.json({ error: "No existe bracket para este torneo" }, { status: 404 });

  // Same logic as the `start` guard above — `published` is treated as `draft`
  // for deletion so a stuck-legacy bracket isn't orphaned forever.
  if (bracket.status !== "draft" && bracket.status !== "published") {
    return NextResponse.json(
      { error: "No se puede eliminar un bracket que ya inició. Una vez iniciado el torneo, los enfrentamientos quedan bloqueados." },
      { status: 409 },
    );
  }

  await supabaseAdmin.from("brackets").delete().eq("id", bracket.id);

  revalidatePath("/torneos");
  revalidatePath("/torneos/[slug]", "page");
  return NextResponse.json({ ok: true });
}
