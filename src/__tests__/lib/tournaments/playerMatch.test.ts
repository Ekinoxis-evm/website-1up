import { describe, it, expect } from "vitest";
import {
  findMyParticipant,
  resolveMyMatch,
  currentRound,
  matchesForRound,
  isMyMatch,
  type PlayerMatch,
} from "@/lib/tournaments/playerMatch";

function m(over: Partial<PlayerMatch>): PlayerMatch {
  return { id: 1, round: 1, matchNumber: 1, p1Id: null, p2Id: null, state: "pending", ...over };
}

describe("findMyParticipant", () => {
  const parts = [
    { id: 1, userProfileId: 100 },
    { id: 2, userProfileId: 200 },
    { id: 3, userProfileId: null },
  ];
  it("matches by user_profile_id", () => {
    expect(findMyParticipant(parts, 200)?.id).toBe(2);
  });
  it("returns null when not found or logged out", () => {
    expect(findMyParticipant(parts, 999)).toBeNull();
    expect(findMyParticipant(parts, null)).toBeNull();
  });
});

describe("resolveMyMatch", () => {
  it("returns null with no participant or no matches", () => {
    expect(resolveMyMatch([m({ p1Id: 1, p2Id: 2 })], null)).toBeNull();
    expect(resolveMyMatch([], 1)).toBeNull();
  });

  it("prefers the in_progress match", () => {
    const matches = [
      m({ id: 1, round: 1, matchNumber: 1, p1Id: 1, p2Id: 2, state: "completed" }),
      m({ id: 2, round: 2, matchNumber: 1, p1Id: 1, p2Id: 3, state: "in_progress" }),
      m({ id: 3, round: 3, matchNumber: 1, p1Id: 1, p2Id: 4, state: "pending" }),
    ];
    expect(resolveMyMatch(matches, 1)?.id).toBe(2);
  });

  it("falls back to the next upcoming (ready before later pending)", () => {
    const matches = [
      m({ id: 1, round: 1, matchNumber: 1, p1Id: 1, p2Id: 2, state: "completed" }),
      m({ id: 2, round: 2, matchNumber: 3, p1Id: 5, p2Id: 1, state: "ready" }),
      m({ id: 3, round: 3, matchNumber: 1, p1Id: 1, p2Id: 6, state: "pending" }),
    ];
    expect(resolveMyMatch(matches, 1)?.id).toBe(2);
  });

  it("orders upcoming by round then match number", () => {
    const matches = [
      m({ id: 1, round: 2, matchNumber: 5, p1Id: 1, p2Id: 2, state: "ready" }),
      m({ id: 2, round: 1, matchNumber: 9, p1Id: 1, p2Id: 3, state: "ready" }),
    ];
    expect(resolveMyMatch(matches, 1)?.id).toBe(2); // round 1 wins
  });

  it("when all done, returns the latest played match", () => {
    const matches = [
      m({ id: 1, round: 1, matchNumber: 1, p1Id: 1, p2Id: 2, state: "completed" }),
      m({ id: 2, round: 2, matchNumber: 1, p1Id: 1, p2Id: 3, state: "completed" }),
    ];
    expect(resolveMyMatch(matches, 1)?.id).toBe(2);
  });

  it("finds the match whether the player is p1 or p2", () => {
    const matches = [m({ id: 7, round: 1, matchNumber: 1, p1Id: 9, p2Id: 1, state: "ready" })];
    expect(resolveMyMatch(matches, 1)?.id).toBe(7);
  });
});

describe("currentRound", () => {
  it("is 0 for no matches", () => {
    expect(currentRound([])).toBe(0);
  });
  it("is the lowest round with an unfinished match", () => {
    const matches = [
      m({ round: 1, state: "completed" }),
      m({ round: 2, state: "ready" }),
      m({ round: 3, state: "pending" }),
    ];
    expect(currentRound(matches)).toBe(2);
  });
  it("ignores bye matches when finding the active round", () => {
    const matches = [
      m({ round: 1, state: "completed" }),
      m({ round: 2, state: "bye" }),
      m({ round: 2, state: "completed" }),
      m({ round: 3, state: "ready" }),
    ];
    expect(currentRound(matches)).toBe(3);
  });
  it("is the max round when everything is done", () => {
    const matches = [
      m({ round: 1, state: "completed" }),
      m({ round: 2, state: "completed" }),
    ];
    expect(currentRound(matches)).toBe(2);
  });
});

describe("matchesForRound", () => {
  it("filters and sorts by match number", () => {
    const matches = [
      m({ id: 1, round: 1, matchNumber: 2 }),
      m({ id: 2, round: 2, matchNumber: 1 }),
      m({ id: 3, round: 1, matchNumber: 1 }),
    ];
    expect(matchesForRound(matches, 1).map(x => x.id)).toEqual([3, 1]);
  });
});

describe("isMyMatch", () => {
  it("true when the player is in the match", () => {
    expect(isMyMatch(m({ p1Id: 1, p2Id: 2 }), 2)).toBe(true);
    expect(isMyMatch(m({ p1Id: 1, p2Id: 2 }), 3)).toBe(false);
    expect(isMyMatch(m({ p1Id: 1, p2Id: 2 }), null)).toBe(false);
  });
});
