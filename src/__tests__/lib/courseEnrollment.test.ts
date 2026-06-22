import { describe, it, expect } from "vitest";
import {
  availableCourseMethods,
  courseCashAvailable,
  courseCardAvailable,
  canSelectCourseMethod,
  canReviewEnrollment,
  DEFAULT_ENROLLMENT_METHOD_FLAGS,
  type CourseFeeColumns,
  type EnrollmentMethodFlags,
} from "@/lib/courseEnrollment";

const flags = (o: Partial<EnrollmentMethodFlags> = {}): EnrollmentMethodFlags => ({
  ...DEFAULT_ENROLLMENT_METHOD_FLAGS,
  ...o,
});

const course = (overrides: Partial<CourseFeeColumns> = {}): CourseFeeColumns => ({
  price_cop:   100000,
  price_token: 100,
  ...overrides,
});

describe("availableCourseMethods — price unit AND service toggle", () => {
  it("defaults to token + bank (cash/card off) when no config given", () => {
    expect(availableCourseMethods(course())).toEqual(["token", "bank"]);
  });

  it("includes cash only when the course has a COP price AND cash is enabled", () => {
    expect(availableCourseMethods(course(), flags({ cash_enabled: true })))
      .toEqual(["token", "bank", "cash"]);
    // cash enabled but no COP price → not offered
    expect(availableCourseMethods(course({ price_cop: null }), flags({ cash_enabled: true })))
      .toEqual(["token"]);
  });

  it("drops token when there is no token price", () => {
    expect(availableCourseMethods(course({ price_token: null }))).toEqual(["bank"]);
    expect(availableCourseMethods(course({ price_token: 0 }))).toEqual(["bank"]);
  });

  it("drops a method when its service toggle is off, even if the price unit exists", () => {
    expect(availableCourseMethods(course(), flags({ wire_enabled: false }))).toEqual(["token"]);
    expect(availableCourseMethods(course(), flags({ token_enabled: false }))).toEqual(["bank"]);
  });

  it("offers card only with a COP price + card_enabled + cardLiveEnv", () => {
    // all three present → card offered
    expect(availableCourseMethods(course(), flags({ card_enabled: true }), { cardLiveEnv: true }))
      .toEqual(["token", "bank", "card"]);
  });

  it("never offers card when any of the three is missing", () => {
    // card_enabled but env off
    expect(availableCourseMethods(course(), flags({ card_enabled: true }))).not.toContain("card");
    expect(availableCourseMethods(course(), flags({ card_enabled: true }), { cardLiveEnv: false })).not.toContain("card");
    // env on but card_enabled off
    expect(availableCourseMethods(course(), flags({ card_enabled: false }), { cardLiveEnv: true })).not.toContain("card");
    // card_enabled + env on but no COP price
    expect(availableCourseMethods(course({ price_cop: null }), flags({ card_enabled: true }), { cardLiveEnv: true }))
      .not.toContain("card");
  });

  it("coerces numeric strings (Postgres NUMERIC comes back as string via supabase-js)", () => {
    expect(availableCourseMethods({ price_cop: 100000, price_token: "100" as unknown as number }, flags({ cash_enabled: true })))
      .toEqual(["token", "bank", "cash"]);
  });
});

describe("courseCashAvailable — UI gate for the Efectivo option", () => {
  it("true only with a COP price AND cash enabled", () => {
    expect(courseCashAvailable(course(), flags({ cash_enabled: true }))).toBe(true);
  });
  it("false when cash disabled (default) or no COP price", () => {
    expect(courseCashAvailable(course())).toBe(false);
    expect(courseCashAvailable(course({ price_cop: null }), flags({ cash_enabled: true }))).toBe(false);
  });
});

describe("courseCardAvailable — UI gate for the card option", () => {
  it("true only with a COP price AND card enabled AND cardLiveEnv", () => {
    expect(courseCardAvailable(course(), flags({ card_enabled: true }), { cardLiveEnv: true })).toBe(true);
  });
  it("false when card disabled, env off, or no COP price", () => {
    expect(courseCardAvailable(course())).toBe(false);
    expect(courseCardAvailable(course(), flags({ card_enabled: true }))).toBe(false);
    expect(courseCardAvailable(course(), flags({ card_enabled: true }), { cardLiveEnv: false })).toBe(false);
    expect(courseCardAvailable(course(), flags({ card_enabled: false }), { cardLiveEnv: true })).toBe(false);
    expect(courseCardAvailable(course({ price_cop: null }), flags({ card_enabled: true }), { cardLiveEnv: true })).toBe(false);
  });
});

