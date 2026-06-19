import { describe, it, expect } from "vitest";
import { decideStripeCheckout } from "@/lib/payments/stripeWebhookDecision";

const ok = {
  type: "checkout.session.completed",
  paymentStatus: "paid",
  orderKind: "tournament_entry",
  orderId: "42",
  paymentIntentId: "pi_123",
};

describe("decideStripeCheckout", () => {
  it("fulfills a completed, paid session with valid metadata", () => {
    expect(decideStripeCheckout(ok)).toEqual({
      fulfill: true, orderKind: "tournament_entry", orderId: 42, paymentIntentId: "pi_123",
    });
  });

  it("ignores non-checkout events", () => {
    expect(decideStripeCheckout({ ...ok, type: "payment_intent.created" }))
      .toEqual({ fulfill: false, reason: "ignored_event" });
  });

  it("ignores an unpaid session (async/processing)", () => {
    expect(decideStripeCheckout({ ...ok, paymentStatus: "unpaid" }))
      .toEqual({ fulfill: false, reason: "not_paid" });
  });

  it("rejects an unknown / missing order_kind", () => {
    expect(decideStripeCheckout({ ...ok, orderKind: "marketplace" }).fulfill).toBe(false);
    expect(decideStripeCheckout({ ...ok, orderKind: null }).fulfill).toBe(false);
  });

  it("rejects a missing payment intent", () => {
    expect(decideStripeCheckout({ ...ok, paymentIntentId: null }))
      .toEqual({ fulfill: false, reason: "no_payment_intent" });
  });

  it("rejects a bad order id", () => {
    expect(decideStripeCheckout({ ...ok, orderId: "abc" }).fulfill).toBe(false);
    expect(decideStripeCheckout({ ...ok, orderId: "0" }).fulfill).toBe(false);
    expect(decideStripeCheckout({ ...ok, orderId: null }).fulfill).toBe(false);
  });
});
