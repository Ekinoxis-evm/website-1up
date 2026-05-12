import { describe, it, expect } from "vitest";
import { selectBestDiscount } from "@/lib/discount";

describe("selectBestDiscount", () => {
  it("returns zero discount for empty rules", () => {
    expect(selectBestDiscount([], false)).toEqual({ ruleId: null, discountPct: 0 });
  });

  it("applies a single automatic rule", () => {
    const rules = [{ id: 1, discount_pct: 20, trigger_type: "automatic" }];
    expect(selectBestDiscount(rules, false)).toEqual({ ruleId: 1, discountPct: 20 });
  });

  it("picks the highest discount among multiple rules", () => {
    const rules = [
      { id: 1, discount_pct: 10, trigger_type: "automatic" },
      { id: 2, discount_pct: 30, trigger_type: "automatic" },
      { id: 3, discount_pct: 20, trigger_type: "automatic" },
    ];
    expect(selectBestDiscount(rules, false)).toEqual({ ruleId: 2, discountPct: 30 });
  });

  it("skips comfenalco rule when user is not affiliated", () => {
    const rules = [
      { id: 1, discount_pct: 50, trigger_type: "comfenalco" },
      { id: 2, discount_pct: 10, trigger_type: "automatic" },
    ];
    expect(selectBestDiscount(rules, false)).toEqual({ ruleId: 2, discountPct: 10 });
  });

  it("applies comfenalco rule when user is affiliated and it is best", () => {
    const rules = [
      { id: 1, discount_pct: 50, trigger_type: "comfenalco" },
      { id: 2, discount_pct: 10, trigger_type: "automatic" },
    ];
    expect(selectBestDiscount(rules, true)).toEqual({ ruleId: 1, discountPct: 50 });
  });

  it("returns zero when only available rule is comfenalco and user is not affiliated", () => {
    const rules = [{ id: 1, discount_pct: 50, trigger_type: "comfenalco" }];
    expect(selectBestDiscount(rules, false)).toEqual({ ruleId: null, discountPct: 0 });
  });

  it("comfenalco beats automatic when user is affiliated", () => {
    const rules = [
      { id: 1, discount_pct: 15, trigger_type: "automatic" },
      { id: 2, discount_pct: 40, trigger_type: "comfenalco" },
    ];
    expect(selectBestDiscount(rules, true)).toEqual({ ruleId: 2, discountPct: 40 });
  });
});
