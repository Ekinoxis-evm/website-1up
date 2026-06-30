import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { generateRoundRobin, roundRobinRounds } from "@/lib/league/schedule";
import {
  computeStandings,
  isLeagueComplete,
  deriveLeaguePodium,
  type LeagueMatchInput,
  type LeagueConfig,
} from "@/lib/league/standings";
import { validateLeagueScores, deriveMatchOutcome } from "@/lib/league/result";
import { pointsFor } from "@/lib/tournamentPoints";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

// Map a league_matches row into the engine's input shape.
type LeagueMatchRow = {
  id: number; round: number; match_number: number;
  p1_id: number | null; p2_id: number | null;
  p1_score: number | null; p2_score: number | null;
  winner_id: number | null; is_draw: boolean; state: string;
};
function toEngineInput(m: LeagueMatchRow): LeagueMatchInput {
  return {
    p1Id: m.p1_id, p2Id: m.p2_id, p1Score: m.p1_score, p2Score: m.p2_score,
    winnerId: m.winner_id, isDraw: m.is_draw, state: m.state,
  };
}

// GET /api/admin/leagues?tournamentId=xxx
export async function GET(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tournamentId = searchParams.get("tournamentId");
  if (!tournamentId) return NextResponse.json({ error: "tournamentId requerido" }, { status: 400 });

  const { data: league } = await supabaseAdmin
    .from("leagues")
    .select("*")
    .eq("tournament_id", parseInt(tournamentId))
    .maybeSingle();

  if (!league) return NextResponse.json(null);

  const [{ data: participants }, { data: matches }] = await Promise.all([
    supabaseAdmin
      .from("league_participants")
      .select("*, user_profiles(avatar_url, username, nombre, apellidos)")
      .eq("league_id", league.id)
      .order("seed"),
    supabaseAdmin
      .from("league_matches")
      .select("*")
      .eq("league_id", league.id)
      .order("round")
      .order("match_number"),
  ]);

  // Derived standings — never stored. Computed from the league's points config.
  const cfg: LeagueConfig = {
    pointsWin: league.points_win, pointsDraw: league.points_draw, pointsLoss: league.points_loss,
    tiebreakerOrder: league.tiebreaker_order,
  };
  const standings = computeStandings(
    (participants ?? []).map(p => p.id),
    (matches ?? []).map(toEngineInput),
    cfg,
  );

  return NextResponse.json({
    league,
    participants: participants ?? [],
    matches: matches ?? [],
    standings,
  });
}

// POST /api/admin/leagues — seed a new DRAFT league (round-robin calendar).
// Body: { tournamentId, participantIds? }  participantIds index defines the seed.
export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { tournamentId, participantIds } = body as { tournamentId: number; participantIds?: number[] };
  if (!tournamentId) return NextResponse.json({ error: "tournamentId requerido" }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from("leagues").select("id").eq("tournament_id", tournamentId).maybeSingle();
  if (existing) return NextResponse.json({ error: "Ya existe una liga para este torneo" }, { status: 409 });

  const { data: registrations, error: regError } = await supabaseAdmin
    .from("tournament_registrations")
    .select("user_profile_id, user_profiles(id, nombre, apellidos, username)")
    .eq("tournament_id", tournamentId)
    .in("status", ["registered", "attended"]);

  if (regError) return NextResponse.json({ error: regError.message }, { status: 500 });
  if (!registrations || registrations.length < 2)
    return NextResponse.json({ error: "Se necesitan al menos 2 participantes registrados" }, { status: 400 });

  const regByProfile = new Map(registrations.map(r => [r.user_profile_id, r]));
  const ordered = (participantIds && participantIds.length > 0)
    ? participantIds.map(id => regByProfile.get(id)).filter((r): r is NonNullable<typeof r> => !!r)
    : registrations;
  if (ordered.length < 2)
    return NextResponse.json({ error: "Selecciona al menos 2 participantes registrados" }, { status: 400 });

  const n = ordered.length;

  // 1. League row — DRAFT
  const { data: league, error: leagueError } = await supabaseAdmin
    .from("leagues")
    .insert({
      tournament_id:     tournamentId,
      status:            "draft",
      participant_count: n,
      rounds:            roundRobinRounds(n),
    })
    .select()
    .single();
  if (leagueError || !league)
    return NextResponse.json({ error: leagueError?.message ?? "Error al crear liga" }, { status: 500 });

  // 2. Participants — seeded by resolved order
  const participantInserts = ordered.map((reg, idx) => {
    const profile = reg.user_profiles as { nombre: string | null; apellidos: string | null; username: string | null } | null;
    const fullName = `${profile?.nombre ?? ""} ${profile?.apellidos ?? ""}`.trim();
    const displayName = profile?.username ?? (fullName || `Participante ${idx + 1}`);
    return {
      league_id:       league.id,
      seed:            idx + 1,
      display_name:    displayName,
      user_profile_id: reg.user_profile_id,
    };
  });
  const { data: participants, error: partError } = await supabaseAdmin
    .from("league_participants").insert(participantInserts).select();
  if (partError || !participants)
    return NextResponse.json({ error: partError?.message ?? "Error al crear participantes" }, { status: 500 });

  const seedToId = new Map<number, number>();
  participants.forEach(p => seedToId.set(p.seed, p.id));

  // 3. Round-robin calendar. Every match has both participants from the start,
  // so each is `ready` to play immediately.
  const fixtures = generateRoundRobin(n);
  const matchInserts = fixtures.map(f => ({
    league_id:    league.id,
    round:        f.round,
    match_number: f.matchNumber,
    p1_id:        seedToId.get(f.p1Seed) ?? null,
    p2_id:        seedToId.get(f.p2Seed) ?? null,
    state:        "ready" as const,
  }));
  const { error: matchError } = await supabaseAdmin.from("league_matches").insert(matchInserts);
  if (matchError) return NextResponse.json({ error: matchError.message }, { status: 500 });

  revalidatePath("/torneos");
  revalidatePath("/torneos/[slug]", "page");
  revalidatePath("/admin/torneos");
  return NextResponse.json({ league, participants, matchCount: matchInserts.length });
}

