/**
 * Mirror of the `pass_orders_token_amount_paid_check` CHECK constraint
 * (see `supabase/migrations/20260526131000_pass_orders_allow_zero_token_amount_for_admin_grant.sql`).
 *
 * Keep this predicate in sync with the DB CHECK. The constraint exists because
 * admin grants legitimately have `token_amount_paid = 0` (no payment changed
 * hands), while real purchases (token / bank) must record a positive amount.
 *
 * Used by the admin pass-orders route as a fail-fast guard so the operator gets
 * a clear 400 instead of an opaque 500 if the predicate is ever violated by
 * future refactors.
 */
export type PassOrderPaymentMethod = "token" | "bank" | "admin_grant";

export function isValidPassOrderAmount(
  paymentMethod: PassOrderPaymentMethod,
  tokenAmountPaid: number,
): boolean {
  if (paymentMethod === "admin_grant") return tokenAmountPaid >= 0;
  return tokenAmountPaid > 0;
}
