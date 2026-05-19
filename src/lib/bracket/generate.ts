import type { GeneratedBracket, MatchNode, BracketSide } from "./types";
import { nextPow2, distributeByes } from "./byes";
import { LOSERS_ROUTING } from "./losers-mapping";

function ceil2(n: number) {
  return Math.ceil(Math.log2(n));
}

// ── Single Elimination ────────────────────────────────────────

function generateSE(n: number): GeneratedBracket {
  const slots = nextPow2(n);
  const rounds = ceil2(slots);
  const pairs = distributeByes(n);
  const matches: MatchNode[] = [];

  // Round 1
  pairs.forEach(([a, b], idx) => {
    const isBye = b === null;
    matches.push({
      round:       1,
      matchNumber: idx + 1,
      side:        "winners",
      p1Seed:      a <= n ? a : null,
      p2Seed:      b,
      nextMatchNum:      null, // wired below
      nextMatchSlot:     null,
      nextLoserMatchNum: null,
      nextLoserSlot:     null,
      isBye,
    });
  });

  // Subsequent rounds
  let prevCount = pairs.length;
  for (let r = 2; r <= rounds; r++) {
    const count = prevCount >> 1;
    for (let m = 1; m <= count; m++) {
      matches.push({
        round:             r,
        matchNumber:       m,
        side:              "winners",
        p1Seed:            null,
        p2Seed:            null,
        nextMatchNum:      null,
        nextMatchSlot:     null,
        nextLoserMatchNum: null,
        nextLoserSlot:     null,
        isBye:             false,
      });
    }
    prevCount = count;
  }

  // Wire next_match pointers
  wireWinnersPointers(matches, rounds);

  return {
    format:           "single_elimination",
    participantCount: n,
    roundsWinners:    rounds,
    roundsLosers:     0,
    matches,
  };
}

// ── Double Elimination ────────────────────────────────────────

function generateDE(n: number): GeneratedBracket {
  const slots = nextPow2(n);
  const wRounds = ceil2(slots);          // e.g. 8 players → 3 rounds
  const lRounds = 2 * (wRounds - 1);    // losers rounds
  const pairs = distributeByes(n);
  const matches: MatchNode[] = [];

  // Winners bracket — same structure as SE
  pairs.forEach(([a, b], idx) => {
    matches.push({
      round:             1,
      matchNumber:       idx + 1,
      side:              "winners",
      p1Seed:            a <= n ? a : null,
      p2Seed:            b,
      nextMatchNum:      null,
      nextMatchSlot:     null,
      nextLoserMatchNum: null,
      nextLoserSlot:     null,
      isBye:             b === null,
    });
  });

  let prevW = pairs.length;
  for (let r = 2; r <= wRounds; r++) {
    const count = prevW >> 1;
    for (let m = 1; m <= count; m++) {
      matches.push({
        round:             r,
        matchNumber:       m,
        side:              "winners",
        p1Seed:            null,
        p2Seed:            null,
        nextMatchNum:      null,
        nextMatchSlot:     null,
        nextLoserMatchNum: null,
        nextLoserSlot:     null,
        isBye:             false,
      });
    }
    prevW = count;
  }

  // Losers bracket — count per round from LOSERS_ROUTING
  const routing = LOSERS_ROUTING[slots];
  if (!routing) throw new Error(`DE not supported for size ${slots} (> 64)`);

  for (let lr = 1; lr <= lRounds; lr++) {
    const count = routing.matchesPerRound[lr - 1];
    for (let m = 1; m <= count; m++) {
      matches.push({
        round:             lr,
        matchNumber:       m,
        side:              "losers",
        p1Seed:            null,
        p2Seed:            null,
        nextMatchNum:      null,
        nextMatchSlot:     null,
        nextLoserMatchNum: null,
        nextLoserSlot:     null,
        isBye:             false,
      });
    }
  }

  // Grand Final
  matches.push({
    round: 1, matchNumber: 1, side: "grand_final",
    p1Seed: null, p2Seed: null,
    nextMatchNum: null, nextMatchSlot: null,
    nextLoserMatchNum: null, nextLoserSlot: null,
    isBye: false,
  });

  // GF Reset (played only if LB winner beats WB winner)
  matches.push({
    round: 1, matchNumber: 1, side: "gf_reset",
    p1Seed: null, p2Seed: null,
    nextMatchNum: null, nextMatchSlot: null,
    nextLoserMatchNum: null, nextLoserSlot: null,
    isBye: false,
  });

  // Wire winners-bracket pointers
  wireWinnersPointers(
    matches.filter(m => m.side === "winners"),
    wRounds,
  );

  // Wire losers-bracket internal pointers + drop-ins from winners
  wireLosersPointers(matches, routing, wRounds, lRounds);

  // Wire WB finals → Grand Final (slot 1 = WB champ)
  const wbFinal = matches.find(m => m.side === "winners" && m.round === wRounds);
  if (wbFinal) {
    wbFinal.nextMatchNum = 1;
    wbFinal.nextMatchSlot = 1;
  }

  // LB final winner → Grand Final slot 2
  const lbFinal = matches.find(m => m.side === "losers" && m.round === lRounds);
  if (lbFinal) {
    lbFinal.nextMatchNum = 1;
    lbFinal.nextMatchSlot = 2;
  }

  // Grand Final loser → GF Reset slot 2; winner → GF Reset slot 1
  const gf = matches.find(m => m.side === "grand_final");
  if (gf) {
    gf.nextMatchNum  = 1;   // winner goes to gf_reset p1
    gf.nextMatchSlot = 1;
    gf.nextLoserMatchNum = 1;
    gf.nextLoserSlot     = 2;
  }

  return {
    format:           "double_elimination",
    participantCount: n,
    roundsWinners:    wRounds,
    roundsLosers:     lRounds,
    matches,
  };
}

