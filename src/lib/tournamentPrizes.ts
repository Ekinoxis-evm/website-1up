// Pure helpers for the tournament-prize editor payload. Kept out of the API
// route so the validator can be unit-tested without importing the Supabase
// client. Mirrors the `tournament_prizes` DB CHECK.

export type PrizeRow = {
  position:      number;
  prizeType:     string;
  amountTokens:  string;
  amountCop:     string;
  includesPass?: boolean;
  passDays?:     string | number;
};

// Fail-fast guard run before any DB write — mirrors the DB CHECK that requires
// pass_days > 0 whenever a prize includes a pass, so an invalid form never hits
// the constraint and bounces back as a raw 500. Returns an error message
// (Spanish, surfaced to the admin) or null when every row is valid.
export function validatePrizes(prizes: PrizeRow[] | undefined): string | null {
  if (!prizes?.length) return null;
  for (const p of prizes) {
    const includesPass = p.prizeType === "pass" || !!p.includesPass;
    if (!includesPass) continue;
    const days = p.passDays != null && p.passDays !== "" ? Number(p.passDays) : NaN;
    if (!Number.isFinite(days) || days <= 0) {
      return `La duración del Pase 1UP en la posición ${p.position} debe ser mayor a 0 días.`;
    }
  }
  return null;
}
