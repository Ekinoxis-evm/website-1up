// Returns the smallest power-of-2 >= n
export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

// Standard tournament-seeding positions for a bracket of `slots` size,
// built by mirror-recursive doubling.
//
//   size 2  →  [1, 2]
//   size 4  →  [1, 4, 2, 3]
//   size 8  →  [1, 8, 4, 5, 2, 7, 3, 6]
//   size 16 →  [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]
//
// Property: at every round, the top half plays the bottom half, and if every
// match goes to the higher seed the final is always seed 1 vs seed 2.
//
// The earlier "alternating-step" implementation produced broken arrays
// (seed 1 was overwritten and the last slot stayed 0 for slots ≥ 16) — see
// the bracket-seeding bug fixed in v2.36.10.
export function buildPairings(slots: number): [number, number | null][] {
  if (slots < 2) return [];
  let positions: number[] = [1, 2];
  while (positions.length < slots) {
    const nextSize = positions.length * 2;
    positions = positions.flatMap(v => [v, nextSize + 1 - v]);
  }

  const pairs: [number, number | null][] = [];
  for (let i = 0; i < slots; i += 2) {
    pairs.push([positions[i], positions[i + 1] ?? null]);
  }
  return pairs;
}

// Distribute byes so top seeds don't have to play R1. Returns pairs where
// any seed > participantCount is replaced with null (treated as a BYE) on
// BOTH slots. Seed 1 vs seed 16, with N=9, becomes (1, null) — i.e. seed 1
// auto-advances. The earlier implementation only nulled the second slot,
// so pairings like (10, 3) were kept as "pending" with one null slot
// instead of being treated as the BYE they actually represent.
export function distributeByes(
  participantCount: number,
): [number, number | null][] {
  const slots = nextPow2(participantCount);
  const raw   = buildPairings(slots);
  return raw.map(([a, b]) => [
    a === null || a > participantCount ? null : a,
    b === null || b > participantCount ? null : b,
  ]) as [number, number | null][];
}
