// League standings — derived from match results, NEVER stored. Pure functions
// kept independent of the Supabase client so they can be unit-tested against any
// hand-built set of matches.
//
// Points model is configurable per league (defaults 3/1/0). A match contributes
// to standings only once it is `completed`. Draws are supported (is_draw + equal
// scores). Goals for/against come from p1_score/p2_score (default 0 when null),
// which feed the goal-difference tiebreaker.

export type LeagueConfig = {
  pointsWin:       number;
  pointsDraw:      number;
  pointsLoss:      number;
  // Applied in order after points. Supported keys:
  //   "head_to_head" | "wins" | "goal_diff" | "goals_for"
  tiebreakerOrder: string[];
};

export const DEFAULT_LEAGUE_CONFIG: LeagueConfig = {
  pointsWin:       3,
  pointsDraw:      1,
  pointsLoss:      0,
  tiebreakerOrder: ["head_to_head", "wins", "goal_diff", "goals_for"],
};

// A match as the engine needs it. `participantId`s reference league_participants.id.
export type LeagueMatchInput = {
  p1Id:     number | null;
  p2Id:     number | null;
  p1Score:  number | null;
  p2Score:  number | null;
  winnerId: number | null;
  isDraw:   boolean;
  state:    string; // only "completed" matches count
};

export type StandingRow = {
  participantId: number;
  played:        number;
  wins:          number;
  draws:         number;
  losses:        number;
  goalsFor:      number;
  goalsAgainst:  number;
  goalDiff:      number;
  points:        number;
  rank:          number; // 1-based, assigned after sort
};

function isCounted(m: LeagueMatchInput): boolean {
  return m.state === "completed" && m.p1Id != null && m.p2Id != null;
}

export function computeStandings(
  participantIds: number[],
  matches:        LeagueMatchInput[],
  cfg:            LeagueConfig = DEFAULT_LEAGUE_CONFIG,
): StandingRow[] {
  const rows = new Map<number, StandingRow>();
  for (const id of participantIds) {
    rows.set(id, {
      participantId: id, played: 0, wins: 0, draws: 0, losses: 0,
      goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0, rank: 0,
    });
  }

  for (const m of matches) {
    if (!isCounted(m)) continue;
    const r1 = rows.get(m.p1Id!);
    const r2 = rows.get(m.p2Id!);
    if (!r1 || !r2) continue; // participant not in the provided set — skip

    const s1 = m.p1Score ?? 0;
    const s2 = m.p2Score ?? 0;

    r1.played++; r2.played++;
    r1.goalsFor += s1; r1.goalsAgainst += s2;
    r2.goalsFor += s2; r2.goalsAgainst += s1;

    if (m.isDraw) {
      r1.draws++; r2.draws++;
      r1.points += cfg.pointsDraw; r2.points += cfg.pointsDraw;
    } else {
      const winner = m.winnerId === m.p1Id ? r1 : r2;
      const loser  = winner === r1 ? r2 : r1;
      winner.wins++;   winner.points += cfg.pointsWin;
      loser.losses++;  loser.points  += cfg.pointsLoss;
    }
  }

  for (const r of rows.values()) r.goalDiff = r.goalsFor - r.goalsAgainst;

  const sorted = [...rows.values()].sort((a, b) => compareRows(a, b, matches, cfg));
  sorted.forEach((r, i) => { r.rank = i + 1; });
  return sorted;
}

// Returns <0 if a ranks above b, >0 if b ranks above a, 0 if truly tied.
function compareRows(
  a: StandingRow, b: StandingRow, matches: LeagueMatchInput[], cfg: LeagueConfig,
): number {
  if (b.points !== a.points) return b.points - a.points;

  for (const key of cfg.tiebreakerOrder) {
    if (key === "head_to_head") {
      const h2h = headToHead(a.participantId, b.participantId, matches, cfg);
      if (h2h !== 0) return h2h;
    } else if (key === "wins") {
      if (b.wins !== a.wins) return b.wins - a.wins;
    } else if (key === "goal_diff") {
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    } else if (key === "goals_for") {
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    }
  }
  // Stable final fallback: lower participantId first (deterministic).
  return a.participantId - b.participantId;
}

// Head-to-head points between exactly two participants across their direct
// matches. <0 if `aId` is ahead, >0 if `bId` is ahead, 0 if level.
function headToHead(
  aId: number, bId: number, matches: LeagueMatchInput[], cfg: LeagueConfig,
): number {
  let aPts = 0, bPts = 0;
  for (const m of matches) {
    if (!isCounted(m)) continue;
    const pair = (m.p1Id === aId && m.p2Id === bId) || (m.p1Id === bId && m.p2Id === aId);
    if (!pair) continue;
    if (m.isDraw) { aPts += cfg.pointsDraw; bPts += cfg.pointsDraw; continue; }
    if (m.winnerId === aId) { aPts += cfg.pointsWin; bPts += cfg.pointsLoss; }
    else                    { bPts += cfg.pointsWin; aPts += cfg.pointsLoss; }
  }
  return bPts - aPts;
}

export function isLeagueComplete(matches: LeagueMatchInput[]): boolean {
  const real = matches.filter(m => m.p1Id != null && m.p2Id != null);
  if (real.length === 0) return false;
  return real.every(m => m.state === "completed");
}

// Top-3 of the standings → podium positions. Returns participantIds; the caller
// (API layer) maps each to its user_profile_id before writing tournament_results,
// so the engine stays free of the participant→user mapping.
export type LeaguePodiumEntry = { position: 1 | 2 | 3; participantId: number };

export function deriveLeaguePodium(standings: StandingRow[]): LeaguePodiumEntry[] {
  return standings
    .slice(0, 3)
    .map((r, i) => ({ position: (i + 1) as 1 | 2 | 3, participantId: r.participantId }));
}
