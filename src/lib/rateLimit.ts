// Rate limiting for public + abuse-prone endpoints (audit H-4).
//
// Backed by Upstash Redis + @upstash/ratelimit (sliding window). Designed to be
// safe-by-default: when the UPSTASH_REDIS_REST_* env vars are absent every limiter
// is `null` and `checkRateLimit` passes through. That means the code can ship
// before Upstash is provisioned — the moment the env vars land on Vercel,
// rate-limiting activates with no further deploys.
//
// Provision via the Vercel Marketplace → Upstash → "Add to Project". This auto-
// adds `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to the project.
//
// Limits per AUDIT.md H-4:
//   - anonStrict   5 / min / IP   — anon mutations (recruitment, intro-token oracle)
//   - anonRead    30 / min / IP   — anon reads with DB side-effects (referral validate)
//   - authMutate  20 / min / user — authed POSTs that trigger on-chain RPC calls

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Vercel's Upstash Marketplace integration appends its own KV-style suffixes to
// whatever prefix you pick, so with the recommended prefix `UPSTASH_REDIS_REST`
// the live env vars come out as `UPSTASH_REDIS_REST_KV_REST_API_URL` /
// `UPSTASH_REDIS_REST_KV_REST_API_TOKEN`. We accept both names — the canonical
// short ones first (`Redis.fromEnv()`-compatible if someone sets them manually),
// then the Vercel-generated long ones.
const URL   = process.env.UPSTASH_REDIS_REST_URL   ?? process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;

const redis: Redis | null = URL && TOKEN ? new Redis({ url: URL, token: TOKEN }) : null;

if (!redis && process.env.NODE_ENV === "production") {
  console.warn(
    "[rateLimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — " +
    "all limiters are pass-through. Provision Upstash via Vercel Marketplace to activate.",
  );
}

function makeLimiter(name: string, limit: number, window: `${number} ${"s" | "m" | "h" | "d"}`): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter:   Ratelimit.slidingWindow(limit, window),
    prefix:    `rl:${name}`,
    analytics: true,
  });
}

export const limiters = {
  anonStrict: makeLimiter("anon-strict",  5, "1 m"),
  anonRead:   makeLimiter("anon-read",   30, "1 m"),
  authMutate: makeLimiter("auth-mutate", 20, "1 m"),
};

// Vercel sets `x-forwarded-for` (proxy-trusted); we take the first hop.
// `x-real-ip` is the fallback for some edge configurations. Falls back to
// a single "unknown" bucket — degraded but never throws on missing headers.
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

type CheckResult = { success: true } | { success: false; response: NextResponse };

export async function checkRateLimit(limiter: Ratelimit | null, key: string): Promise<CheckResult> {
  if (!limiter) return { success: true };

  const r = await limiter.limit(key);
  if (r.success) return { success: true };

  const retryAfter = Math.max(1, Math.ceil((r.reset - Date.now()) / 1000));
  return {
    success:  false,
    response: NextResponse.json(
      { error: "Demasiadas solicitudes. Espera un momento e intenta de nuevo.", retryAfter },
      {
        status: 429,
        headers: {
          "Retry-After":          String(retryAfter),
          "X-RateLimit-Limit":    String(r.limit),
          "X-RateLimit-Remaining": String(r.remaining),
          "X-RateLimit-Reset":    String(r.reset),
        },
      },
    ),
  };
}

export const rateLimitByIp   = (req: NextRequest, limiter: Ratelimit | null) =>
  checkRateLimit(limiter, `ip:${getClientIp(req)}`);

export const rateLimitByUser = (userId: string, limiter: Ratelimit | null) =>
  checkRateLimit(limiter, `user:${userId}`);
