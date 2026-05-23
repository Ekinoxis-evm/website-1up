import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { seedBracket } from "@/lib/bracket/seed";
import { nextPow2 } from "@/lib/bracket/byes";
import { derivePodium } from "@/lib/bracket/podium";
import { pointsFor } from "@/lib/tournamentPoints";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
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
    supabaseAdmin
      .from("bracket_participants")
      .select("*")
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
  const size = nextPow2(n);
  const wRounds = Math.log2(size);
  const lRounds = format === "double_elimination" ? 2 * (wRounds - 1) : 0;

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

  revalidatePath("/torneos");
  revalidatePath("/torneos/[slug]", "page");
  revalidatePath("/admin/tournament-brackets");

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
    if (bracket.status !== "draft")
      return NextResponse.json({ error: "El torneo ya fue iniciado" }, { status: 400 });

    await supabaseAdmin
      .from("brackets")
      .update({ status: "in_progress", updated_at: new Date().toISOString() })
      .eq("id", bracket.id);

    // Starting the bracket puts the tournament live AND closes registration —
    // after this point no new entries are accepted and the structure is locked.
    await supabaseAdmin
      .from("tournaments")
      .update({ status: "live", is_registration_open: false })
      .eq("id", tournamentId)
      .neq("status", "completed");

    revalidatePath("/torneos");
    revalidatePath("/torneos/[slug]", "page");
    revalidatePath("/admin/tournament-brackets");
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

    // Advance loser (double elimination)
    if (match.next_loser_match_id && match.next_loser_slot) {
      const upd = match.next_loser_slot === 1
        ? { p1_id: loserId, p1_source: "loser_of" as const, p1_source_match_id: matchId }
        : { p2_id: loserId, p2_source: "loser_of" as const, p2_source_match_id: matchId };
      await supabaseAdmin.from("bracket_matches").update(upd).eq("id", match.next_loser_match_id);
      const { data: lm } = await supabaseAdmin
        .from("bracket_matches").select("p1_id, p2_id, state").eq("id", match.next_loser_match_id).single();
      if (lm?.p1_id && lm?.p2_id && lm.state !== "completed")
        await supabaseAdmin.from("bracket_matches").update({ state: "ready" }).eq("id", match.next_loser_match_id);
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
        revalidatePath("/admin/tournament-results");
      }
    }

    revalidatePath("/torneos");
    revalidatePath("/torneos/[slug]", "page");
    revalidatePath("/admin/tournament-brackets");
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
    revalidatePath("/admin/tournament-brackets");
    revalidatePath("/admin/torneos");
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

  if (bracket.status !== "draft") {
    return NextResponse.json(
      { error: "No se puede eliminar un bracket que ya inició. Una vez iniciado el torneo, los enfrentamientos quedan bloqueados." },
      { status: 409 },
    );
  }

  await supabaseAdmin.from("brackets").delete().eq("id", bracket.id);

  revalidatePath("/torneos");
  revalidatePath("/torneos/[slug]", "page");
  revalidatePath("/admin/tournament-brackets");
  return NextResponse.json({ ok: true });
}
