import { describe, it, expect } from "vitest";
import {
  tokenPurchaseCashAvailable,
  tokenPurchaseCardAvailable,
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

describe("tokenPurchaseCardAvailable — needs BOTH the card toggle AND the live-env flag", () => {
  it("is false by default (card off + env off)", () => {
    expect(tokenPurchaseCardAvailable()).toBe(false);
    expect(tokenPurchaseCardAvailable(flags())).toBe(false);
    expect(tokenPurchaseCardAvailable(flags(), {})).toBe(false);
  });

  it("is false when the toggle is on but the live-env flag is off", () => {
    expect(tokenPurchaseCardAvailable(flags({ card_enabled: true }), { cardLiveEnv: false })).toBe(false);
    expect(tokenPurchaseCardAvailable(flags({ card_enabled: true }), {})).toBe(false);
  });

  it("is false when the live-env flag is on but the toggle is off", () => {
    expect(tokenPurchaseCardAvailable(flags({ card_enabled: false }), { cardLiveEnv: true })).toBe(false);
  });

  it("is true only when both the toggle and the live-env flag are on", () => {
    expect(tokenPurchaseCardAvailable(flags({ card_enabled: true }), { cardLiveEnv: true })).toBe(true);
  });
});

describe("canSelectTokenMethod — bank always on, cash + card gated, others rejected", () => {
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

  it("rejects card when card is disabled (toggle off), even with live-env on", () => {
    const r = canSelectTokenMethod("card", flags({ card_enabled: false }), { cardLiveEnv: true });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
      expect(r.reason).toBe("method_unavailable");
      expect(r.error).toBe("El pago con tarjeta no está disponible.");
    }
  });

  it("rejects card when enabled but the live-env flag is false", () => {
    const r = canSelectTokenMethod("card", flags({ card_enabled: true }), { cardLiveEnv: false });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
      expect(r.reason).toBe("method_unavailable");
    }
  });

  it("rejects card when enabled but opts omitted (live-env defaults off)", () => {
    const r = canSelectTokenMethod("card", flags({ card_enabled: true }));
    expect(r.ok).toBe(false);
  });

  it("allows card only when both the toggle and the live-env flag are on", () => {
    expect(canSelectTokenMethod("card", flags({ card_enabled: true }), { cardLiveEnv: true })).toEqual({ ok: true });
  });

  it("rejects unknown methods (token/wire/garbage) with 400", () => {
    for (const m of ["token", "wire", "", "BANK"]) {
      const r = canSelectTokenMethod(m, flags({ cash_enabled: true, card_enabled: true }), { cardLiveEnv: true });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.status).toBe(400);
    }
  });
});
