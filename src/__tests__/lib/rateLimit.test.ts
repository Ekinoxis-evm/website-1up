import { describe, it, expect } from "vitest";
import type { NextRequest } from "next/server";
import { getClientIp, checkRateLimit, rateLimitByIp, rateLimitByUser } from "@/lib/rateLimit";

// Build a minimal NextRequest-shaped object — only `.headers.get` is exercised
// in the IP-extraction helpers, so we don't need the full polyfilled fetch object.
function mockReq(headers: Record<string, string>): NextRequest {
  return { headers: { get: (k: string) => headers[k.toLowerCase()] ?? null } } as unknown as NextRequest;
}

describe("getClientIp", () => {
  it("returns the first hop from x-forwarded-for", () => {
    expect(getClientIp(mockReq({ "x-forwarded-for": "203.0.113.10, 10.0.0.1" }))).toBe("203.0.113.10");
  });

  it("trims whitespace around the first hop", () => {
    expect(getClientIp(mockReq({ "x-forwarded-for": "  198.51.100.42  , 10.0.0.1" }))).toBe("198.51.100.42");
  });

  it("falls back to x-real-ip when x-forwarded-for is missing", () => {
    expect(getClientIp(mockReq({ "x-real-ip": "192.0.2.7" }))).toBe("192.0.2.7");
  });

  it("returns 'unknown' when neither header is present", () => {
    expect(getClientIp(mockReq({}))).toBe("unknown");
  });
});

describe("checkRateLimit (no-op fallback)", () => {
  it("succeeds with no Redis configured — limiter is null", async () => {
    const result = await checkRateLimit(null, "ip:test");
    expect(result.success).toBe(true);
  });

  it("rateLimitByIp passes through when limiter is null — matches startup-without-Upstash", async () => {
    const result = await rateLimitByIp(mockReq({ "x-forwarded-for": "1.2.3.4" }), null);
    expect(result.success).toBe(true);
  });

  it("rateLimitByUser passes through when limiter is null", async () => {
    const result = await rateLimitByUser("privy-did-123", null);
    expect(result.success).toBe(true);
  });
});