// ── Pointer wiring helpers ────────────────────────────────────

function wireWinnersPointers(wMatches: MatchNode[], totalRounds: number) {
  for (let r = 1; r < totalRounds; r++) {
    const thisRound = wMatches.filter(m => m.side === "winners" && m.round === r);
    thisRound.forEach((m, idx) => {
      const nextMatchNum = Math.ceil((idx + 1) / 2);
      const slot = (idx % 2 === 0) ? 1 : 2;
      m.nextMatchNum  = nextMatchNum;
      m.nextMatchSlot = slot as 1 | 2;
    });
  }
}

function wireLosersPointers(
  all: MatchNode[],
  routing: { matchesPerRound: number[]; dropInRound: number[]; dropInSlot: (1|2)[] },
  wRounds: number,
  lRounds: number,
) {
  const lMatches = (r: number) => all.filter(m => m.side === "losers" && m.round === r);

  // Internal losers wiring: each match's winner advances to the next losers round
  for (let lr = 1; lr < lRounds; lr++) {
    const cur = lMatches(lr);
    const next = lMatches(lr + 1);
    cur.forEach((m, idx) => {
      const nextMatchNum = Math.ceil((idx + 1) / 2);
      m.nextMatchNum  = nextMatchNum;
      m.nextMatchSlot = (idx % 2 === 0 ? 1 : 2) as 1 | 2;
    });
    // In "consolidation" rounds (odd LR) the count stays the same — no bracket halving
    // The LOSERS_ROUTING already encodes correct matchesPerRound, so the pairing above
    // handles it naturally.
    void next; // suppress unused warning
  }

  // Drop-in losers from winners bracket each round
  // routing.dropInRound[wr-1] = which losers round receives WR losers
  for (let wr = 1; wr < wRounds; wr++) {
    const targetLR   = routing.dropInRound[wr - 1];
    const targetSlot = routing.dropInSlot[wr - 1];
    const wMatches   = all.filter(m => m.side === "winners" && m.round === wr);
    wMatches.forEach((wm, idx) => {
      const targetMatchNum = idx + 1; // 1:1 mapping for drop-in rounds
      wm.nextLoserMatchNum = targetMatchNum;
      wm.nextLoserSlot     = targetSlot;
    });
  }
}

// ── Public API ───────────────────────────────────────────────

export function generateBracket(
  participantCount: number,
  format: "single_elimination" | "double_elimination",
): GeneratedBracket {
  if (participantCount < 2) throw new Error("Need at least 2 participants");
  return format === "double_elimination"
    ? generateDE(participantCount)
    : generateSE(participantCount);
}
