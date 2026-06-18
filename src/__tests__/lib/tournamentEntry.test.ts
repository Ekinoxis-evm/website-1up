import { describe, it, expect } from "vitest";
import {
  tournamentEntryFee,
  parseEntryFeeInput,
  isValidTreasuryAddress,
  canCreateEntryOrder,
  canReviewEntryOrder,
  paidRegistrationFailureMessage,
  TOKEN_COP_RATE,
  type EntryPrecheckTournament,
} from "@/lib/tournamentEntry";

const TREASURY = "0x1111111111111111111111111111111111111111";

function tournament(overrides: Partial<EntryPrecheckTournament> = {}): EntryPrecheckTournament {
  return {
    status:               "upcoming",
    is_active:            true,
    is_registration_open: true,
    entry_fee_tokens:     10,
    entry_fee_cop:        10000,
    ...overrides,
  };
}

describe("tournamentEntryFee — null = free, existing flow untouched", () => {
  it("returns null when both fee columns are null (free tournament)", () => {
    expect(tournamentEntryFee({ entry_fee_tokens: null, entry_fee_cop: null })).toBeNull();
  });

  it("returns null when fees are 0 or negative — never charges a non-positive fee", () => {
    expect(tournamentEntryFee({ entry_fee_tokens: 0, entry_fee_cop: 0 })).toBeNull();
    expect(tournamentEntryFee({ entry_fee_tokens: -5, entry_fee_cop: -100 })).toBeNull();
  });

  it("returns only the configured method", () => {
    expect(tournamentEntryFee({ entry_fee_tokens: 10, entry_fee_cop: null })).toEqual({ tokens: 10, cop: null });
    expect(tournamentEntryFee({ entry_fee_tokens: null, entry_fee_cop: 10000 })).toEqual({ tokens: null, cop: 10000 });
  });

  it("returns both when both are set", () => {
    expect(tournamentEntryFee({ entry_fee_tokens: 10, entry_fee_cop: 10000 })).toEqual({ tokens: 10, cop: 10000 });
  });

  it("coerces numeric strings (Postgres NUMERIC comes back as string via supabase-js)", () => {
    expect(tournamentEntryFee({ entry_fee_tokens: "10" as unknown as number, entry_fee_cop: null }))
      .toEqual({ tokens: 10, cop: null });
  });
});

describe("parseEntryFeeInput — admin editor → DB columns", () => {
  it("empty/null/undefined → null (free)", () => {
    expect(parseEntryFeeInput("", "")).toEqual({ ok: true, tokens: null, cop: null, treasury: null });
    expect(parseEntryFeeInput(null, null)).toEqual({ ok: true, tokens: null, cop: null, treasury: null });
    expect(parseEntryFeeInput(undefined, undefined)).toEqual({ ok: true, tokens: null, cop: null, treasury: null });
  });

  it("accepts positive values (numbers or numeric strings) with a treasury for token fees", () => {
    expect(parseEntryFeeInput("10", "10000", TREASURY)).toEqual({ ok: true, tokens: 10, cop: 10000, treasury: TREASURY });
    expect(parseEntryFeeInput(2.5, 5000, TREASURY)).toEqual({ ok: true, tokens: 2.5, cop: 5000, treasury: TREASURY });
  });

  it("rejects zero, negative, and non-numeric token fees", () => {
    expect(parseEntryFeeInput("0", "", TREASURY).ok).toBe(false);
    expect(parseEntryFeeInput("-1", "", TREASURY).ok).toBe(false);
    expect(parseEntryFeeInput("abc", "", TREASURY).ok).toBe(false);
  });

  it("rejects non-integer and invalid COP fees", () => {
    expect(parseEntryFeeInput("", "100.5").ok).toBe(false);
    expect(parseEntryFeeInput("", "0").ok).toBe(false);
    expect(parseEntryFeeInput("", "gratis").ok).toBe(false);
  });

  it("allows a bank-only fee without a treasury", () => {
    expect(parseEntryFeeInput("", "15000")).toEqual({ ok: true, tokens: null, cop: 15000, treasury: null });
  });

  it("allows a token-only fee when a valid treasury is given", () => {
    expect(parseEntryFeeInput("10", "", TREASURY)).toEqual({ ok: true, tokens: 10, cop: null, treasury: TREASURY });
  });
});

describe("isValidTreasuryAddress — EVM address shape", () => {
  it("accepts a checksummed/lowercase 0x + 40 hex address", () => {
    expect(isValidTreasuryAddress(TREASURY)).toBe(true);
    expect(isValidTreasuryAddress("0xAbC0000000000000000000000000000000000001")).toBe(true);
  });
  it("trims surrounding whitespace", () => {
    expect(isValidTreasuryAddress(`  ${TREASURY}  `)).toBe(true);
  });
  it("rejects malformed, short, non-hex, or non-string values", () => {
    expect(isValidTreasuryAddress("0x123")).toBe(false);
    expect(isValidTreasuryAddress("1111111111111111111111111111111111111111")).toBe(false);
    expect(isValidTreasuryAddress("0xZZZZ111111111111111111111111111111111111")).toBe(false);
    expect(isValidTreasuryAddress("")).toBe(false);
    expect(isValidTreasuryAddress(null)).toBe(false);
    expect(isValidTreasuryAddress(undefined)).toBe(false);
    expect(isValidTreasuryAddress(123)).toBe(false);
  });
});

