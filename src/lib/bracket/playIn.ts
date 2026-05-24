// Play-in round planning for non-power-of-2 single-elimination brackets.
//
// Instead of inflating the bracket to nextPow2(N) and concentrating byes on
// the top seeds (the standard tournament approach used by `distributeByes`),
// the play-in approach uses a SMALLER main bracket (largest power-of-2 ≤ N)
// and adds a "round 0" play-in stage that absorbs the excess players.
//
// Example for N=9:
//   prev = 8, excess = 1
//   • Play-in: seed 8 vs seed 9 (1 match)
//   • Main R1: seeds 1..7 + play-in winner → 4 real matches, no byes
//   • Main R2: 2 matches
//   • Final:   1 match
//   Total:    8 matches (same as standard) but R1 looks "complete"
//
// Seeding rule for play-in pairs: best play-in seed vs worst play-in seed,
// second-best vs second-worst, etc. Same idea as the mirror-recursive
// pairing inside buildPairings — keep the best play-in candidates from
// meeting each other before they meet a direct entry.

export interface PlayInPlan {
  prevPow2:    number;             // largest power-of-2 ≤ N
  excess:      number;             // N - prevPow2
  directSeeds: number;             // prevPow2 - excess → entries into main R1
  /**
   * Play-in pairs as [topSeed, bottomSeed] tuples in pairing order.
   * PI #J (1-indexed) is `playInPairs[J-1]`. Each PI winner advances into
   * a specific slot of the main bracket (see `playInTargetSlot`).
   */
  playInPairs: [number, number][];
}

/**
 * Returns the play-in plan for N participants, or `null` if N is < 3 or a
 * power of 2 (no play-in needed — use the standard seeding via
 * `distributeByes`).
 */
export function planPlayIn(n: number): PlayInPlan | null {
  if (n < 3) return null;
  let prev = 1;
  while (prev * 2 <= n) prev *= 2;
  if (prev === n) return null;

  const excess      = n - prev;
  const directSeeds = prev - excess;

  const playInPairs: [number, number][] = [];
  // PI #J: seed (directSeeds + J) vs seed (n + 1 - J)
  for (let j = 1; j <= excess; j++) {
    playInPairs.push([directSeeds + j, n + 1 - j]);
  }

  return { prevPow2: prev, excess, directSeeds, playInPairs };
}

/**
 * The slot number (1..prevPow2) in the main bracket that PI #J winner takes.
 * PI #J winner → slot (directSeeds + J).
 *
 * For N=10 (directSeeds=6): PI #1 → slot 7, PI #2 → slot 8.
 * Combined with buildPairings(8) = [(1,8),(4,5),(2,7),(3,6)], that means
 *   Main M1: seed 1 vs PI #2 winner (slot 8)
 *   Main M3: seed 2 vs PI #1 winner (slot 7)
 * which spreads play-in winners across the bracket so they don't all face
 * the same direct entry on the same side of the tree.
 */
export function playInTargetSlot(plan: PlayInPlan, playInIndex: number): number {
  return plan.directSeeds + playInIndex; // 1-indexed
}
