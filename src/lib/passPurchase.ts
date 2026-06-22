// Pure business logic for 1UP Pass payment methods (cash rollout — final service).
// Kept out of the route so the method gates are unit-testable without a DB —
// same approach as tokenPurchase.ts / courseEnrollment.ts / tournamentEntry.ts.
//
// Pass fulfillment = activate the pass (status → confirmed, window via
// computePassWindow, a DB trigger mirrors the confirmed order into `passes`).
// Cash does NOT change that — it only changes how the COP is collected. A `token`
// order is verified on-chain; a `bank` order carries a comprobante; a `cash`
// order is admin-attested (no upload), and the admin records the COP receipt in
// the unified ledger on approval. COP for a cash pass = price_token × 1.000.

// DB-level method values stored on pass_orders.payment_method (free text). The
// only CHECK is `payment_method='admin_grant' OR token_amount_paid > 0`. `token`
// is the on-chain $1UP send; `bank` is the wire transfer (relabeled "Banco" in
// the UI); `cash` reuses the manual-review (bank) path — selected by the user,
// attested/approved by an admin (no comprobante). `card` is Stripe Checkout
// (hosted) — confirmed by the Stripe webhook, never on-chain. `admin_grant` is
// admin-only, never user-selectable.
export type PassPaymentMethod = "token" | "bank" | "cash" | "card";

// Per-service toggles from service_payment_methods (service = 'pass'). Only
// `cash_enabled` / `card_enabled` gate anything user-facing here — token + bank
// are always on (the historical default). Default = today's live behavior
// (cash + card off) so callers without a config row are unaffected.
export type PassMethodFlags = {
  cash_enabled: boolean;
  card_enabled: boolean;
};

export const DEFAULT_PASS_METHOD_FLAGS: PassMethodFlags = {
  cash_enabled: false,
  card_enabled: false,
};

export type PassMethodOpts = {
  // card (Stripe Checkout) only appears when its service toggle is on AND the
  // PAYMENTS_CARD_LIVE kill-switch is on — design-only otherwise.
  cardLiveEnv?: boolean;
};

// True iff the 1UP Pass can be paid in cash right now: the admin's per-service
// cash toggle is on. The route enforces this server-side; the wizard mirrors it
// to show/hide the "Efectivo" option.
export function passCashAvailable(
  cfg: PassMethodFlags = DEFAULT_PASS_METHOD_FLAGS,
): boolean {
  return cfg.cash_enabled === true;
}

// True iff the 1UP Pass can be paid by card right now: the admin's per-service
// card toggle is on AND the PAYMENTS_CARD_LIVE env kill-switch is on. Mirrors
// passCashAvailable but with the extra env gate (card is invisible until flipped).
export function passCardAvailable(
  cfg: PassMethodFlags = DEFAULT_PASS_METHOD_FLAGS,
  opts: PassMethodOpts = {},
): boolean {
  return cfg.card_enabled === true && opts.cardLiveEnv === true;
}

export type PassMethodCheck =
  | { ok: true }
  | { ok: false; error: string; status: number; reason?: string };

// Gate for selecting a payment method when creating a pass order. `token` and
// `bank` are always allowed (historical defaults); `cash` requires the
// per-service toggle on; `card` requires the toggle AND the env kill-switch. Any
// other value (including admin_grant) is rejected — admin grants come through the
// admin POST, never the user path.
export function canSelectPassMethod(
  method: string,
  cfg: PassMethodFlags = DEFAULT_PASS_METHOD_FLAGS,
  opts: PassMethodOpts = {},
): PassMethodCheck {
  if (method === "token" || method === "bank") return { ok: true };
  if (method === "cash") {
    if (!passCashAvailable(cfg))
      return { ok: false, error: "El pago en efectivo no está disponible.", status: 400, reason: "method_unavailable" };
    return { ok: true };
  }
  if (method === "card") {
    if (!passCardAvailable(cfg, opts))
      return { ok: false, error: "El pago con tarjeta no está disponible.", status: 400, reason: "method_unavailable" };
    return { ok: true };
  }
  return { ok: false, error: "Método de pago inválido.", status: 400, reason: "method_unavailable" };
}
