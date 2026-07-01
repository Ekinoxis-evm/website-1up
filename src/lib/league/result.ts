// Pure helpers for recording a league match result. Kept out of the route so
// the score→outcome logic is unit-tested independently of Supabase.

export type ScoreValidation =
  | { ok: true; p1Score: number; p2Score: number }
  | { ok: false; error: string };

// Scores must be present, non-negative integers. A draw is allowed (equal
// scores); the winner is derived from the higher score.
export function validateLeagueScores(p1: unknown, p2: unknown): ScoreValidation {
  const n1 = Number(p1);
  const n2 = Number(p2);
  if (p1 == null || p2 == null || Number.isNaN(n1) || Number.isNaN(n2))
    return { ok: false, error: "Ambos marcadores son requeridos." };
  if (!Number.isInteger(n1) || !Number.isInteger(n2))
    return { ok: false, error: "Los marcadores deben ser números enteros." };
  if (n1 < 0 || n2 < 0)
    return { ok: false, error: "Los marcadores no pueden ser negativos." };
  return { ok: true, p1Score: n1, p2Score: n2 };
}

export type MatchOutcome = { winnerId: number | null; isDraw: boolean };

// Given the two participant ids and a validated scoreline, decide the winner.
// Equal scores → draw (winnerId null).
export function deriveMatchOutcome(
  p1Id: number, p2Id: number, p1Score: number, p2Score: number,
): MatchOutcome {
  if (p1Score === p2Score) return { winnerId: null, isDraw: true };
  return { winnerId: p1Score > p2Score ? p1Id : p2Id, isDraw: false };
}