describe("canSelectCourseMethod — gate for the user POST", () => {
  it("ok for each available method", () => {
    expect(canSelectCourseMethod(course(), "token")).toEqual({ ok: true });
    expect(canSelectCourseMethod(course(), "bank")).toEqual({ ok: true });
    expect(canSelectCourseMethod(course(), "cash", flags({ cash_enabled: true }))).toEqual({ ok: true });
    expect(canSelectCourseMethod(course(), "card", flags({ card_enabled: true }), { cardLiveEnv: true })).toEqual({ ok: true });
  });

  it("400 method_unavailable for card when the env kill-switch is off, even with card_enabled", () => {
    expect(canSelectCourseMethod(course(), "card", flags({ card_enabled: true })))
      .toMatchObject({ ok: false, status: 400, reason: "method_unavailable" });
    expect(canSelectCourseMethod(course(), "card", flags({ card_enabled: true }), { cardLiveEnv: false }))
      .toMatchObject({ ok: false, status: 400, reason: "method_unavailable" });
  });

  it("400 method_unavailable for card when the service toggle is off but env on", () => {
    expect(canSelectCourseMethod(course(), "card", flags({ card_enabled: false }), { cardLiveEnv: true }))
      .toMatchObject({ ok: false, status: 400, reason: "method_unavailable" });
  });

  it("400 method_unavailable for card when the course has no COP price", () => {
    expect(canSelectCourseMethod(course({ price_cop: null }), "card", flags({ card_enabled: true }), { cardLiveEnv: true }))
      .toMatchObject({ ok: false, status: 400, reason: "method_unavailable" });
  });

  it("400 method_unavailable when cash is disabled in the service config (default)", () => {
    expect(canSelectCourseMethod(course(), "cash"))
      .toMatchObject({ ok: false, status: 400, reason: "method_unavailable" });
  });

  it("400 method_unavailable when the course has no COP price for cash", () => {
    expect(canSelectCourseMethod(course({ price_cop: null }), "cash", flags({ cash_enabled: true })))
      .toMatchObject({ ok: false, status: 400, reason: "method_unavailable" });
  });

  it("400 method_unavailable when paying token but the course has no token price", () => {
    expect(canSelectCourseMethod(course({ price_token: null }), "token"))
      .toMatchObject({ ok: false, status: 400, reason: "method_unavailable" });
  });

  it("400 method_unavailable when the admin disabled the otherwise-valid method", () => {
    expect(canSelectCourseMethod(course(), "bank", flags({ wire_enabled: false })))
      .toMatchObject({ ok: false, status: 400, reason: "method_unavailable" });
  });
});

describe("canReviewEnrollment — admin approve/reject state transitions", () => {
  it("404 when the enrollment doesn't exist", () => {
    expect(canReviewEnrollment(null)).toMatchObject({ ok: false, status: 404 });
    expect(canReviewEnrollment(undefined)).toMatchObject({ ok: false, status: 404 });
  });

  it("409 for mercadopago — not manually reviewable through this path", () => {
    expect(canReviewEnrollment({ payment_method: "mercadopago", payment_status: "pending" }))
      .toMatchObject({ ok: false, status: 409 });
  });

  it("only pending is reviewable — for token, bank, and cash", () => {
    expect(canReviewEnrollment({ payment_method: "token", payment_status: "pending" })).toEqual({ ok: true });
    expect(canReviewEnrollment({ payment_method: "bank",  payment_status: "pending" })).toEqual({ ok: true });
    expect(canReviewEnrollment({ payment_method: "cash",  payment_status: "pending" })).toEqual({ ok: true });
  });

  it("409 for every terminal state (idempotency — double review is rejected)", () => {
    for (const status of ["approved", "rejected", "cancelled"]) {
      expect(canReviewEnrollment({ payment_method: "cash", payment_status: status }))
        .toMatchObject({ ok: false, status: 409 });
    }
  });

  it("409 for unknown/null states — fails closed", () => {
    expect(canReviewEnrollment({ payment_method: "cash", payment_status: "whatever" }))
      .toMatchObject({ ok: false, status: 409 });
    expect(canReviewEnrollment({ payment_method: "cash", payment_status: null }))
      .toMatchObject({ ok: false, status: 409 });
  });
});
