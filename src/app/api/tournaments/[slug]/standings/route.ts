import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { computeStandings, type LeagueMatchInput, type LeagueConfig } from "@/lib/league/standings";

// Public league standings — mirror of /api/tournaments/[slug]/bracket. Only
// in_progress/completed leagues are public; drafts stay hidden. Standings are
// computed on read from the league's points config.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let tournamentId: number | null = null;
  const { data: bySlug } = await supabase
    .from("tournaments").select("id").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (bySlug) {
    tournamentId = bySlug.id;
  } else {
    const numericId = Number(slug);
    if (Number.isFinite(numericId) && numericId > 0) {
      const { data: byId } = await supabase
        .from("tournaments").select("id").eq("id", numericId).eq("is_active", true).maybeSingle();
      tournamentId = byId?.id ?? null;
    }
  }
  if (!tournamentId) return NextResponse.json(null);

  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("tournament_id", tournamentId)
    .in("status", ["in_progress", "completed"])
    .maybeSingle();
  if (!league) return NextResponse.json(null);

  const [{ data: participants }, { data: matches }] = await Promise.all([
    supabase
      .from("league_participants")
      .select("*, user_profiles(avatar_url, username, nombre, apellidos)")
      .eq("league_id", league.id)
      .order("seed"),
    supabase
      .from("league_matches")
      .select("*")
      .eq("league_id", league.id)
      .order("round")
      .order("match_number"),
  ]);

  const cfg: LeagueConfig = {
    pointsWin: league.points_win, pointsDraw: league.points_draw, pointsLoss: league.points_loss,
    tiebreakerOrder: league.tiebreaker_order,
  };
  const engineMatches: LeagueMatchInput[] = (matches ?? []).map(m => ({
    p1Id: m.p1_id, p2Id: m.p2_id, p1Score: m.p1_score, p2Score: m.p2_score,
    winnerId: m.winner_id, isDraw: m.is_draw, state: m.state,
  }));
  const standings = computeStandings((participants ?? []).map(p => p.id), engineMatches, cfg);

  return NextResponse.json({
    league,
    participants: participants ?? [],
    matches:      matches ?? [],
    standings,
  });
}
