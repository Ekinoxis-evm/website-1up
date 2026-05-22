/**
 * Pure decision logic for the MercadoPago webhook. Extracted so it can be
 * unit-tested without spinning up Next.js or Supabase.
 *
 * Fixes audit finding C-3: the previous handler unconditionally updated the
 * enrollment on every delivery. MercadoPago retries webhooks — a late
 * `in_process` retry would flip an `approved` enrollment back to `pending`
 * and overwrite `paid_at`. Two guards prevent that:
 *
 *   1. **Idempotency** — once an enrollment is bound to an `mp_payment_id`,
 *      we ignore deliveries for any *other* payment id and short-circuit
 *      repeats for the same id+status.
 *   2. **Transition map** — terminal states (`approved`, `rejected`,
 *      `cancelled`) never regress to `pending`; only refund/chargeback
 *      (→ cancelled) is allowed out of `approved`.
 */

export type EnrollmentStatus = "approved" | "rejected" | "pending" | "cancelled";

// MercadoPago payment status → our internal enrollment status.
export const STATUS_MAP: Record<string, EnrollmentStatus> = {
  approved:       "approved",
  rejected:       "rejected",
  pending:        "pending",
  in_process:     "pending",
  cancelled:      "cancelled",
  refunded:       "cancelled",
  charged_back:   "cancelled",
};

export const ALLOWED_TRANSITIONS: Record<EnrollmentStatus, ReadonlySet<EnrollmentStatus>> = {
  pending:   new Set<EnrollmentStatus>(["approved", "rejected", "cancelled", "pending"]),
  approved:  new Set<EnrollmentStatus>(["cancelled", "approved"]),
  rejected:  new Set<EnrollmentStatus>(["rejected"]),
  cancelled: new Set<EnrollmentStatus>(["cancelled"]),
};

export type WebhookDecision =
  | { kind: "ignore_other_payment" }   // enrollment is already bound to a different mp_payment_id
  | { kind: "dedupe" }                 // same payment id + same target status — no-op
  | { kind: "ignore_regression" }      // transition not allowed (e.g. approved → pending)
  | { kind: "update"; stampPaidAt: boolean };

export function decideWebhookAction(
  current: { payment_status: EnrollmentStatus | null; mp_payment_id: string | null; paid_at: string | null },
  incoming: { paymentId: string; mpStatus: string },
): WebhookDecision {
  const newStatus: EnrollmentStatus = STATUS_MAP[incoming.mpStatus] ?? "pending";

  if (current.mp_payment_id && current.mp_payment_id !== incoming.paymentId) {
    return { kind: "ignore_other_payment" };
  }
  if (current.mp_payment_id === incoming.paymentId && current.payment_status === newStatus) {
    return { kind: "dedupe" };
  }

  const currentStatus = (current.payment_status ?? "pending") as EnrollmentStatus;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? new Set<EnrollmentStatus>();
  if (!allowed.has(newStatus)) {
    return { kind: "ignore_regression" };
  }

  return {
    kind: "update",
    stampPaidAt: newStatus === "approved" && !current.paid_at,
  };
}
