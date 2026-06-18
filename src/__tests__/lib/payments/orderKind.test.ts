import { describe, it, expect } from "vitest";
import {
  ORDER_KINDS,
  ORDER_KIND_META,
  isOrderKind,
  orderTable,
  type OrderKind,
} from "@/lib/payments/orderKind";

describe("orderKind", () => {
  it("lists the four existing order kinds (no marketplace yet)", () => {
    expect([...ORDER_KINDS]).toEqual(["pass", "tournament_entry", "token_purchase", "enrollment"]);
  });

  it("maps every kind to a table + at least one revalidate path", () => {
    for (const kind of ORDER_KINDS) {
      const meta = ORDER_KIND_META[kind];
      expect(meta.kind).toBe(kind);
      expect(meta.table).toBeTruthy();
      expect(meta.label).toBeTruthy();
      expect(meta.revalidate.length).toBeGreaterThan(0);
    }
  });

  it("has no orphan/extra metadata keys", () => {
    expect(Object.keys(ORDER_KIND_META).sort()).toEqual([...ORDER_KINDS].sort());
  });

  it("resolves the parent table name", () => {
    expect(orderTable("tournament_entry")).toBe("tournament_entry_orders");
    expect(orderTable("pass")).toBe("pass_orders");
    expect(orderTable("token_purchase")).toBe("token_purchase_orders");
    expect(orderTable("enrollment")).toBe("enrollments");
  });

  it("guards unknown kinds", () => {
    expect(isOrderKind("tournament_entry")).toBe(true);
    expect(isOrderKind("marketplace")).toBe(false);
    expect(isOrderKind("")).toBe(false);
    expect(isOrderKind(null)).toBe(false);
    expect(isOrderKind(42)).toBe(false);
  });

  it("type guard narrows correctly", () => {
    const raw: unknown = "pass";
    if (isOrderKind(raw)) {
      const k: OrderKind = raw;
      expect(orderTable(k)).toBe("pass_orders");
    }
  });
});
