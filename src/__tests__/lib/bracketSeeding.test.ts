// Regression tests for the bracket seeding algorithm.
//
// The pre-v2.36.10 buildPairings produced broken arrays for slots ≥ 16:
// seed 1 was overwritten in the final pass and the last slot was left at 0.
// distributeByes only nulled the second slot, leaving the first as a stale
// out-of-range seed. These tests pin the correct mirror-recursive output so
// the regression can't reappear.
//
// Standard tournament seeding properties checked:
//   1. Every seed 1..N appears in exactly one position (no duplicates, no gaps)
//   2. Higher seeds (lower numbers) get BYEs first when N < slots
//   3. The classic R1 pairings are seed 1 vs slots, seed 2 vs slots-1, …
//      placed via the mirror pattern so a "chalk" tournament ends with
//      seed 1 vs seed 2 in the final

import { describe, it, expect } from "vitest";
import { nextPow2, buildPairings, distributeByes } from "@/lib/bracket/byes";

describe("nextPow2", () => {
  it.each([
    [1, 1], [2, 2], [3, 4], [4, 4], [5, 8], [7, 8], [8, 8],
    [9, 16], [15, 16], [16, 16], [17, 32], [32, 32], [33, 64], [64, 64],
  ])("nextPow2(%d) = %d", (n, expected) => {
    expect(nextPow2(n)).toBe(expected);
  });
});

describe("buildPairings — every seed present, no zeros", () => {
  it.each([2, 4, 8, 16, 32, 64])("slots=%d has all seeds and no zeros", (slots) => {
    const pairs = buildPairings(slots);
    expect(pairs.length).toBe(slots / 2);

    const flat: number[] = [];
    for (const [a, b] of pairs) {
      expect(a).not.toBeNull();
      expect(b).not.toBeNull();
      flat.push(a as number, b as number);
    }
    // No zeros (the pre-fix bug left slot 16 at 0)
    expect(flat).not.toContain(0);
    // Every seed 1..slots present exactly once
    const sorted = [...flat].sort((x, y) => x - y);
    expect(sorted).toEqual(Array.from({ length: slots }, (_, i) => i + 1));
  });
});

describe("buildPairings — exact expected output (regression-pinned)", () => {
  it("size 2", () => {
    expect(buildPairings(2)).toEqual([[1, 2]]);
  });
  it("size 4 — winners meet seed 1 vs 2 in the final", () => {
    // Pairs (1,4) and (2,3) → R2: (1 or 4) vs (2 or 3) → final seed 1 vs 2 in chalk
    expect(buildPairings(4)).toEqual([[1, 4], [2, 3]]);
  });
  it("size 8", () => {
    expect(buildPairings(8)).toEqual([
      [1, 8], [4, 5], [2, 7], [3, 6],
    ]);
  });
  it("size 16 (the size that broke before the fix)", () => {
    expect(buildPairings(16)).toEqual([
      [1, 16], [8, 9], [4, 13], [5, 12],
      [2, 15], [7, 10], [3, 14], [6, 11],
    ]);
  });
});

describe("distributeByes — top seeds get the byes", () => {
  it("N=9 in 16 slots → 1 real match (seeds 8,9) + 7 byes for seeds 1-7", () => {
    expect(distributeByes(9)).toEqual([
      [1, null],
      [8, 9],
      [4, null],
      [5, null],
      [2, null],
      [7, null],
      [3, null],
      [6, null],
    ]);
  });

  it("N=8 in 8 slots → 4 real pairs, no byes", () => {
    expect(distributeByes(8)).toEqual([
      [1, 8], [4, 5], [2, 7], [3, 6],
    ]);
  });

  it("N=10 in 16 slots → 2 real matches + 6 byes", () => {
    expect(distributeByes(10)).toEqual([
      [1, null],
      [8, 9],
      [4, null],
      [5, null],
      [2, null],
      [7, 10],
      [3, null],
      [6, null],
    ]);
  });

  it("N=3 in 4 slots → 1 real match (seeds 2,3) + 1 bye for seed 1", () => {
    expect(distributeByes(3)).toEqual([
      [1, null],
      [2, 3],
    ]);
  });

  it("N=5 in 8 slots → 1 real match (seeds 4,5) + 3 byes for seeds 1-3", () => {
    expect(distributeByes(5)).toEqual([
      [1, null],
      [4, 5],
      [2, null],
      [3, null],
    ]);
  });
});

describe("distributeByes — invariants", () => {
  it.each([3, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 17, 31, 33, 63])(
    "N=%d: every seed 1..N appears exactly once across all pairs",
    (n) => {
      const pairs = distributeByes(n);
      const flat = pairs.flatMap(p => p).filter((v): v is number => v !== null);
      const sorted = [...flat].sort((a, b) => a - b);
      expect(sorted).toEqual(Array.from({ length: n }, (_, i) => i + 1));
    },
  );

  it("N=2 produces a single real match", () => {
    expect(distributeByes(2)).toEqual([[1, 2]]);
  });
});
