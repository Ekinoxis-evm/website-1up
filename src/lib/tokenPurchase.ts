// Pure business logic for $1UP token-purchase payment methods (cash rollout).
// Kept out of the route so the method gates are unit-testable without a DB —
// same approach as courseEnrollment.ts / tournamentEntry.ts.
//
// $1UP purchases are special: fulfillment is ALWAYS an admin on-chain $1UP send
// (verified via verifyTokenTransfer + approved_tx_hash). Cash does NOT change
// that — it only changes how the COP is collected. A `bank` order carries a
// comprobante; a `cash` order is admin-attested (no upload), and the admin
// records the COP receipt in the unified ledger on approval.

// DB-level method values stored on token_purchase_orders.payment_method.
// CHECK constraint allows only 'bank' | 'cash'. `bank` is the wire transfer
// (legacy default, relabeled "Transferencia" in the UI); `cash` is in-person.
export type TokenPurchaseMethod = "bank" | "cash";

// Per-service toggle from service_payment_methods (service = 'token_purchase').
// Only `cash_enabled` gates anything user-facing here — bank is always on (the
// historical default). Default = today's live behavior (cash off) so callers
// without a config row are unaffected.
export type TokenPurchaseMethodFlags = {
  cash_enabled: boolean;
};

export const DEFAULT_TOKEN_PURCHASE_METHOD_FLAGS: TokenPurchaseMethodFlags = {
  cash_enabled: false,
};

// True iff $1UP can be paid in cash right now: the admin's per-service cash
// toggle is on. The route enforces this server-side; the wizard mirrors it to
// show/hide the "Efectivo" option.
export function tokenPurchaseCashAvailable(
  cfg: TokenPurchaseMethodFlags = DEFAULT_TOKEN_PURCHASE_METHOD_FLAGS,
): boolean {
  return cfg.cash_enabled === true;
}

export type TokenPurchaseMethodCheck =
  | { ok: true }
  | { ok: false; error: string; status: number; reason?: string };

// Gate for selecting a payment method when creating a token-purchase order.
// `bank` is always allowed; `cash` requires the per-service toggle on. Any other
// value is rejected.
export function canSelectTokenMethod(
  method: string,
  cfg: TokenPurchaseMethodFlags = DEFAULT_TOKEN_PURCHASE_METHOD_FLAGS,
): TokenPurchaseMethodCheck {
  if (method === "bank") return { ok: true };
  if (method === "cash") {
    if (!tokenPurchaseCashAvailable(cfg))
      return { ok: false, error: "El pago en efectivo no está disponible.", status: 400, reason: "method_unavailable" };
    return { ok: true };
  }
  return { ok: false, error: "Método de pago inválido (bank o cash).", status: 400, reason: "method_unavailable" };
}
