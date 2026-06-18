import { describe, it, expect } from "vitest";
import {
  PAYMENT_METHODS,
  METHOD_META,
  normalizeMethod,
  toLegacyMethod,
  enabledMethods,
  isMethodEnabled,
  type ServiceMethodConfig,
} from "@/lib/payments/methodRegistry";

const allOn: ServiceMethodConfig = { token_enabled: true, wire_enabled: true, cash_enabled: true, card_enabled: true };
const liveDefault: ServiceMethodConfig = { token_enabled: true, wire_enabled: true, cash_enabled: false, card_enabled: false };

describe("methodRegistry — metadata", () => {
  it("defines all four canonical methods", () => {
    expect([...PAYMENT_METHODS]).toEqual(["token", "wire", "cash", "card"]);
  });

  it("token settles in tokens, the rest in COP", () => {
    expect(METHOD_META.token.unit).toBe("tokens");
    expect(METHOD_META.wire.unit).toBe("cop");
    expect(METHOD_META.cash.unit).toBe("cop");
    expect(METHOD_META.card.unit).toBe("cop");
  });

  it("cash is admin-recorded, not user-initiated", () => {
    expect(METHOD_META.cash.userInitiated).toBe(false);
    expect(METHOD_META.cash.adminRecorded).toBe(true);
  });

  it("only wire requires a comprobante", () => {
    expect(METHOD_META.wire.requiresComprobante).toBe(true);
    expect(METHOD_META.token.requiresComprobante).toBe(false);
    expect(METHOD_META.cash.requiresComprobante).toBe(false);
    expect(METHOD_META.card.requiresComprobante).toBe(false);
  });
});

describe("methodRegistry — legacy bank<->wire bridge", () => {
  it("normalizes legacy 'bank' to 'wire'", () => {
    expect(normalizeMethod("bank")).toBe("wire");
    expect(normalizeMethod("BANK")).toBe("wire");
    expect(normalizeMethod("  Bank ")).toBe("wire");
  });

  it("passes canonical methods through", () => {
    expect(normalizeMethod("token")).toBe("token");
    expect(normalizeMethod("wire")).toBe("wire");
    expect(normalizeMethod("cash")).toBe("cash");
    expect(normalizeMethod("card")).toBe("card");
  });

  it("fails closed on an unknown method", () => {
    expect(() => normalizeMethod("mercadopago")).toThrow();
    expect(() => normalizeMethod("")).toThrow();
  });

  it("maps wire back to the legacy 'bank' value, others unchanged", () => {
    expect(toLegacyMethod("wire")).toBe("bank");
    expect(toLegacyMethod("token")).toBe("token");
    expect(toLegacyMethod("cash")).toBe("cash");
    expect(toLegacyMethod("card")).toBe("card");
  });

  it("round-trips legacy bank", () => {
    expect(toLegacyMethod(normalizeMethod("bank"))).toBe("bank");
  });
});

describe("methodRegistry — enabledMethods (card env gate)", () => {
  it("returns token+wire by live default (cash/card off)", () => {
    expect(enabledMethods(liveDefault)).toEqual(["token", "wire"]);
  });

  it("includes cash when the service toggle is on", () => {
    expect(enabledMethods({ ...liveDefault, cash_enabled: true })).toEqual(["token", "wire", "cash"]);
  });

  it("hides card when card_enabled is on but the env flag is off (design-only)", () => {
    expect(enabledMethods(allOn, { cardLiveEnv: false })).toEqual(["token", "wire", "cash"]);
    expect(enabledMethods(allOn)).toEqual(["token", "wire", "cash"]);
  });

  it("shows card only when BOTH the toggle AND the env flag are on", () => {
    expect(enabledMethods(allOn, { cardLiveEnv: true })).toEqual(["token", "wire", "cash", "card"]);
    expect(enabledMethods({ ...liveDefault, card_enabled: false }, { cardLiveEnv: true })).toEqual(["token", "wire"]);
  });

  it("returns nothing when every method is disabled", () => {
    expect(enabledMethods({ token_enabled: false, wire_enabled: false, cash_enabled: false, card_enabled: false })).toEqual([]);
  });

  it("isMethodEnabled mirrors enabledMethods, including the card gate", () => {
    expect(isMethodEnabled(liveDefault, "token")).toBe(true);
    expect(isMethodEnabled(liveDefault, "cash")).toBe(false);
    expect(isMethodEnabled(allOn, "card", { cardLiveEnv: false })).toBe(false);
    expect(isMethodEnabled(allOn, "card", { cardLiveEnv: true })).toBe(true);
  });
});
