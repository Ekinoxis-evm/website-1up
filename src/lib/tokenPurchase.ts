// Pure business logic for $1UP token-purchase payment methods (cash + card rollout).
// Kept out of the route so the method gates are unit-testable without a DB —
// same approach as courseEnrollment.ts / tournamentEntry.ts.
//
// $1UP purchases are special: fulfillment is ALWAYS an admin on-chain $1UP send
// (verified via verifyTokenTransfer + approved_tx_hash). NEITHER cash NOR card
// changes that — they only change how the COP is collected. A `bank` order carries
// a comprobante; a `cash` order is admin-attested (no upload); a `card` order is a
// Stripe Checkout charge whose webhook records the COP receipt — but the order STILL
// lands pending and an admin sends the $1UP on-chain. Card does NOT auto-deliver.

// DB-level method values stored on token_purchase_orders.payment_method.
// CHECK constraint allows 'bank' | 'cash' | 'card'. `bank` is the wire transfer
// (legacy default, relabeled "Transferencia" in the UI); `cash` is in-person;
// `card` is Stripe Checkout (hosted).
export type TokenPurchaseMethod = "bank" | "cash" | "card";

// Per-service toggle from service_payment_methods (service = 'token_purchase').
// `cash_enabled` / `card_enabled` gate the optional methods; bank is always on
// (the historical default). Default = today's live behavior (cash + card off) so
// callers without a config row are unaffected.
export type TokenPurchaseMethodFlags = {
  cash_enabled: boolean;
  card_enabled: boolean;
};

export const DEFAULT_TOKEN_PURCHASE_METHOD_FLAGS: TokenPurchaseMethodFlags = {
  cash_enabled: false,
  card_enabled: false,
};

// card (Stripe Checkout) only appears when its service toggle is on AND the
// PAYMENTS_CARD_LIVE kill-switch is on (passed in as cardLiveEnv) — design-only
// otherwise.
export type TokenPurchaseMethodOpts = {
  cardLiveEnv?: boolean;
};

// True iff $1UP can be paid in cash right now: the admin's per-service cash
// toggle is on. The route enforces this server-side; the wizard mirrors it to
// show/hide the "Efectivo" option.
export function tokenPurchaseCashAvailable(
  cfg: TokenPurchaseMethodFlags = DEFAULT_TOKEN_PURCHASE_METHOD_FLAGS,
): boolean {
  return cfg.cash_enabled === true;
}

// True iff $1UP can be paid by card right now: BOTH the per-service card toggle
// and the live-env kill-switch are on. Mirrored client-side to show/hide
// "Tarjeta"; enforced server-side in the route.
export function tokenPurchaseCardAvailable(
  cfg: TokenPurchaseMethodFlags = DEFAULT_TOKEN_PURCHASE_METHOD_FLAGS,
  opts: TokenPurchaseMethodOpts = {},
): boolean {
  return cfg.card_enabled === true && opts.cardLiveEnv === true;
}

export type TokenPurchaseMethodCheck =
  | { ok: true }
  | { ok: false; error: string; status: number; reason?: string };

// Gate for selecting a payment method when creating a token-purchase order.
// `bank` is always allowed; `cash` requires the per-service toggle on; `card`
// requires both the toggle and the live-env flag. Any other value is rejected.
export function canSelectTokenMethod(
  method: string,
  cfg: TokenPurchaseMethodFlags = DEFAULT_TOKEN_PURCHASE_METHOD_FLAGS,
  opts: TokenPurchaseMethodOpts = {},
): TokenPurchaseMethodCheck {
  if (method === "bank") return { ok: true };
  if (method === "cash") {
    if (!tokenPurchaseCashAvailable(cfg))
      return { ok: false, error: "El pago en efectivo no está disponible.", status: 400, reason: "method_unavailable" };
    return { ok: true };
  }
  if (method === "card") {
    if (!tokenPurchaseCardAvailable(cfg, opts))
      return { ok: false, error: "El pago con tarjeta no está disponible.", status: 400, reason: "method_unavailable" };
    return { ok: true };
  }
  return { ok: false, error: "Método de pago inválido (bank, cash o card).", status: 400, reason: "method_unavailable" };
}
