// Shared bracket domain types used across lib, API, and components

export type BracketSide = "winners" | "losers" | "grand_final" | "gf_reset";

export interface MatchNode {
  round:        number;
  matchNumber:  number;
  side:         BracketSide;
  p1Seed:       number | null;   // null = TBD
  p2Seed:       number | null;
  // wired after generation
  nextMatchNum:      number | null;
  nextMatchSlot:     1 | 2 | null;
  nextLoserMatchNum: number | null;
  nextLoserSlot:     1 | 2 | null;
  isBye:        boolean;
}

export interface GeneratedBracket {
  format:         "single_elimination" | "double_elimination";
  participantCount: number;
  roundsWinners:  number;
  roundsLosers:   number;
  matches:        MatchNode[];
}

// Layout constants shared between server layout calc and client SVG
export const MATCH_W   = 220;
export const MATCH_H   = 72;
export const COL_GAP   = 80;
export const ROW_GAP   = 16;
export const ROUND_LABEL_H = 32;
