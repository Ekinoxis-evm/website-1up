// Bracket seeding: generates MatchSeed blueprints for insertion into bracket_matches.
// Supports single and double elimination for up to 64 participants.

import { nextPow2, distributeByes } from "./byes";

export type BracketSide = "winners" | "losers" | "grand_final";

export interface MatchSeed {
  side: BracketSide;
  round: number;
  matchNumber: number;
  p1Seed: number | null; // seed number (1-based); null = TBD
  p2Seed: number | null; // null = TBD; isBye=true means auto-advance p1
  isBye: boolean;
  // Resolved to DB IDs after insert
  nextSide: BracketSide | null;
  nextRound: number | null;
  nextMatchNum: number | null;
  nextMatchSlot: 1 | 2 | null;
  loserNextSide: BracketSide | null; // winners-bracket only
  loserNextRound: number | null;
  loserNextMatchNum: number | null;
  loserNextSlot: 1 | 2 | null;
}

// ─── Single elimination ────────────────────────────────────────────────────────

function seedSE(n: number): MatchSeed[] {
  const size = nextPow2(n);
  const rounds = Math.log2(size);
  const pairs = distributeByes(n);
  const seeds: MatchSeed[] = [];

  // R1
  pairs.forEach(([a, b], idx) => {
    const m = idx + 1;
    const isBye = b === null;
    seeds.push({
      side: "winners",
      round: 1,
      matchNumber: m,
      p1Seed: a <= n ? a : null,
      p2Seed: isBye ? null : b,
      isBye,
      nextSide: rounds > 1 ? "winners" : null,
      nextRound: rounds > 1 ? 2 : null,
      nextMatchNum: rounds > 1 ? Math.ceil(m / 2) : null,
      nextMatchSlot: rounds > 1 ? (m % 2 === 1 ? 1 : 2) : null,
      loserNextSide: null,
      loserNextRound: null,
      loserNextMatchNum: null,
      loserNextSlot: null,
    });
  });

  // R2+
  let prevCount = pairs.length;
  for (let r = 2; r <= rounds; r++) {
    const count = prevCount >> 1;
    const isFinal = r === rounds;
    for (let m = 1; m <= count; m++) {
      seeds.push({
        side: "winners",
        round: r,
        matchNumber: m,
        p1Seed: null,
        p2Seed: null,
        isBye: false,
        nextSide: isFinal ? null : "winners",
        nextRound: isFinal ? null : r + 1,
        nextMatchNum: isFinal ? null : Math.ceil(m / 2),
        nextMatchSlot: isFinal ? null : (m % 2 === 1 ? 1 : 2),
        loserNextSide: null,
        loserNextRound: null,
        loserNextMatchNum: null,
        loserNextSlot: null,
      });
    }
    prevCount = count;
  }

  return seeds;
}

// ─── Double elimination ────────────────────────────────────────────────────────

