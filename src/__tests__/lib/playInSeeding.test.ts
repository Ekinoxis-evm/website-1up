// Play-in round seeding for single-elimination brackets with non-power-of-2
// participant counts. Verifies the MatchSeed graph that seedBracket("…", "single_elimination")
// produces — both the play-in pre-round and the main bracket pointer wiring.

import { describe, it, expect } from "vitest";
import { planPlayIn, playInTargetSlot } from "@/lib/bracket/playIn";
import { seedBracket } from "@/lib/bracket/seed";

describe("planPlayIn — when is play-in needed", () => {
  it.each([2, 4, 8, 16, 32, 64])("returns null for power-of-2 N=%d (no play-in)", (n) => {
    expect(planPlayIn(n)).toBeNull();
  });

  it("returns null for N < 3", () => {
    expect(planPlayIn(2)).toBeNull();
  });

  it("N=9: 1 play-in match between seeds 8 and 9", () => {
    expect(planPlayIn(9)).toEqual({
      prevPow2: 8,
      excess: 1,
      directSeeds: 7,
      playInPairs: [[8, 9]],
    });
  });

  it("N=10: 2 play-in matches (7v10, 8v9)", () => {
    expect(planPlayIn(10)).toEqual({
      prevPow2: 8,
      excess: 2,
      directSeeds: 6,
      playInPairs: [[7, 10], [8, 9]],
    });
  });

  it("N=12: 4 play-in matches (5v12, 6v11, 7v10, 8v9)", () => {
    expect(planPlayIn(12)).toEqual({
      prevPow2: 8,
      excess: 4,
      directSeeds: 4,
      playInPairs: [[5, 12], [6, 11], [7, 10], [8, 9]],
    });
  });

  it("N=15: 7 play-in matches, only seed 1 enters main R1 directly", () => {
    expect(planPlayIn(15)).toEqual({
      prevPow2: 8,
      excess: 7,
      directSeeds: 1,
      playInPairs: [[2, 15], [3, 14], [4, 13], [5, 12], [6, 11], [7, 10], [8, 9]],
    });
  });

  it("N=17: prev jumps to 16, 1 play-in", () => {
    expect(planPlayIn(17)).toEqual({
      prevPow2: 16,
      excess: 1,
      directSeeds: 15,
      playInPairs: [[16, 17]],
    });
  });
});

describe("playInTargetSlot — which main-bracket slot each PI winner takes", () => {
  it("N=9: PI #1 → slot 8", () => {
    expect(playInTargetSlot(planPlayIn(9)!, 1)).toBe(8);
  });
  it("N=10: PI #1 → slot 7, PI #2 → slot 8", () => {
    const plan = planPlayIn(10)!;
    expect(playInTargetSlot(plan, 1)).toBe(7);
    expect(playInTargetSlot(plan, 2)).toBe(8);
  });
});

describe("seedBracket(N, 'single_elimination') with play-in — structural", () => {
  it("N=8 (power of 2): no play-in matches, standard 8-slot bracket", () => {
    const seeds = seedBracket(8, "single_elimination");
    expect(seeds.some(s => s.round === 0)).toBe(false);
    // 4 R1 + 2 R2 + 1 final = 7 matches
    expect(seeds.length).toBe(7);
  });

  it("N=9: 1 play-in match (round 0) + 4 R1 + 2 R2 + 1 final = 8 matches", () => {
    const seeds = seedBracket(9, "single_elimination");
    const r0 = seeds.filter(s => s.round === 0);
    const r1 = seeds.filter(s => s.round === 1 && s.side === "winners");
    const r2 = seeds.filter(s => s.round === 2 && s.side === "winners");
    const r3 = seeds.filter(s => s.round === 3 && s.side === "winners");

    expect(r0.length).toBe(1);  // play-in
    expect(r1.length).toBe(4);  // main R1, all "real"
    expect(r2.length).toBe(2);  // semifinals
    expect(r3.length).toBe(1);  // final
    expect(seeds.length).toBe(8);

    // Play-in match pairs seeds 8 and 9
    expect(r0[0]).toMatchObject({
      side: "winners",
      round: 0,
      matchNumber: 1,
      p1Seed: 8,
      p2Seed: 9,
      isBye: false,
    });
    // Play-in winner advances to main R1, slot 1 of one of the matches
    expect(r0[0].nextSide).toBe("winners");
    expect(r0[0].nextRound).toBe(1);
  });

  it("N=9: main R1 has NO byes — 4 real matches", () => {
    const seeds = seedBracket(9, "single_elimination");
    const r1 = seeds.filter(s => s.round === 1 && s.side === "winners");

    // No match in main R1 should be marked isBye
    expect(r1.every(s => !s.isBye)).toBe(true);

    // Each main R1 match has at least one slot ready (either a direct seed
    // or null waiting for the play-in winner). No match has both slots null.
    for (const m of r1) {
      const hasDirectOrPlayIn = (m.p1Seed !== null) || (m.p2Seed !== null);
      expect(hasDirectOrPlayIn).toBe(true);
    }
  });

  it("N=10: 2 play-in matches + 4 R1 + 2 R2 + 1 final = 9 matches", () => {
    const seeds = seedBracket(10, "single_elimination");
    expect(seeds.filter(s => s.round === 0).length).toBe(2);
    expect(seeds.filter(s => s.round === 1).length).toBe(4);
    expect(seeds.length).toBe(9);
  });

  it("N=12: 4 play-in + 4 R1 + 2 R2 + 1 final = 11 matches", () => {
    const seeds = seedBracket(12, "single_elimination");
    expect(seeds.filter(s => s.round === 0).length).toBe(4);
    expect(seeds.filter(s => s.round === 1).length).toBe(4);
    expect(seeds.length).toBe(11);
  });

  it("N=15: 7 play-in + 4 R1 + 2 R2 + 1 final = 14 matches (= N-1)", () => {
    const seeds = seedBracket(15, "single_elimination");
    expect(seeds.filter(s => s.round === 0).length).toBe(7);
    expect(seeds.filter(s => s.round === 1).length).toBe(4);
    expect(seeds.length).toBe(14);
  });

  it.each([3, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15])(
    "N=%d: total matches = N - 1 (single-elim invariant)",
    (n) => {
      const seeds = seedBracket(n, "single_elimination");
      expect(seeds.length).toBe(n - 1);
    },
  );
});

describe("seedBracket(N, 'single_elimination') with play-in — pointer wiring", () => {
  it("N=9: play-in's nextMatchNum points to a main R1 match", () => {
    const seeds = seedBracket(9, "single_elimination");
    const pi = seeds.find(s => s.round === 0)!;
    const r1 = seeds.filter(s => s.round === 1 && s.side === "winners");

    // Find the main R1 match the play-in feeds into
    const target = r1.find(m => m.matchNumber === pi.nextMatchNum);
    expect(target).toBeDefined();

    // The target match's other slot has a direct seed (1..7)
    const directSlot = pi.nextMatchSlot === 1 ? target!.p2Seed : target!.p1Seed;
    expect(directSlot).not.toBeNull();
    expect(directSlot! >= 1 && directSlot! <= 7).toBe(true);
  });

  it("N=10: both play-in winners feed into different main R1 matches", () => {
    const seeds = seedBracket(10, "single_elimination");
    const pi = seeds.filter(s => s.round === 0);
    const targets = pi.map(p => p.nextMatchNum!);
    expect(new Set(targets).size).toBe(targets.length); // all distinct
  });
});
