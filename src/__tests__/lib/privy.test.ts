import { describe, it, expect, vi, beforeEach } from "vitest";

// `verifyToken` now asserts the token's `appId` claim matches the
// configured Privy app id (M-A6.4). Pin the test env var to the value the
// fixtures use so the equality holds.
const TEST_APP_ID = "app_abc";
process.env.NEXT_PUBLIC_PRIVY_APP_ID = TEST_APP_ID;

const mockVerifyAuthToken = vi.hoisted(() => vi.fn());

vi.mock("@privy-io/server-auth", () => ({
  PrivyClient: vi.fn(function () {
    return {
      verifyAuthToken: mockVerifyAuthToken,
      getUser: vi.fn().mockResolvedValue(null),
    };
  }),
}));

import { verifyToken } from "@/lib/privy";

describe("verifyToken", () => {
  beforeEach(() => {
    mockVerifyAuthToken.mockReset();
  });

  it("returns null for null header", async () => {
    expect(await verifyToken(null)).toBeNull();
  });

  it("returns null when header has no Bearer prefix", async () => {
    expect(await verifyToken("Token abc123")).toBeNull();
    expect(await verifyToken("abc123")).toBeNull();
    expect(await verifyToken("bearer abc123")).toBeNull();
  });

  it("returns claims for a valid Bearer token whose appId matches", async () => {
    const claims = { userId: "did:privy:user_123", appId: TEST_APP_ID };
    mockVerifyAuthToken.mockResolvedValueOnce(claims);
    const result = await verifyToken("Bearer valid_token_here");
    expect(result).toEqual(claims);
    expect(mockVerifyAuthToken).toHaveBeenCalledWith("valid_token_here");
  });

  // M-A6.4: defense-in-depth.
  it("rejects a token signed by a different Privy app", async () => {
    mockVerifyAuthToken.mockResolvedValueOnce({ userId: "u1", appId: "app_other" });
    expect(await verifyToken("Bearer foreign_app_token")).toBeNull();
  });

  it("rejects a token with no appId claim", async () => {
    mockVerifyAuthToken.mockResolvedValueOnce({ userId: "u1" });
    expect(await verifyToken("Bearer no_app_id")).toBeNull();
  });

  it("returns null when Privy throws (expired or invalid token)", async () => {
    mockVerifyAuthToken.mockRejectedValueOnce(new Error("Token expired"));
    expect(await verifyToken("Bearer expired_token")).toBeNull();
  });

  it("strips exactly the 'Bearer ' prefix before passing to Privy", async () => {
    mockVerifyAuthToken.mockResolvedValueOnce({ userId: "u1", appId: TEST_APP_ID });
    await verifyToken("Bearer my.jwt.token");
    expect(mockVerifyAuthToken).toHaveBeenCalledWith("my.jwt.token");
  });
});
