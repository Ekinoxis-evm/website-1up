import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { seedBracket } from "@/lib/bracket/seed";
import { nextPow2 } from "@/lib/bracket/byes";

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

// POST /api/admin/brackets — seed a new bracket from tournament registrations
export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { tournamentId, format } = body as {
    tournamentId: number;
    format: "single_elimination" | "double_elimination";
  };

  if (!tournamentId || !format)
    return NextResponse.json({ error: "tournamentId y format son requeridos" }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from("brackets")
    .select("id")
    .eq("tournament_id", tournamentId)
    .maybeSingle();

  if (existing) return NextResponse.json({ error: "Ya existe un bracket para este torneo" }, { status: 409 });

  // Fetch registered / attended participants
  const { data: registrations, error: regError } = await supabaseAdmin
    .from("tournament_registrations")
    .select("user_profile_id, user_profiles(id, nombre, apellidos, username)")
    .eq("tournament_id", tournamentId)
    .in("status", ["registered", "attended"]);

  if (regError) return NextResponse.json({ error: regError.message }, { status: 500 });
  if (!registrations || registrations.length < 2)
    return NextResponse.json({ error: "Se necesitan al menos 2 participantes registrados" }, { status: 400 });

  const n = registrations.length;
  const size = nextPow2(n);
  const wRounds = Math.log2(size);
  const lRounds = format === "double_elimination" ? 2 * (wRounds - 1) : 0;

  // Generate match seeds
  const seeds = seedBracket(n, format);

  // 1. Insert bracket row
  const { data: bracket, error: bracketError } = await supabaseAdmin
    .from("brackets")
    .insert({
      tournament_id:     tournamentId,
      format,
      status:            "published",
      participant_count: n,
      rounds_winners:    wRounds,
      rounds_losers:     lRounds,
    })
    .select()
    .single();

  if (bracketError || !bracket)
    return NextResponse.json({ error: bracketError?.message ?? "Error al crear bracket" }, { status: 500 });

  // 2. Insert participants (seeded by registration order)
  const participantInserts = registrations.map((reg, idx) => {
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

  // Map seed number → participant DB id
  const seedToId = new Map<number, number>();
  participants.forEach(p => seedToId.set(p.seed, p.id));

  // 3. Insert all matches without pointer fields
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

  // 4. Build lookup: "side-round-matchNum" → DB id
  const matchKey = (side: string, round: number, num: number) => `${side}-${round}-${num}`;
  const matchMap = new Map<string, number>();
  insertedMatches.forEach(m => matchMap.set(matchKey(m.bracket_side, m.round, m.match_number), m.id));

  // 5. Batch-update next_match_id / next_loser_match_id pointers
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

  // 6. Auto-advance BYE match winners into the next match slot
  await Promise.all(seeds.filter(s => s.isBye && s.nextMatchNum !== null).map(async s => {
    const p1Id = s.p1Seed ? (seedToId.get(s.p1Seed) ?? null) : null;
    if (!p1Id || !s.nextSide || !s.nextRound || !s.nextMatchNum) return;

    const byeMatchId    = matchMap.get(matchKey(s.side, s.round, s.matchNumber))!;
    const nextMatchId   = matchMap.get(matchKey(s.nextSide, s.nextRound, s.nextMatchNum));
    if (!nextMatchId) return;

    const slotUpdate = s.nextMatchSlot === 1
      ? { p1_id: p1Id, p1_source: "winner_of" as const, p1_source_match_id: byeMatchId }
      : { p2_id: p1Id, p2_source: "winner_of" as const, p2_source_match_id: byeMatchId };

    await supabaseAdmin.from("bracket_matches").update(slotUpdate).eq("id", nextMatchId);

    // Mark as ready if both slots now filled
    const { data: nm } = await supabaseAdmin
      .from("bracket_matches")
      .select("p1_id, p2_id")
      .eq("id", nextMatchId)
      .single();
    if (nm?.p1_id && nm?.p2_id) {
      await supabaseAdmin.from("bracket_matches").update({ state: "ready" }).eq("id", nextMatchId);
    }
  }));

  revalidatePath("/torneos");
  revalidatePath("/admin/tournament-brackets");

  return NextResponse.json({ bracket, participants, matchCount: insertedMatches.length });
}

// PATCH /api/admin/brackets — record match result and advance players
export async function PATCH(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { matchId, p1Score, p2Score } = body as {
    matchId: number;
    p1Score: number;
    p2Score: number;
  };

  if (matchId == null || p1Score == null || p2Score == null)
    return NextResponse.json({ error: "matchId, p1Score y p2Score son requeridos" }, { status: 400 });

  const { data: match, error: matchFetchError } = await supabaseAdmin
    .from("bracket_matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (matchFetchError || !match)
    return NextResponse.json({ error: "Match no encontrado" }, { status: 404 });
  if (match.state === "completed" || match.state === "bye")
    return NextResponse.json({ error: "Match ya finalizado" }, { status: 400 });
  if (!match.p1_id || !match.p2_id)
    return NextResponse.json({ error: "Match no tiene ambos participantes" }, { status: 400 });

  const winnerId = p1Score >= p2Score ? match.p1_id : match.p2_id;
  const loserId  = p1Score >= p2Score ? match.p2_id : match.p1_id;

  // Update the match itself
  await supabaseAdmin.from("bracket_matches").update({
    p1_score:   p1Score,
    p2_score:   p2Score,
    winner_id:  winnerId,
    loser_id:   loserId,
    state:      "completed",
    updated_at: new Date().toISOString(),
  }).eq("id", matchId);

  // Advance winner to next match
  if (match.next_match_id && match.next_match_slot) {
    const winnerUpdate = match.next_match_slot === 1
      ? { p1_id: winnerId, p1_source: "winner_of" as const, p1_source_match_id: matchId }
      : { p2_id: winnerId, p2_source: "winner_of" as const, p2_source_match_id: matchId };

    await supabaseAdmin.from("bracket_matches").update(winnerUpdate).eq("id", match.next_match_id);

    const { data: nm } = await supabaseAdmin
      .from("bracket_matches")
      .select("p1_id, p2_id, state")
      .eq("id", match.next_match_id)
      .single();
    if (nm?.p1_id && nm?.p2_id && nm.state !== "completed") {
      await supabaseAdmin.from("bracket_matches").update({ state: "ready" }).eq("id", match.next_match_id);
    }
  }

  // Advance loser to losers bracket (double elimination — winners bracket matches only)
  if (match.next_loser_match_id && match.next_loser_slot) {
    const loserUpdate = match.next_loser_slot === 1
      ? { p1_id: loserId, p1_source: "loser_of" as const, p1_source_match_id: matchId }
      : { p2_id: loserId, p2_source: "loser_of" as const, p2_source_match_id: matchId };

    await supabaseAdmin.from("bracket_matches").update(loserUpdate).eq("id", match.next_loser_match_id);

    const { data: lm } = await supabaseAdmin
      .from("bracket_matches")
      .select("p1_id, p2_id, state")
      .eq("id", match.next_loser_match_id)
      .single();
    if (lm?.p1_id && lm?.p2_id && lm.state !== "completed") {
      await supabaseAdmin.from("bracket_matches").update({ state: "ready" }).eq("id", match.next_loser_match_id);
    }
  }

  // Mark loser as eliminated (only when eliminated from losers or grand final)
  if (match.bracket_side === "losers" || match.bracket_side === "grand_final") {
    await supabaseAdmin
      .from("bracket_participants")
      .update({ eliminated: true })
      .eq("id", loserId);
  }

  // Update bracket status
  const { data: allMatches } = await supabaseAdmin
    .from("bracket_matches")
    .select("state")
    .eq("bracket_id", match.bracket_id)
    .not("state", "eq", "bye");

  const allDone = allMatches?.every(m => m.state === "completed") ?? false;
  await supabaseAdmin
    .from("brackets")
    .update({ status: allDone ? "completed" : "in_progress", updated_at: new Date().toISOString() })
    .eq("id", match.bracket_id);

  revalidatePath("/torneos");
  revalidatePath("/admin/tournament-brackets");

  return NextResponse.json({ ok: true, winnerId, loserId });
}

// DELETE /api/admin/brackets — remove entire bracket (resets tournament bracket)
export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tournamentId } = await req.json();
  if (!tournamentId) return NextResponse.json({ error: "tournamentId requerido" }, { status: 400 });

  const { data: bracket } = await supabaseAdmin
    .from("brackets")
    .select("id")
    .eq("tournament_id", tournamentId)
    .maybeSingle();

  if (!bracket) return NextResponse.json({ error: "No existe bracket para este torneo" }, { status: 404 });

  // Cascade deletes bracket_matches and bracket_participants via FK ON DELETE CASCADE
  await supabaseAdmin.from("brackets").delete().eq("id", bracket.id);

  revalidatePath("/torneos");
  revalidatePath("/admin/tournament-brackets");

  return NextResponse.json({ ok: true });
}
