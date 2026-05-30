import { describe, it, expect } from "vitest";
import { validatePrizes, type PrizeRow } from "@/lib/tournamentPrizes";

const row = (over: Partial<PrizeRow> = {}): PrizeRow => ({
  position:     1,
  prizeType:    "cop",
  amountTokens: "",
  amountCop:    "100000",
  ...over,
});

describe("validatePrizes — mirrors the tournament_prizes pass invariant CHECK", () => {
  it("returns null for an empty / undefined prize list", () => {
    expect(validatePrizes(undefined)).toBeNull();
    expect(validatePrizes([])).toBeNull();
  });

  it("ignores pass_days on rows that do not include a pass", () => {
    expect(validatePrizes([row({ includesPass: false, passDays: "0" })])).toBeNull();
    expect(validatePrizes([row({ prizeType: "tokens", amountTokens: "500", passDays: "" })])).toBeNull();
  });

  describe("add-on pass (tokens/cop/both + includesPass)", () => {
    it("accepts a positive duration", () => {
      expect(validatePrizes([row({ includesPass: true, passDays: "30" })])).toBeNull();
      expect(validatePrizes([row({ includesPass: true, passDays: 30 })])).toBeNull();
    });

    it("rejects zero — the exact case that violated the DB CHECK (pass_days > 0)", () => {
      expect(validatePrizes([row({ includesPass: true, passDays: "0" })])).toContain("posición 1");
    });

    it("rejects blank / missing duration", () => {
      expect(validatePrizes([row({ includesPass: true, passDays: "" })])).not.toBeNull();
      expect(validatePrizes([row({ includesPass: true, passDays: undefined })])).not.toBeNull();
    });

    it("rejects negative and non-numeric durations", () => {
      expect(validatePrizes([row({ includesPass: true, passDays: "-5" })])).not.toBeNull();
      expect(validatePrizes([row({ includesPass: true, passDays: "abc" })])).not.toBeNull();
    });
  });

  describe("pass-only prize (prizeType='pass')", () => {
    it("treats the pass as implicit and still requires a positive duration", () => {
      expect(validatePrizes([row({ prizeType: "pass", passDays: "60" })])).toBeNull();
      expect(validatePrizes([row({ prizeType: "pass", passDays: "0" })])).not.toBeNull();
    });
  });

  it("reports the offending position in a multi-row list", () => {
    const msg = validatePrizes([
      row({ position: 1, includesPass: true, passDays: "30" }),
      row({ position: 2, prizeType: "pass", passDays: "0" }),
    ]);
    expect(msg).toContain("posición 2");
  });
});
