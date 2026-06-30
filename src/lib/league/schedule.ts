// Round-robin fixture generation (circle method). Pure — no DB, no Supabase
// client — so it can be unit-tested against any N.
//
// Single round-robin: every participant plays every other exactly once.
//   • Even N  → N-1 rounds, N/2 matches each.
//   • Odd  N  → N   rounds, (N-1)/2 matches each (one participant rests per round).
//
// The circle method fixes participant 1 and rotates the rest; for odd N we add a
// phantom "BYE" seat (seed 0) — any pairing against it is simply skipped (that
// participant rests that round), which is why odd N yields one fewer match/round.

export type Fixture = {
  round:       number;  // 1-based
  matchNumber: number;  // 1-based within the round
  p1Seed:      number;  // 1-based seed (index into the participant list + 1)
  p2Seed:      number;
};

export function generateRoundRobin(n: number): Fixture[] {
  if (n < 2) return [];

  // Work on a list of seeds; pad with a phantom (0) when odd so the circle has
  // an even count. The phantom represents "rest this round".
  const seeds: number[] = Array.from({ length: n }, (_, i) => i + 1);
  const PHANTOM = 0;
  if (seeds.length % 2 !== 0) seeds.push(PHANTOM);

  const m      = seeds.length;        // even
  const rounds = m - 1;
  const half   = m / 2;

  // Fixed pivot = seeds[0]; the rest rotate clockwise each round.
  const rotating = seeds.slice(1);
  const fixtures: Fixture[] = [];

  for (let r = 0; r < rounds; r++) {
    const roundSeeds = [seeds[0], ...rotating];
    let matchNumber  = 1;

    for (let i = 0; i < half; i++) {
      const a = roundSeeds[i];
      const b = roundSeeds[m - 1 - i];
      if (a === PHANTOM || b === PHANTOM) continue; // that participant rests

      // Alternate home/away by round so seeds aren't always p1 — keeps the
      // schedule balanced if scores/sides ever matter.
      const [p1, p2] = r % 2 === 0 ? [a, b] : [b, a];
      fixtures.push({ round: r + 1, matchNumber: matchNumber++, p1Seed: p1, p2Seed: p2 });
    }

    // Rotate: last element moves to the front of the rotating list.
    rotating.unshift(rotating.pop()!);
  }

  return fixtures;
}

// Total matches in a single round-robin of N = N*(N-1)/2. Useful for asserting
// completeness and sizing the calendar UI.
export function totalRoundRobinMatches(n: number): number {
  return n < 2 ? 0 : (n * (n - 1)) / 2;
}

// Number of rounds in a single round-robin of N (even → N-1, odd → N).
export function roundRobinRounds(n: number): number {
  if (n < 2) return 0;
  return n % 2 === 0 ? n - 1 : n;
}
