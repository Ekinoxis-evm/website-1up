import { describe, it, expect } from "vitest";
import { canActivatePass, canRevokePass } from "@/lib/passActivation";

const OWNER = 42;
const pass = (state: string, owner = OWNER) => ({ owner_user_profile_id: owner, state });

describe("canActivatePass — activation precondition guard", () => {
  it("allows activating an issued pass owned by the caller", () => {
    expect(canActivatePass(pass("issued"), OWNER)).toEqual({ ok: true });
  });

  it("404s when the pass does not exist", () => {
    const r = canActivatePass(null, OWNER);
    expect(r).toMatchObject({ ok: false, status: 404 });
  });

  it("403s when the caller does not own the pass (IDOR guard)", () => {
    const r = canActivatePass(pass("issued", 999), OWNER);
    expect(r).toMatchObject({ ok: false, status: 403 });
  });

  it("409s when the pass is already active", () => {
    expect(canActivatePass(pass("active"), OWNER)).toMatchObject({ ok: false, status: 409 });
  });

  it("409s when the pass is expired or revoked", () => {
    expect(canActivatePass(pass("expired"), OWNER)).toMatchObject({ ok: false, status: 409 });
    expect(canActivatePass(pass("revoked"), OWNER)).toMatchObject({ ok: false, status: 409 });
  });

  it("rejects an unknown state", () => {
    expect(canActivatePass(pass("weird"), OWNER)).toMatchObject({ ok: false, status: 409 });
  });
});

describe("canRevokePass — admin revoke precondition", () => {
  it("allows revoking an issued, active, or expired pass", () => {
    expect(canRevokePass({ state: "issued" })).toEqual({ ok: true });
    expect(canRevokePass({ state: "active" })).toEqual({ ok: true });
    expect(canRevokePass({ state: "expired" })).toEqual({ ok: true });
  });

  it("404s when the pass does not exist", () => {
    expect(canRevokePass(null)).toMatchObject({ ok: false, status: 404 });
  });

  it("409s when the pass is already revoked (idempotency guard)", () => {
    expect(canRevokePass({ state: "revoked" })).toMatchObject({ ok: false, status: 409 });
  });
});
