import { describe, it, expect } from "vitest";
import { pointsFor, POINTS_BY_POSITION } from "@/lib/tournamentPoints";

describe("pointsFor", () => {
  it("returns 10 for first place", () => {
    expect(pointsFor(1)).toBe(10);
  });

  it("returns 5 for second place", () => {
    expect(pointsFor(2)).toBe(5);
  });

  it("returns 3 for third place", () => {
    expect(pointsFor(3)).toBe(3);
  });

  it("returns 0 for position 4 and beyond", () => {
    expect(pointsFor(4)).toBe(0);
    expect(pointsFor(10)).toBe(0);
  });

  it("returns 0 for position 0", () => {
    expect(pointsFor(0)).toBe(0);
  });
});

describe("POINTS_BY_POSITION", () => {
  it("maps gold/silver/bronze correctly", () => {
    expect(POINTS_BY_POSITION[1]).toBe(10);
    expect(POINTS_BY_POSITION[2]).toBe(5);
    expect(POINTS_BY_POSITION[3]).toBe(3);
  });
});
