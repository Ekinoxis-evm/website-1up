// Pure validators for the payment_events ledger (v2.42.0). These mirror the DB
// CHECK constraints and the apply_payment_event RPC's invariants so the routes
// can fail early with a Spanish message before touching the DB, and so the
// rules are unit-testable without a database — same approach as tournamentEntry.ts.

import { METHOD_META, type PaymentMethod } from "./methodRegistry";

export type PaymentEventStatus = "pending" | "confirmed" | "rejected" | "cancelled";

export function methodUnit(m: PaymentMethod) {
  return METHOD_META[m].unit;
}

export type AmountInput = { amountCop: number | null; amountTokens: number | null };

export type EventCheck = { ok: true } | { ok: false; error: string };

// Mirrors payment_events_one_unit + payment_events_amount_positive, plus the
// per-method unit: a token event carries amount_tokens; wire/cash/card carry
// amount_cop. Exactly one, positive, COP integer.
export function validateEventAmount(method: PaymentMethod, a: AmountInput): EventCheck {
  const unit = methodUnit(method);
  const hasCop = a.amountCop != null;
  const hasTokens = a.amountTokens != null;
  if (hasCop === hasTokens) return { ok: false, error: "El evento debe tener exactamente un monto (COP o $1UP)." };
  if (unit === "tokens" && !hasTokens) return { ok: false, error: "Un pago en $1UP debe expresarse en tokens." };
  if (unit === "cop" && !hasCop) return { ok: false, error: "Este método de pago debe expresarse en COP." };
  const amount = (hasCop ? a.amountCop : a.amountTokens) as number;
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "El monto debe ser mayor a 0." };
  if (unit === "cop" && !Number.isInteger(amount)) return { ok: false, error: "El monto en COP debe ser un entero." };
  return { ok: true };
}

export type CashInput = { recordedByAdmin?: string | null; reason?: string | null };

// Mirrors payment_events_cash_audited: a cash event must name the admin who took
// the payment and a reason — it is an admin-attested payment with no external proof.
export function validateCashEvent(a: CashInput): EventCheck {
  if (!a.recordedByAdmin || !a.recordedByAdmin.trim()) return { ok: false, error: "Registra qué administrador recibió el efectivo." };
  if (!a.reason || !a.reason.trim()) return { ok: false, error: "Indica el motivo o nota del pago en efectivo." };
  return { ok: true };
}

// Allowed event-status transitions in v1. pending is the only non-terminal
// state; confirmed/rejected are terminal (append-only). A mistaken cash entry is
// voided by inserting a compensating `cancelled` event, never by mutating the
// confirmed row — so `confirmed` has no outgoing transition here.
const ALLOWED: Record<PaymentEventStatus, PaymentEventStatus[]> = {
  pending: ["confirmed", "rejected", "cancelled"],
  confirmed: [],
  rejected: [],
  cancelled: [],
};

export function canTransition(from: PaymentEventStatus, to: PaymentEventStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}