function seedDE(n: number): MatchSeed[] {
  const size = nextPow2(n);
  const wRounds = Math.log2(size);
  const lRounds = 2 * (wRounds - 1);
  const pairs = distributeByes(n);
  const seeds: MatchSeed[] = [];

  const wr1Count = pairs.length; // = size / 2

  // ── Winners R1 ──────────────────────────────────────────────
  pairs.forEach(([a, b], idx) => {
    const m = idx + 1;
    const isBye = b === null;

    // Loser cross-pairing: first half → slot 1 of LR1_M(m)
    //                      second half (reversed) → slot 2 of LR1_M(wr1Count+1-m)
    const halfPoint = wr1Count / 2;
    const lrMatchNum = m <= halfPoint ? m : wr1Count + 1 - m;
    const lrSlot: 1 | 2 = m <= halfPoint ? 1 : 2;

    seeds.push({
      side: "winners",
      round: 1,
      matchNumber: m,
      p1Seed: a <= n ? a : null,
      p2Seed: isBye ? null : (b !== null && b <= n ? b : null),
      isBye,
      nextSide: "winners",
      nextRound: 2,
      nextMatchNum: Math.ceil(m / 2),
      nextMatchSlot: m % 2 === 1 ? 1 : 2,
      loserNextSide: isBye ? null : "losers",
      loserNextRound: isBye ? null : 1,
      loserNextMatchNum: isBye ? null : lrMatchNum,
      loserNextSlot: isBye ? null : lrSlot,
    });
  });

  // ── Winners R2 … WF ─────────────────────────────────────────
  for (let r = 2; r <= wRounds; r++) {
    const count = size >> r;
    const isWF = r === wRounds;

    for (let m = 1; m <= count; m++) {
      // Loser drop-in round: WRr loser → LR(2*(r-1)), slot 2
      // WF loser → LF (lRounds), slot 2
      const loserLR = isWF ? lRounds : 2 * (r - 1);

      seeds.push({
        side: "winners",
        round: r,
        matchNumber: m,
        p1Seed: null,
        p2Seed: null,
        isBye: false,
        nextSide: isWF ? "grand_final" : "winners",
        nextRound: isWF ? 1 : r + 1,
        nextMatchNum: isWF ? 1 : Math.ceil(m / 2),
        nextMatchSlot: isWF ? 1 : (m % 2 === 1 ? 1 : 2),
        loserNextSide: "losers",
        loserNextRound: loserLR,
        loserNextMatchNum: m,
        loserNextSlot: 2,
      });
    }
  }

  // ── Losers R1 (pure — WR1 losers fight each other) ──────────
  const lr1Count = size >> 2; // = wr1Count / 2
  for (let m = 1; m <= lr1Count; m++) {
    seeds.push({
      side: "losers",
      round: 1,
      matchNumber: m,
      p1Seed: null,
      p2Seed: null,
      isBye: false,
      nextSide: "losers",
      nextRound: 2,
      nextMatchNum: m,    // 1:1 to LR2 (slot 1 — WR2 loser fills slot 2)
      nextMatchSlot: 1,
      loserNextSide: null,
      loserNextRound: null,
      loserNextMatchNum: null,
      loserNextSlot: null,
    });
  }

  // ── Losers R2 … LF ──────────────────────────────────────────
  for (let lr = 2; lr <= lRounds; lr++) {
    // matchCount: LR1=size/4, LR2=size/4, LR3=size/8, LR4=size/8, …
    const matchCount = Math.max(1, size >> (1 + Math.ceil(lr / 2)));
    const isLF = lr === lRounds;

    for (let m = 1; m <= matchCount; m++) {
      let nextSide: BracketSide | null;
      let nextRound: number | null;
      let nextMatchNum: number | null;
      let nextMatchSlot: 1 | 2 | null;

      if (isLF) {
        // LF winner → GF, slot 2
        nextSide = "grand_final";
        nextRound = 1;
        nextMatchNum = 1;
        nextMatchSlot = 2;
      } else if (lr % 2 === 0) {
        // Dropout round: winners halve into next pure round
        nextSide = "losers";
        nextRound = lr + 1;
        nextMatchNum = Math.ceil(m / 2);
        nextMatchSlot = m % 2 === 1 ? 1 : 2;
      } else {
        // Pure round: winners advance 1:1 to next dropout round (slot 1)
        nextSide = "losers";
        nextRound = lr + 1;
        nextMatchNum = m;
        nextMatchSlot = 1;
      }

      seeds.push({
        side: "losers",
        round: lr,
        matchNumber: m,
        p1Seed: null,
        p2Seed: null,
        isBye: false,
        nextSide,
        nextRound,
        nextMatchNum,
        nextMatchSlot,
        loserNextSide: null,
        loserNextRound: null,
        loserNextMatchNum: null,
        loserNextSlot: null,
      });
    }
  }

  // ── Grand Final ──────────────────────────────────────────────
  // Slot 1 = WF winner (wired above), slot 2 = LF winner (wired above)
  seeds.push({
    side: "grand_final",
    round: 1,
    matchNumber: 1,
    p1Seed: null,
    p2Seed: null,
    isBye: false,
    nextSide: null,
    nextRound: null,
    nextMatchNum: null,
    nextMatchSlot: null,
    loserNextSide: null,
    loserNextRound: null,
    loserNextMatchNum: null,
    loserNextSlot: null,
  });

  return seeds;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function seedBracket(
  n: number,
  format: "single_elimination" | "double_elimination",
): MatchSeed[] {
  if (n < 2) throw new Error("Need at least 2 participants");
  if (n > 64) throw new Error("Maximum 64 participants supported");
  return format === "double_elimination" ? seedDE(n) : seedSE(n);
}
