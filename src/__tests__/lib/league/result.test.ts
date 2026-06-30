import { describe, it, expect } from "vitest";
import { validateLeagueScores, deriveMatchOutcome } from "@/lib/league/result";

describe("validateLeagueScores", () => {
  it("accepts two non-negative integers", () => {
    expect(validateLeagueScores(2, 1)).toEqual({ ok: true, p1Score: 2, p2Score: 1 });
    expect(validateLeagueScores(0, 0)).toEqual({ ok: true, p1Score: 0, p2Score: 0 });
  });

  it("accepts numeric strings (form inputs)", () => {
    expect(validateLeagueScores("3", "0")).toEqual({ ok: true, p1Score: 3, p2Score: 0 });
  });

  it("rejects missing scores", () => {
    expect(validateLeagueScores(null, 1).ok).toBe(false);
    expect(validateLeagueScores(1, undefined).ok).toBe(false);
  });

  it("rejects non-integers and negatives", () => {
    expect(validateLeagueScores(1.5, 0).ok).toBe(false);
    expect(validateLeagueScores(-1, 0).ok).toBe(false);
    expect(validateLeagueScores("abc", 0).ok).toBe(false);
  });
});

describe("deriveMatchOutcome", () => {
  it("p1 wins on higher score", () => {
    expect(deriveMatchOutcome(10, 20, 3, 1)).toEqual({ winnerId: 10, isDraw: false });
  });
  it("p2 wins on higher score", () => {
    expect(deriveMatchOutcome(10, 20, 0, 2)).toEqual({ winnerId: 20, isDraw: false });
  });
  it("equal scores → draw", () => {
    expect(deriveMatchOutcome(10, 20, 1, 1)).toEqual({ winnerId: null, isDraw: true });
  });
});
