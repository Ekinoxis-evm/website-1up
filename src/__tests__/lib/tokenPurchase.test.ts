import { describe, it, expect } from "vitest";
import {
  tokenPurchaseCashAvailable,
  canSelectTokenMethod,
  DEFAULT_TOKEN_PURCHASE_METHOD_FLAGS,
  type TokenPurchaseMethodFlags,
} from "@/lib/tokenPurchase";

const flags = (o: Partial<TokenPurchaseMethodFlags> = {}): TokenPurchaseMethodFlags => ({
  ...DEFAULT_TOKEN_PURCHASE_METHOD_FLAGS,
  ...o,
});

describe("tokenPurchaseCashAvailable — gated by the per-service cash toggle", () => {
  it("is false by default (cash off, today's live behavior)", () => {
    expect(tokenPurchaseCashAvailable()).toBe(false);
    expect(tokenPurchaseCashAvailable(flags())).toBe(false);
  });

  it("is true only when cash_enabled is on", () => {
    expect(tokenPurchaseCashAvailable(flags({ cash_enabled: true }))).toBe(true);
  });
});

describe("canSelectTokenMethod — bank always on, cash gated, others rejected", () => {
  it("always allows bank, regardless of config", () => {
    expect(canSelectTokenMethod("bank")).toEqual({ ok: true });
    expect(canSelectTokenMethod("bank", flags({ cash_enabled: false }))).toEqual({ ok: true });
    expect(canSelectTokenMethod("bank", flags({ cash_enabled: true }))).toEqual({ ok: true });
  });

  it("rejects cash when the toggle is off (400 method_unavailable)", () => {
    const r = canSelectTokenMethod("cash", flags({ cash_enabled: false }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
      expect(r.reason).toBe("method_unavailable");
    }
  });

  it("allows cash when the toggle is on", () => {
    expect(canSelectTokenMethod("cash", flags({ cash_enabled: true }))).toEqual({ ok: true });
  });

  it("rejects unknown methods (token/card/garbage) with 400", () => {
    for (const m of ["token", "card", "wire", "", "BANK"]) {
      const r = canSelectTokenMethod(m, flags({ cash_enabled: true }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.status).toBe(400);
    }
  });
});
