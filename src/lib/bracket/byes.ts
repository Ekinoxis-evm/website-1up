// Returns the smallest power-of-2 >= n
export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

// Standard single-elimination seed pairings for a bracket of size `slots`.
// Returns an array of [topSeed, bottomSeed | null] pairs (null = bye).
// Seeds are 1-indexed. Top seed is always highest-ranked (lowest seed number).
export function buildPairings(slots: number): [number, number | null][] {
  // Build the ordered position array using the standard alternating fill
  const positions: number[] = new Array(slots).fill(0);
  positions[0] = 1;
  let filled = 1;
  let step = slots;
  while (filled < slots) {
    step = step >> 1;
    for (let i = step - 1; i < slots; i += step * 2) {
      positions[i] = ++filled;
    }
  }

  // Group into pairs
  const pairs: [number, number | null][] = [];
  for (let i = 0; i < slots; i += 2) {
    pairs.push([positions[i], positions[i + 1] ?? null]);
  }
  return pairs;
}

// Distribute byes so top seeds don't have to play R1.
// Returns pairs where the second element is null when it's a bye.
export function distributeByes(
  participantCount: number,
): [number, number | null][] {
  const slots = nextPow2(participantCount);
  const rawPairs = buildPairings(slots);
  // Mark seeds > participantCount as byes
  return rawPairs.map(([a, b]) => [
    a,
    b === null || b > participantCount ? null : b,
  ]);
}