// PATCH /api/admin/leagues — action-based:
//   { action: "start",  tournamentId }                 draft -> in_progress
//   { action: "result", matchId, p1Score, p2Score }    record a scoreline
//   { action: "undo",   matchId }                       revert a result
export async function PATCH(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const action = body.action as "start" | "result" | "undo" | undefined;

  // ── START ──────────────────────────────────────────────────────────────
  if (action === "start") {
    const tournamentId = body.tournamentId as number;
    if (!tournamentId) return NextResponse.json({ error: "tournamentId requerido" }, { status: 400 });

    const { data: league } = await supabaseAdmin
      .from("leagues").select("id, status").eq("tournament_id", tournamentId).maybeSingle();
    if (!league) return NextResponse.json({ error: "No existe liga" }, { status: 404 });
    if (league.status !== "draft")
      return NextResponse.json({ error: "El torneo ya fue iniciado" }, { status: 400 });

    await supabaseAdmin
      .from("leagues")
      .update({ status: "in_progress", updated_at: new Date().toISOString() })
      .eq("id", league.id);

    // Same publish semantics as the bracket start: live + closed registration + visible.
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

  // ── RESULT (record scoreline) ──────────────────────────────────────────
  if (action === "result") {
    const matchId = body.matchId as number;
    if (matchId == null) return NextResponse.json({ error: "matchId requerido" }, { status: 400 });

    const scores = validateLeagueScores(body.p1Score, body.p2Score);
    if (!scores.ok) return NextResponse.json({ error: scores.error }, { status: 400 });

    const { data: match } = await supabaseAdmin
      .from("league_matches").select("*").eq("id", matchId).single();
    if (!match) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

    const { data: league } = await supabaseAdmin
      .from("leagues").select("id, status, tournament_id, points_win, points_draw, points_loss, tiebreaker_order")
      .eq("id", match.league_id).single();
    if (league?.status !== "in_progress")
      return NextResponse.json({ error: "El torneo no está en curso" }, { status: 400 });
    if (!match.p1_id || !match.p2_id)
      return NextResponse.json({ error: "El partido no tiene ambos participantes" }, { status: 400 });

    const outcome = deriveMatchOutcome(match.p1_id, match.p2_id, scores.p1Score, scores.p2Score);

    await supabaseAdmin.from("league_matches").update({
      p1_score: scores.p1Score, p2_score: scores.p2Score,
      winner_id: outcome.winnerId, is_draw: outcome.isDraw,
      state: "completed", updated_at: new Date().toISOString(),
    }).eq("id", matchId);

    // Completion check across all matches.
    const { data: allMatches } = await supabaseAdmin
      .from("league_matches").select("*").eq("league_id", match.league_id);
    const complete = isLeagueComplete((allMatches ?? []).map(toEngineInput));

    await supabaseAdmin
      .from("leagues")
      .update({ status: complete ? "completed" : "in_progress", updated_at: new Date().toISOString() })
      .eq("id", match.league_id);

    let podiumWritten = 0;
    if (complete && league.tournament_id) {
      await supabaseAdmin.from("tournaments").update({ status: "completed" }).eq("id", league.tournament_id);

      const cfg: LeagueConfig = {
        pointsWin: league.points_win, pointsDraw: league.points_draw, pointsLoss: league.points_loss,
        tiebreakerOrder: league.tiebreaker_order,
      };
      const { data: parts } = await supabaseAdmin
        .from("league_participants").select("id, user_profile_id").eq("league_id", match.league_id);
      const standings = computeStandings(
        (parts ?? []).map(p => p.id), (allMatches ?? []).map(toEngineInput), cfg,
      );
      const idToProfile = new Map((parts ?? []).map(p => [p.id, p.user_profile_id]));

      const claims = await verifyToken(req.headers.get("authorization"));
      const adminEmail = claims ? await resolveUserEmail(claims.userId) : null;

      // Auto-podium → tournament_results. Same manual-override contract as
      // brackets: only INSERT for positions not already set, never overwrite.
      const { data: existingResults } = await supabaseAdmin
        .from("tournament_results").select("position").eq("tournament_id", league.tournament_id);
      const taken = new Set((existingResults ?? []).map(r => r.position));

      for (const entry of deriveLeaguePodium(standings)) {
        if (taken.has(entry.position)) continue;
        const userProfileId = idToProfile.get(entry.participantId);
        if (userProfileId == null) continue;

        const { data: prize } = await supabaseAdmin
          .from("tournament_prizes")
          .select("id").eq("tournament_id", league.tournament_id).eq("position", entry.position).maybeSingle();
        const prizeStatus: "pending" | "no_prize" = prize ? "pending" : "no_prize";

        const { error } = await supabaseAdmin.from("tournament_results").insert({
          tournament_id:   league.tournament_id,
          user_profile_id: userProfileId,
          position:        entry.position,
          points:          pointsFor(entry.position),
          awarded_by:      adminEmail ?? "system:auto-podium",
          prize_status:    prizeStatus,
        });
        if (!error) podiumWritten++;
      }
      revalidatePath("/team");
    }

    revalidatePath("/torneos");
    revalidatePath("/torneos/[slug]", "page");
    revalidatePath("/admin/torneos");
    return NextResponse.json({ ok: true, ...outcome, tournamentCompleted: complete, podiumWritten });
  }

  // ── UNDO ────────────────────────────────────────────────────────────────
  if (action === "undo") {
    const matchId = body.matchId as number;
    if (matchId == null) return NextResponse.json({ error: "matchId requerido" }, { status: 400 });

    const { data: match } = await supabaseAdmin
      .from("league_matches").select("*").eq("id", matchId).single();
    if (!match) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
    if (match.state !== "completed")
      return NextResponse.json({ error: "Solo se puede deshacer un partido finalizado" }, { status: 400 });

    await supabaseAdmin.from("league_matches").update({
      p1_score: null, p2_score: null, winner_id: null, is_draw: false,
      state: "ready", updated_at: new Date().toISOString(),
    }).eq("id", matchId);

    // League returns to in_progress; if the tournament had auto-completed, revert
    // it to live and drop the auto-derived podium rows (manual overrides kept).
    const { data: league } = await supabaseAdmin
      .from("leagues").select("id, tournament_id, status").eq("id", match.league_id).single();
    await supabaseAdmin
      .from("leagues").update({ status: "in_progress", updated_at: new Date().toISOString() })
      .eq("id", match.league_id);

    if (league?.tournament_id) {
      await supabaseAdmin
        .from("tournaments").update({ status: "live" })
        .eq("id", league.tournament_id).eq("status", "completed");
      await supabaseAdmin
        .from("tournament_results").delete()
        .eq("tournament_id", league.tournament_id).eq("awarded_by", "system:auto-podium");
    }

    revalidatePath("/torneos");
    revalidatePath("/torneos/[slug]", "page");
    revalidatePath("/admin/torneos");
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}

// DELETE /api/admin/leagues — remove the league. Only a DRAFT league can be
// deleted; once started the calendar is locked.
export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tournamentId } = await req.json();
  if (!tournamentId) return NextResponse.json({ error: "tournamentId requerido" }, { status: 400 });

  const { data: league } = await supabaseAdmin
    .from("leagues").select("id, status").eq("tournament_id", tournamentId).maybeSingle();
  if (!league) return NextResponse.json({ error: "No existe liga para este torneo" }, { status: 404 });
  if (league.status !== "draft")
    return NextResponse.json(
      { error: "No se puede eliminar una liga que ya inició. El calendario queda bloqueado." },
      { status: 409 },
    );

  await supabaseAdmin.from("leagues").delete().eq("id", league.id);

  revalidatePath("/torneos");
  revalidatePath("/torneos/[slug]", "page");
  return NextResponse.json({ ok: true });
}
