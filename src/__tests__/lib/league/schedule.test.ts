import { describe, it, expect } from "vitest";
import {
  generateRoundRobin,
  totalRoundRobinMatches,
  roundRobinRounds,
  type Fixture,
} from "@/lib/league/schedule";

function pairKey(f: Fixture): string {
  return [f.p1Seed, f.p2Seed].sort((a, b) => a - b).join("-");
}

describe("generateRoundRobin", () => {
  it("returns nothing for n < 2", () => {
    expect(generateRoundRobin(0)).toEqual([]);
    expect(generateRoundRobin(1)).toEqual([]);
  });

  it("n=2 → a single match", () => {
    const f = generateRoundRobin(2);
    expect(f).toHaveLength(1);
    expect(pairKey(f[0])).toBe("1-2");
    expect(f[0].round).toBe(1);
  });

  for (const n of [2, 3, 4, 5, 6, 7, 8]) {
    it(`n=${n}: every pair meets exactly once`, () => {
      const fixtures = generateRoundRobin(n);

      // Correct total match count
      expect(fixtures).toHaveLength(totalRoundRobinMatches(n));

      // Every unordered pair appears exactly once
      const seen = new Map<string, number>();
      for (const f of fixtures) {
        expect(f.p1Seed).not.toBe(f.p2Seed);
        expect(f.p1Seed).toBeGreaterThanOrEqual(1);
        expect(f.p2Seed).toBeLessThanOrEqual(n);
        const k = pairKey(f);
        seen.set(k, (seen.get(k) ?? 0) + 1);
      }
      const expectedPairs = (n * (n - 1)) / 2;
      expect(seen.size).toBe(expectedPairs);
      for (const count of seen.values()) expect(count).toBe(1);
    });

    it(`n=${n}: correct round count and per-round uniqueness`, () => {
      const fixtures = generateRoundRobin(n);
      const rounds = new Map<number, Fixture[]>();
      for (const f of fixtures) {
        if (!rounds.has(f.round)) rounds.set(f.round, []);
        rounds.get(f.round)!.push(f);
      }

      expect(rounds.size).toBe(roundRobinRounds(n));

      // Within a round no participant plays twice
      for (const roundFixtures of rounds.values()) {
        const players = new Set<number>();
        for (const f of roundFixtures) {
          expect(players.has(f.p1Seed)).toBe(false);
          expect(players.has(f.p2Seed)).toBe(false);
          players.add(f.p1Seed);
          players.add(f.p2Seed);
        }
        // Even n → every player plays each round; odd n → exactly one rests
        const expectedPlaying = n % 2 === 0 ? n : n - 1;
        expect(players.size).toBe(expectedPlaying);
      }
    });
  }

  it("odd n: each participant rests exactly once across the season", () => {
    const n = 5;
    const fixtures = generateRoundRobin(n);
    const rounds = new Set(fixtures.map(f => f.round));
    // For each participant count how many rounds they appear in; should be n-1
    for (let seed = 1; seed <= n; seed++) {
      const played = fixtures.filter(f => f.p1Seed === seed || f.p2Seed === seed).length;
      expect(played).toBe(n - 1); // plays everyone else once
    }
    expect(rounds.size).toBe(n); // n rounds, resting once each
  });
});
