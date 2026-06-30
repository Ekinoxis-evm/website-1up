import { describe, it, expect } from "vitest";
import {
  computeStandings,
  isLeagueComplete,
  deriveLeaguePodium,
  DEFAULT_LEAGUE_CONFIG,
  type LeagueMatchInput,
  type LeagueConfig,
} from "@/lib/league/standings";

// Build a completed match
function match(
  p1Id: number, p2Id: number, p1Score: number, p2Score: number,
  over: Partial<LeagueMatchInput> = {},
): LeagueMatchInput {
  const isDraw = p1Score === p2Score;
  return {
    p1Id, p2Id, p1Score, p2Score,
    isDraw,
    winnerId: isDraw ? null : (p1Score > p2Score ? p1Id : p2Id),
    state: "completed",
    ...over,
  };
}

describe("computeStandings — points", () => {
  it("awards 3/1/0 by default and ranks by points", () => {
    // 3 players: 1 beats 2, 1 beats 3, 2 beats 3
    const rows = computeStandings([1, 2, 3], [
      match(1, 2, 2, 0),
      match(1, 3, 1, 0),
      match(2, 3, 3, 1),
    ]);
    expect(rows.map(r => r.participantId)).toEqual([1, 2, 3]);
    expect(rows[0].points).toBe(6); // two wins
    expect(rows[1].points).toBe(3); // one win, one loss
    expect(rows[2].points).toBe(0); // two losses
    expect(rows.map(r => r.rank)).toEqual([1, 2, 3]);
  });

  it("counts a draw as 1 point each", () => {
    const rows = computeStandings([1, 2], [match(1, 2, 1, 1)]);
    expect(rows.every(r => r.points === 1 && r.draws === 1)).toBe(true);
    expect(rows[0].wins).toBe(0);
    expect(rows[0].losses).toBe(0);
  });

  it("tracks played / goalsFor / goalsAgainst / goalDiff", () => {
    const rows = computeStandings([1, 2], [match(1, 2, 3, 1)]);
    const p1 = rows.find(r => r.participantId === 1)!;
    expect(p1.played).toBe(1);
    expect(p1.goalsFor).toBe(3);
    expect(p1.goalsAgainst).toBe(1);
    expect(p1.goalDiff).toBe(2);
  });

  it("respects a custom points model", () => {
    const cfg: LeagueConfig = { ...DEFAULT_LEAGUE_CONFIG, pointsWin: 2, pointsDraw: 1, pointsLoss: 0 };
    const rows = computeStandings([1, 2], [match(1, 2, 5, 0)], cfg);
    expect(rows[0].points).toBe(2);
  });

  it("ignores non-completed matches", () => {
    const rows = computeStandings([1, 2], [
      { p1Id: 1, p2Id: 2, p1Score: null, p2Score: null, winnerId: null, isDraw: false, state: "pending" },
    ]);
    expect(rows.every(r => r.played === 0 && r.points === 0)).toBe(true);
  });

  it("includes participants with zero games played", () => {
    const rows = computeStandings([1, 2, 3], [match(1, 2, 1, 0)]);
    expect(rows).toHaveLength(3);
    const p3 = rows.find(r => r.participantId === 3)!;
    expect(p3.played).toBe(0);
    expect(p3.points).toBe(0);
    // p3 (0 GD) edges p2 (-1 GD) on the goal-diff tiebreaker; winner p1 is top.
    expect(rows[0].participantId).toBe(1);
    expect(p3.rank).toBe(2);
  });
});

describe("computeStandings — tiebreakers", () => {
  it("head-to-head decides two level-on-points players", () => {
    const r = computeStandings([1, 2, 3, 4], [
      match(1, 2, 1, 0), // 1 beats 2
      match(1, 3, 0, 1), // 3 beats 1
      match(2, 4, 5, 0), // 2 beats 4
      // now 1: 1 win (vs2), 1 loss (vs3) = 3 pts; 2: 1 win (vs4), 1 loss (vs1) = 3 pts
    ]);
    const one = r.find(x => x.participantId === 1)!;
    const two = r.find(x => x.participantId === 2)!;
    expect(one.points).toBe(3);
    expect(two.points).toBe(3);
    // head-to-head: 1 beat 2 → 1 ranks above 2
    expect(one.rank).toBeLessThan(two.rank);
  });

  it("falls through to goal_diff when head-to-head is level", () => {
    const cfg: LeagueConfig = { ...DEFAULT_LEAGUE_CONFIG, tiebreakerOrder: ["head_to_head", "goal_diff", "goals_for"] };
    // 1 and 2 never played each other (or drew); decide by goal diff.
    const rows = computeStandings([1, 2, 3], [
      match(1, 3, 5, 0), // 1: +5
      match(2, 3, 2, 0), // 2: +2  (3 already counted twice, fine)
    ], cfg);
    // both have 3 points (one win each), no head-to-head → goal_diff: 1 ahead
    const one = rows.find(r => r.participantId === 1)!;
    const two = rows.find(r => r.participantId === 2)!;
    expect(one.points).toBe(3);
    expect(two.points).toBe(3);
    expect(one.rank).toBeLessThan(two.rank);
  });

  it("is deterministic when truly tied (lower id first)", () => {
    const rows = computeStandings([2, 1], []); // nobody played
    expect(rows.map(r => r.participantId)).toEqual([1, 2]);
  });
});

describe("isLeagueComplete", () => {
  it("false when there are no real matches", () => {
    expect(isLeagueComplete([])).toBe(false);
  });
  it("false while any real match is unplayed", () => {
    expect(isLeagueComplete([
      match(1, 2, 1, 0),
      { p1Id: 3, p2Id: 4, p1Score: null, p2Score: null, winnerId: null, isDraw: false, state: "ready" },
    ])).toBe(false);
  });
  it("true once every real match is completed", () => {
    expect(isLeagueComplete([match(1, 2, 1, 0), match(3, 4, 2, 2)])).toBe(true);
  });
});

describe("deriveLeaguePodium", () => {
  it("returns top-3 participantIds with positions", () => {
    const rows = computeStandings([1, 2, 3, 4], [
      match(1, 2, 3, 0), match(1, 3, 3, 0), match(1, 4, 3, 0), // 1 wins all → 9
      match(2, 3, 2, 0), match(2, 4, 2, 0),                    // 2 → 6
      match(3, 4, 1, 0),                                       // 3 → 3, 4 → 0
    ]);
    const podium = deriveLeaguePodium(rows);
    expect(podium).toEqual([
      { position: 1, participantId: 1 },
      { position: 2, participantId: 2 },
      { position: 3, participantId: 3 },
    ]);
  });

  it("returns fewer than 3 when the league is tiny", () => {
    const rows = computeStandings([1, 2], [match(1, 2, 1, 0)]);
    expect(deriveLeaguePodium(rows)).toHaveLength(2);
  });
});
