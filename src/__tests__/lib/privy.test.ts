import { describe, it, expect, vi, beforeEach } from "vitest";

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

  it("returns claims for a valid Bearer token", async () => {
    const claims = { userId: "did:privy:user_123", appId: "app_abc" };
    mockVerifyAuthToken.mockResolvedValueOnce(claims);
    const result = await verifyToken("Bearer valid_token_here");
    expect(result).toEqual(claims);
    expect(mockVerifyAuthToken).toHaveBeenCalledWith("valid_token_here");
  });

  it("returns null when Privy throws (expired or invalid token)", async () => {
    mockVerifyAuthToken.mockRejectedValueOnce(new Error("Token expired"));
    expect(await verifyToken("Bearer expired_token")).toBeNull();
  });

  it("strips exactly the 'Bearer ' prefix before passing to Privy", async () => {
    mockVerifyAuthToken.mockResolvedValueOnce({ userId: "u1" });
    await verifyToken("Bearer my.jwt.token");
    expect(mockVerifyAuthToken).toHaveBeenCalledWith("my.jwt.token");
  });
});