describe("parseEntryFeeInput — fee/treasury coupling (per-tournament treasury)", () => {
  it("rejects a token fee with NO treasury — clear Spanish error", () => {
    const r = parseEntryFeeInput("10", "", "");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/tesorería/i);
  });

  it("rejects a token fee with a malformed treasury", () => {
    expect(parseEntryFeeInput("10", "", "0xnotvalid").ok).toBe(false);
    expect(parseEntryFeeInput("10", "10000", "abc").ok).toBe(false);
  });

  it("does NOT require a treasury for a bank-only fee", () => {
    expect(parseEntryFeeInput("", "10000").ok).toBe(true);
    expect(parseEntryFeeInput("", "10000", "").ok).toBe(true);
  });

  it("rejects a malformed treasury even with no token fee", () => {
    expect(parseEntryFeeInput("", "10000", "0xbad").ok).toBe(false);
  });

  it("keeps a treasury alongside a token fee even when bank is also offered", () => {
    expect(parseEntryFeeInput("10", "10000", TREASURY)).toEqual({ ok: true, tokens: 10, cop: 10000, treasury: TREASURY });
  });
});

describe("canCreateEntryOrder — gate for the user POST", () => {
  it("404 when the tournament is missing or inactive", () => {
    expect(canCreateEntryOrder(null, "token")).toMatchObject({ ok: false, status: 404 });
    expect(canCreateEntryOrder(tournament({ is_active: false }), "token")).toMatchObject({ ok: false, status: 404 });
  });

  it("400 free — a free tournament must use the normal registration flow", () => {
    const free = tournament({ entry_fee_tokens: null, entry_fee_cop: null });
    expect(canCreateEntryOrder(free, "token")).toMatchObject({ ok: false, status: 400, reason: "free" });
  });

  it("400 closed when registration is closed or the tournament left 'upcoming'", () => {
    expect(canCreateEntryOrder(tournament({ is_registration_open: false }), "token"))
      .toMatchObject({ ok: false, status: 400, reason: "closed" });
    expect(canCreateEntryOrder(tournament({ status: "live" }), "bank"))
      .toMatchObject({ ok: false, status: 400, reason: "closed" });
    expect(canCreateEntryOrder(tournament({ status: "completed" }), "bank"))
      .toMatchObject({ ok: false, status: 400, reason: "closed" });
  });

  it("400 method_unavailable when paying with a method the tournament doesn't charge", () => {
    expect(canCreateEntryOrder(tournament({ entry_fee_tokens: null }), "token"))
      .toMatchObject({ ok: false, status: 400, reason: "method_unavailable" });
    expect(canCreateEntryOrder(tournament({ entry_fee_cop: null }), "bank"))
      .toMatchObject({ ok: false, status: 400, reason: "method_unavailable" });
  });

  it("ok for each available method", () => {
    expect(canCreateEntryOrder(tournament(), "token")).toEqual({ ok: true });
    expect(canCreateEntryOrder(tournament(), "bank")).toEqual({ ok: true });
    expect(canCreateEntryOrder(tournament({ entry_fee_cop: null }), "token")).toEqual({ ok: true });
    expect(canCreateEntryOrder(tournament({ entry_fee_tokens: null }), "bank")).toEqual({ ok: true });
  });
});

describe("canReviewEntryOrder — admin approve/reject state transitions", () => {
  it("404 when the order doesn't exist", () => {
    expect(canReviewEntryOrder(null)).toMatchObject({ ok: false, status: 404 });
    expect(canReviewEntryOrder(undefined)).toMatchObject({ ok: false, status: 404 });
  });

  it("409 for token orders — they confirm on-chain, never via manual review", () => {
    expect(canReviewEntryOrder({ status: "confirmed", payment_method: "token" }))
      .toMatchObject({ ok: false, status: 409 });
  });

  it("only pending_bank is reviewable", () => {
    expect(canReviewEntryOrder({ status: "pending_bank", payment_method: "bank" })).toEqual({ ok: true });
  });

  it("409 for every terminal state (idempotency — double review is rejected)", () => {
    for (const status of ["confirmed", "rejected", "cancelled"]) {
      expect(canReviewEntryOrder({ status, payment_method: "bank" }))
        .toMatchObject({ ok: false, status: 409 });
    }
  });

  it("409 for unknown states — fails closed", () => {
    expect(canReviewEntryOrder({ status: "whatever", payment_method: "bank" }))
      .toMatchObject({ ok: false, status: 409 });
  });
});

describe("paidRegistrationFailureMessage — no refunds in v1, must say 'manual'", () => {
  it("every variant mentions the manual refund", () => {
    for (const reason of ["full", "already_registered", "closed", undefined]) {
      expect(paidRegistrationFailureMessage(reason)).toMatch(/manual/i);
    }
  });

  it("'full' explains the tournament filled before the payment confirmed", () => {
    expect(paidRegistrationFailureMessage("full")).toMatch(/llenó/);
  });
});

describe("TOKEN_COP_RATE — display convention", () => {
  it("is 1 $1UP = 1,000 COP", () => {
    expect(TOKEN_COP_RATE).toBe(1000);
  });
});
