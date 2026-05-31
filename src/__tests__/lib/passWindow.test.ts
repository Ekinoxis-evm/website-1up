import { describe, it, expect } from "vitest";
import { computePassWindow } from "@/lib/passWindow";

const NOW = new Date("2026-06-01T00:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

describe("computePassWindow — pass stacking math", () => {
  it("starts now when the user has no active pass", () => {
    const { startedAt, expiresAt } = computePassWindow({
      activeExpiresAt: null,
      durationDays: 30,
      now: NOW,
    });
    expect(startedAt).toEqual(NOW);
    expect(expiresAt).toEqual(new Date(NOW.getTime() + 30 * DAY));
  });

  it("treats undefined active pass the same as null (starts now)", () => {
    const { startedAt } = computePassWindow({ activeExpiresAt: undefined, durationDays: 7, now: NOW });
    expect(startedAt).toEqual(NOW);
  });

  it("stacks onto a still-active pass — new window begins at the old expiry", () => {
    const activeExpiresAt = new Date(NOW.getTime() + 10 * DAY); // 10 days left
    const { startedAt, expiresAt } = computePassWindow({
      activeExpiresAt,
      durationDays: 30,
      now: NOW,
    });
    expect(startedAt).toEqual(activeExpiresAt);
    expect(expiresAt).toEqual(new Date(activeExpiresAt.getTime() + 30 * DAY)); // 40 days out total
  });

  it("does NOT stack onto an already-expired pass — starts now", () => {
    const expiredAt = new Date(NOW.getTime() - 5 * DAY); // expired 5 days ago
    const { startedAt, expiresAt } = computePassWindow({
      activeExpiresAt: expiredAt,
      durationDays: 30,
      now: NOW,
    });
    expect(startedAt).toEqual(NOW);
    expect(expiresAt).toEqual(new Date(NOW.getTime() + 30 * DAY));
  });

  it("accepts an ISO string for the active expiry", () => {
    const iso = new Date(NOW.getTime() + 3 * DAY).toISOString();
    const { startedAt } = computePassWindow({ activeExpiresAt: iso, durationDays: 7, now: NOW });
    expect(startedAt.toISOString()).toBe(iso);
  });

  it("computes the exact duration in days", () => {
    const { startedAt, expiresAt } = computePassWindow({ activeExpiresAt: null, durationDays: 1, now: NOW });
    expect(expiresAt.getTime() - startedAt.getTime()).toBe(1 * DAY);
  });
});
