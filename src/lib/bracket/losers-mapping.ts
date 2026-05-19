// LOSERS_ROUTING — routing table for wireLosersPointers() in generate.ts
// Keyed by bracket slot-size (must be power of 2).
//
// matchesPerRound[i] = number of matches in losers round (i+1)
// dropInRound[i]     = which losers round receives the loser from winners round (i+1)
// dropInSlot[i]      = which slot (1 or 2) the dropped winner takes in that losers round

export const LOSERS_ROUTING: Record<
  number,
  {
    matchesPerRound: number[];
    dropInRound: number[];
    dropInSlot: (1 | 2)[];
  }
> = {
  4: {
    matchesPerRound: [1, 1],
    dropInRound: [1],
    dropInSlot: [1],
  },
  8: {
    matchesPerRound: [4, 2, 1, 1],
    dropInRound: [1, 2, 4],
    dropInSlot: [1, 2, 2],
  },
  16: {
    matchesPerRound: [8, 4, 2, 2, 1, 1],
    dropInRound: [1, 2, 4, 6],
    dropInSlot: [1, 2, 2, 2],
  },
  32: {
    matchesPerRound: [16, 8, 4, 4, 2, 2, 1, 1],
    dropInRound: [1, 2, 4, 6, 8],
    dropInSlot: [1, 2, 2, 2, 2],
  },
  64: {
    matchesPerRound: [32, 16, 8, 8, 4, 4, 2, 2, 1, 1],
    dropInRound: [1, 2, 4, 6, 8, 10],
    dropInSlot: [1, 2, 2, 2, 2, 2],
  },
};
