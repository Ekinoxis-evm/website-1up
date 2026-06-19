// Pure decision for the Stripe webhook (v2.47.0). v1 only acts on a completed,
// PAID Checkout Session and resolves the order from its metadata. Idempotency is
// enforced downstream by apply_payment_event (single-confirmed invariant +
// stripe_payment_intent_id UNIQUE index), mirroring mpWebhookDecision. Kept pure
// so the branch logic is unit-testable without the Stripe SDK.

import { isOrderKind, type OrderKind } from "./orderKind";

export type StripeFulfillDecision =
  | { fulfill: true; orderKind: OrderKind; orderId: number; paymentIntentId: string }
  | { fulfill: false; reason: string };

export function decideStripeCheckout(input: {
  type: string;
  paymentStatus: string | null;
  orderKind: string | null | undefined;
  orderId: string | null | undefined;
  paymentIntentId: string | null;
}): StripeFulfillDecision {
  if (input.type !== "checkout.session.completed") return { fulfill: false, reason: "ignored_event" };
  if (input.paymentStatus !== "paid") return { fulfill: false, reason: "not_paid" };
  if (!isOrderKind(input.orderKind)) return { fulfill: false, reason: "bad_order_kind" };
  if (!input.paymentIntentId) return { fulfill: false, reason: "no_payment_intent" };
  const orderId = Number(input.orderId);
  if (!Number.isInteger(orderId) || orderId <= 0) return { fulfill: false, reason: "bad_order_id" };
  return { fulfill: true, orderKind: input.orderKind, orderId, paymentIntentId: input.paymentIntentId };
}
