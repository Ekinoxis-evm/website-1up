import { describe, it, expect } from "vitest";
import {
  derivePodium,
  type PodiumMatch,
  type PodiumParticipant,
} from "@/lib/bracket/podium";

// Helper to build a match without retyping every field
function m(over: Partial<PodiumMatch>): PodiumMatch {
  return {
    id: 1,
    bracket_side: "winners",
    round: 1,
    winner_id: null,
    loser_id: null,
    next_match_id: null,
    state: "completed",
    ...over,
  };
}

const P = (id: number, userProfileId: number | null = id * 100): PodiumParticipant => ({
  id, user_profile_id: userProfileId,
});

describe("derivePodium — single elimination", () => {
  it("returns 1st + 2nd from the final, no 3rd", () => {
    // 4-player single-elim:
    //   semi1: 1 vs 2 → winner=1   (round 1)
    //   semi2: 3 vs 4 → winner=3   (round 1)
    //   final: 1 vs 3 → winner=1   (round 2, next_match_id=null)
    const matches = [
      m({ id: 1, bracket_side: "winners", round: 1, winner_id: 1, loser_id: 2, next_match_id: 3 }),
      m({ id: 2, bracket_side: "winners", round: 1, winner_id: 3, loser_id: 4, next_match_id: 3 }),
      m({ id: 3, bracket_side: "winners", round: 2, winner_id: 1, loser_id: 3, next_match_id: null }),
    ];
    const participants = [P(1), P(2), P(3), P(4)];
    const podium = derivePodium("single_elimination", matches, participants);

    expect(podium).toEqual([
      { position: 1, userProfileId: 100 },
      { position: 2, userProfileId: 300 },
    ]);
  });

  it("returns nothing when the final is not yet completed", () => {
    const matches = [
      m({ id: 1, bracket_side: "winners", round: 2, winner_id: null, loser_id: null, next_match_id: null, state: "ready" }),
    ];
    const podium = derivePodium("single_elimination", matches, [P(1), P(2)]);
    expect(podium).toEqual([]);
  });

  it("ignores byes when picking the final", () => {
    // A bye lives on winners but state='bye' — must not be treated as the final.
    const matches = [
      m({ id: 1, bracket_side: "winners", round: 1, winner_id: 1, loser_id: null, next_match_id: null, state: "bye" }),
      m({ id: 2, bracket_side: "winners", round: 2, winner_id: 1, loser_id: 2, next_match_id: null, state: "completed" }),
    ];
    const podium = derivePodium("single_elimination", matches, [P(1), P(2)]);
    expect(podium).toEqual([
      { position: 1, userProfileId: 100 },
      { position: 2, userProfileId: 200 },
    ]);
  });
});

describe("derivePodium — double elimination", () => {
  it("returns 1st + 2nd + 3rd (loser of losers-final)", () => {
    // grand_final (round 1): winner=1, loser=2  → 1st=1, 2nd=2
    // losers round 3 (last): loser=3            → 3rd=3
    // earlier losers round (lower number) — must be ignored
    const matches = [
      m({ id: 10, bracket_side: "winners", round: 2, winner_id: 1, loser_id: 4, next_match_id: 20, state: "completed" }),
      m({ id: 11, bracket_side: "losers",  round: 1, winner_id: 4, loser_id: 5, next_match_id: 12, state: "completed" }),
      m({ id: 12, bracket_side: "losers",  round: 2, winner_id: 3, loser_id: 4, next_match_id: 13, state: "completed" }),
      m({ id: 13, bracket_side: "losers",  round: 3, winner_id: 2, loser_id: 3, next_match_id: 20, state: "completed" }),
      m({ id: 20, bracket_side: "grand_final", round: 1, winner_id: 1, loser_id: 2, next_match_id: null, state: "completed" }),
    ];
    const participants = [P(1), P(2), P(3), P(4), P(5)];
    const podium = derivePodium("double_elimination", matches, participants);

    expect(podium).toEqual([
      { position: 1, userProfileId: 100 },
      { position: 2, userProfileId: 200 },
      { position: 3, userProfileId: 300 },
    ]);
  });

  it("returns nothing when the grand final is incomplete", () => {
    const matches = [
      m({ id: 1, bracket_side: "grand_final", round: 1, next_match_id: null, state: "ready" }),
    ];
    expect(derivePodium("double_elimination", matches, [P(1), P(2)])).toEqual([]);
  });

  it("returns 1st + 2nd when no losers-bracket matches exist (degenerate)", () => {
    // Pathological: only a grand_final completed, no losers matches at all.
    // We still emit 1st/2nd; 3rd just won't appear.
    const matches = [
      m({ id: 1, bracket_side: "grand_final", round: 1, winner_id: 1, loser_id: 2, next_match_id: null, state: "completed" }),
    ];
    const podium = derivePodium("double_elimination", matches, [P(1), P(2)]);
    expect(podium).toEqual([
      { position: 1, userProfileId: 100 },
      { position: 2, userProfileId: 200 },
    ]);
  });
});

describe("derivePodium — placeholder participants", () => {
  it("skips a podium entry when the participant has no user_profile_id", () => {
    // Imagine a display-only seed (e.g. 'TBD' or a placeholder) won the final.
    // We must NOT emit a podium row for them — there's nothing to link to.
    const matches = [
      m({ id: 1, bracket_side: "winners", round: 1, winner_id: 1, loser_id: 2, next_match_id: null, state: "completed" }),
    ];
    const participants = [P(1, null), P(2)];
    const podium = derivePodium("single_elimination", matches, participants);

    // 1st is dropped (placeholder), 2nd is real → only 2nd emitted.
    expect(podium).toEqual([
      { position: 2, userProfileId: 200 },
    ]);
  });
});
