import { describe, it, expect } from "vitest";
import { isValidPassOrderAmount } from "@/lib/passOrders";

describe("isValidPassOrderAmount — mirrors pass_orders_token_amount_paid_check", () => {
  describe("admin_grant", () => {
    it("accepts 0 (the canonical grant amount — no payment changed hands)", () => {
      expect(isValidPassOrderAmount("admin_grant", 0)).toBe(true);
    });

    it("accepts positive amounts (an admin can record a notional value)", () => {
      expect(isValidPassOrderAmount("admin_grant", 50)).toBe(true);
    });

    it("rejects negative amounts", () => {
      expect(isValidPassOrderAmount("admin_grant", -1)).toBe(false);
    });
  });

  describe("token / bank (real purchases)", () => {
    it("rejects 0 — the original invariant must hold for paid purchases", () => {
      expect(isValidPassOrderAmount("token", 0)).toBe(false);
      expect(isValidPassOrderAmount("bank", 0)).toBe(false);
    });

    it("accepts positive amounts", () => {
      expect(isValidPassOrderAmount("token", 50)).toBe(true);
      expect(isValidPassOrderAmount("bank", 50)).toBe(true);
    });

    it("rejects negative amounts", () => {
      expect(isValidPassOrderAmount("token", -1)).toBe(false);
      expect(isValidPassOrderAmount("bank", -1)).toBe(false);
    });
  });

  describe("regression — the pre-v2.36.16 bug", () => {
    // The route inserts `token_amount_paid: 0` for admin grants. Before the
    // CHECK was relaxed, this returned a 23514 violation and zero rows landed.
    // This test pins the new contract.
    it("the route's admin_grant insert shape (amount=0) must pass the predicate", () => {
      const routeInsertShape = { payment_method: "admin_grant" as const, token_amount_paid: 0 };
      expect(
        isValidPassOrderAmount(routeInsertShape.payment_method, routeInsertShape.token_amount_paid),
      ).toBe(true);
    });
  });
});
