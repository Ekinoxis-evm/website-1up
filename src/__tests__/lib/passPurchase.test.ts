import { describe, it, expect } from "vitest";
import {
  passCashAvailable,
  passCardAvailable,
  canSelectPassMethod,
  DEFAULT_PASS_METHOD_FLAGS,
  type PassMethodFlags,
} from "@/lib/passPurchase";

const flags = (o: Partial<PassMethodFlags> = {}): PassMethodFlags => ({
  ...DEFAULT_PASS_METHOD_FLAGS,
  ...o,
});

describe("passCashAvailable — gated by the per-service cash toggle", () => {
  it("is false by default (cash off, today's live behavior)", () => {
    expect(passCashAvailable()).toBe(false);
    expect(passCashAvailable(flags())).toBe(false);
  });

  it("is true only when cash_enabled is on", () => {
    expect(passCashAvailable(flags({ cash_enabled: true }))).toBe(true);
  });
});

describe("canSelectPassMethod — token + bank always on, cash gated, others rejected", () => {
  it("always allows token and bank, regardless of config", () => {
    for (const m of ["token", "bank"]) {
      expect(canSelectPassMethod(m)).toEqual({ ok: true });
      expect(canSelectPassMethod(m, flags({ cash_enabled: false }))).toEqual({ ok: true });
      expect(canSelectPassMethod(m, flags({ cash_enabled: true }))).toEqual({ ok: true });
    }
  });

  it("rejects cash when the toggle is off (400 method_unavailable)", () => {
    const r = canSelectPassMethod("cash", flags({ cash_enabled: false }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
      expect(r.reason).toBe("method_unavailable");
    }
  });

  it("allows cash when the toggle is on", () => {
    expect(canSelectPassMethod("cash", flags({ cash_enabled: true }))).toEqual({ ok: true });
  });

  it("rejects admin_grant and garbage methods (400) — admin_grant is admin-only", () => {
    for (const m of ["admin_grant", "wire", "", "TOKEN"]) {
      const r = canSelectPassMethod(m, flags({ cash_enabled: true }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.status).toBe(400);
    }
  });
});

describe("passCardAvailable — gated by the card toggle AND the env kill-switch", () => {
  it("is false by default (card off, env off)", () => {
    expect(passCardAvailable()).toBe(false);
    expect(passCardAvailable(flags())).toBe(false);
  });

  it("is false when only the toggle is on (env still off)", () => {
    expect(passCardAvailable(flags({ card_enabled: true }))).toBe(false);
    expect(passCardAvailable(flags({ card_enabled: true }), { cardLiveEnv: false })).toBe(false);
  });

  it("is false when only the env is on (toggle still off)", () => {
    expect(passCardAvailable(flags({ card_enabled: false }), { cardLiveEnv: true })).toBe(false);
  });

  it("is true only when both the toggle and the env are on", () => {
    expect(passCardAvailable(flags({ card_enabled: true }), { cardLiveEnv: true })).toBe(true);
  });
});

describe("canSelectPassMethod — card gated by both the toggle and the env", () => {
  it("rejects card when the toggle is off, even with the env on (400 method_unavailable)", () => {
    const r = canSelectPassMethod("card", flags({ card_enabled: false }), { cardLiveEnv: true });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
      expect(r.reason).toBe("method_unavailable");
      expect(r.error).toBe("El pago con tarjeta no está disponible.");
    }
  });

  it("rejects card when the toggle is on but the env is off", () => {
    const r = canSelectPassMethod("card", flags({ card_enabled: true }), { cardLiveEnv: false });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
      expect(r.reason).toBe("method_unavailable");
    }
  });

  it("rejects card when the toggle is on but opts is omitted (env defaults off)", () => {
    const r = canSelectPassMethod("card", flags({ card_enabled: true }));
    expect(r.ok).toBe(false);
  });

  it("allows card only when both the toggle and the env are on", () => {
    expect(
      canSelectPassMethod("card", flags({ card_enabled: true }), { cardLiveEnv: true }),
    ).toEqual({ ok: true });
  });
});
