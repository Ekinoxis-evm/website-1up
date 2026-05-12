import { describe, it, expect } from "vitest";
import { formatCop, cn } from "@/lib/utils";

describe("formatCop", () => {
  it("returns 'Por definir' for null", () => {
    expect(formatCop(null)).toBe("Por definir");
  });

  it("returns 'Por definir' for undefined", () => {
    expect(formatCop(undefined)).toBe("Por definir");
  });

  it("returns 'Por definir' for 0", () => {
    expect(formatCop(0)).toBe("Por definir");
  });

  it("formats a COP amount with currency symbol", () => {
    const result = formatCop(50000);
    expect(result).toMatch(/50[.,]?000/);
  });

  it("formats 1000000 with proper separators", () => {
    const result = formatCop(1000000);
    expect(result).toMatch(/1[.,]?000[.,]?000/);
  });
});

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("ignores falsy values", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });

  it("deduplicates conflicting Tailwind classes (last wins)", () => {
    expect(cn("p-4", "p-8")).toBe("p-8");
  });

  it("returns empty string when no classes", () => {
    expect(cn()).toBe("");
  });
});
