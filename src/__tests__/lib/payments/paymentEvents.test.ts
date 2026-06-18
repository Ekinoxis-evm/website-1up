import { describe, it, expect } from "vitest";
import {
  methodUnit,
  validateEventAmount,
  validateCashEvent,
  canTransition,
  type PaymentEventStatus,
} from "@/lib/payments/paymentEvents";

describe("paymentEvents — methodUnit", () => {
  it("maps each method to its settlement unit", () => {
    expect(methodUnit("token")).toBe("tokens");
    expect(methodUnit("wire")).toBe("cop");
    expect(methodUnit("cash")).toBe("cop");
    expect(methodUnit("card")).toBe("cop");
  });
});

describe("paymentEvents — validateEventAmount (mirrors DB CHECKs)", () => {
  it("accepts a positive token amount for a token event", () => {
    expect(validateEventAmount("token", { amountCop: null, amountTokens: 50 })).toEqual({ ok: true });
  });

  it("accepts a positive integer COP amount for wire/cash/card", () => {
    expect(validateEventAmount("wire", { amountCop: 50000, amountTokens: null })).toEqual({ ok: true });
    expect(validateEventAmount("cash", { amountCop: 1000, amountTokens: null })).toEqual({ ok: true });
    expect(validateEventAmount("card", { amountCop: 25000, amountTokens: null })).toEqual({ ok: true });
  });

  it("rejects an event with both units set", () => {
    const r = validateEventAmount("token", { amountCop: 1000, amountTokens: 50 });
    expect(r.ok).toBe(false);
  });

  it("rejects an event with neither unit set", () => {
    const r = validateEventAmount("wire", { amountCop: null, amountTokens: null });
    expect(r.ok).toBe(false);
  });

  it("rejects a token event expressed in COP (wrong unit)", () => {
    const r = validateEventAmount("token", { amountCop: 50000, amountTokens: null });
    expect(r.ok).toBe(false);
  });

  it("rejects a wire event expressed in tokens (wrong unit)", () => {
    const r = validateEventAmount("wire", { amountCop: null, amountTokens: 50 });
    expect(r.ok).toBe(false);
  });

  it("rejects zero and negative amounts", () => {
    expect(validateEventAmount("token", { amountCop: null, amountTokens: 0 }).ok).toBe(false);
    expect(validateEventAmount("wire", { amountCop: -1, amountTokens: null }).ok).toBe(false);
  });

  it("rejects a non-integer COP amount", () => {
    expect(validateEventAmount("wire", { amountCop: 1000.5, amountTokens: null }).ok).toBe(false);
  });

  it("allows a fractional token amount", () => {
    expect(validateEventAmount("token", { amountCop: null, amountTokens: 12.5 })).toEqual({ ok: true });
  });
});

describe("paymentEvents — validateCashEvent (admin-attested)", () => {
  it("requires both the admin and a reason", () => {
    expect(validateCashEvent({ recordedByAdmin: "admin@1up.gg", reason: "Pago en taquilla" })).toEqual({ ok: true });
  });

  it("rejects a cash event with no admin", () => {
    expect(validateCashEvent({ recordedByAdmin: "", reason: "x" }).ok).toBe(false);
    expect(validateCashEvent({ recordedByAdmin: null, reason: "x" }).ok).toBe(false);
  });

  it("rejects a cash event with no reason", () => {
    expect(validateCashEvent({ recordedByAdmin: "admin@1up.gg", reason: "  " }).ok).toBe(false);
    expect(validateCashEvent({ recordedByAdmin: "admin@1up.gg", reason: null }).ok).toBe(false);
  });
});

describe("paymentEvents — canTransition (append-only state machine)", () => {
  it("allows pending → confirmed | rejected | cancelled", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("pending", "rejected")).toBe(true);
    expect(canTransition("pending", "cancelled")).toBe(true);
  });

  it("treats confirmed and rejected as terminal (no mutation, void via new row)", () => {
    expect(canTransition("confirmed", "cancelled")).toBe(false);
    expect(canTransition("confirmed", "rejected")).toBe(false);
    expect(canTransition("rejected", "confirmed")).toBe(false);
    expect(canTransition("cancelled", "confirmed")).toBe(false);
  });

  it("rejects a no-op transition", () => {
    const states: PaymentEventStatus[] = ["pending", "confirmed", "rejected", "cancelled"];
    for (const s of states) expect(canTransition(s, s)).toBe(false);
  });
});
