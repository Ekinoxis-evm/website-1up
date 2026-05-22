import { describe, it, expect } from "vitest";
import { decideWebhookAction } from "@/lib/mpWebhookDecision";

describe("decideWebhookAction — MercadoPago webhook idempotency + transition guard (C-3)", () => {
  it("pending + approved payment → update + stamp paid_at", () => {
    const decision = decideWebhookAction(
      { payment_status: "pending", mp_payment_id: null, paid_at: null },
      { paymentId: "p1", mpStatus: "approved" },
    );
    expect(decision.kind).toBe("update");
    expect(decision.kind === "update" && decision.stampPaidAt).toBe(true);
  });

  it("pending + in_process payment → maps to pending, allowed self-transition", () => {
    const decision = decideWebhookAction(
      { payment_status: "pending", mp_payment_id: null, paid_at: null },
      { paymentId: "p1", mpStatus: "in_process" },
    );
    expect(decision.kind).toBe("update");
  });

  it("approved + late in_process retry → never regress to pending", () => {
    const decision = decideWebhookAction(
      { payment_status: "approved", mp_payment_id: "p1", paid_at: "2026-01-01T00:00:00Z" },
      { paymentId: "p1", mpStatus: "in_process" },
    );
    expect(decision.kind).toBe("ignore_regression");
  });

  it("approved + same payment + same approved status → dedupe (no-op)", () => {
    const decision = decideWebhookAction(
      { payment_status: "approved", mp_payment_id: "p1", paid_at: "2026-01-01T00:00:00Z" },
      { paymentId: "p1", mpStatus: "approved" },
    );
    expect(decision.kind).toBe("dedupe");
  });

  it("approved → refunded → maps to cancelled (allowed terminal exit)", () => {
    const decision = decideWebhookAction(
      { payment_status: "approved", mp_payment_id: "p1", paid_at: "2026-01-01T00:00:00Z" },
      { paymentId: "p1", mpStatus: "refunded" },
    );
    expect(decision.kind).toBe("update");
    expect(decision.kind === "update" && decision.stampPaidAt).toBe(false);
  });

  it("enrollment already bound to a different payment id → ignore", () => {
    const decision = decideWebhookAction(
      { payment_status: "approved", mp_payment_id: "p_original", paid_at: "2026-01-01T00:00:00Z" },
      { paymentId: "p_attacker", mpStatus: "approved" },
    );
    expect(decision.kind).toBe("ignore_other_payment");
  });

  it("rejected is terminal — does not move to pending", () => {
    const decision = decideWebhookAction(
      { payment_status: "rejected", mp_payment_id: "p1", paid_at: null },
      { paymentId: "p1", mpStatus: "pending" },
    );
    expect(decision.kind).toBe("ignore_regression");
  });

  it("cancelled is terminal — does not move to approved", () => {
    const decision = decideWebhookAction(
      { payment_status: "cancelled", mp_payment_id: "p1", paid_at: null },
      { paymentId: "p1", mpStatus: "approved" },
    );
    expect(decision.kind).toBe("ignore_regression");
  });

  it("approved + new approved delivery → does not re-stamp paid_at", () => {
    const existingPaidAt = "2026-01-01T00:00:00Z";
    const decision = decideWebhookAction(
      { payment_status: "pending", mp_payment_id: "p1", paid_at: existingPaidAt },
      { paymentId: "p1", mpStatus: "approved" },
    );
    expect(decision.kind).toBe("update");
    expect(decision.kind === "update" && decision.stampPaidAt).toBe(false);
  });

  it("null payment_status (legacy row) treated as pending", () => {
    const decision = decideWebhookAction(
      { payment_status: null, mp_payment_id: null, paid_at: null },
      { paymentId: "p1", mpStatus: "approved" },
    );
    expect(decision.kind).toBe("update");
  });

  it("unknown MP status defaults to pending — pending → pending allowed (no-op-ish)", () => {
    const decision = decideWebhookAction(
      { payment_status: "pending", mp_payment_id: null, paid_at: null },
      { paymentId: "p1", mpStatus: "weird_unknown_status" },
    );
    expect(decision.kind).toBe("update");
  });
});
