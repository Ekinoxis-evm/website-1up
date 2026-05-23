import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import {
  verifyWebhookSignature,
  WEBHOOK_TS_MAX_AGE_SECONDS,
} from "@/lib/mercadopago";

const SECRET     = "test_webhook_secret_xyz";
const DATA_ID    = "payment_789";
const REQUEST_ID = "req-abc-123";
const NOW        = 1_716_000_000; // fixed unix seconds for deterministic tests

function makeValidHeader(ts: number, dataId: string, requestId: string, secret: string): string {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${ts},v1=${hash}`;
}

describe("verifyWebhookSignature — H-9 canonical manifest + replay window", () => {
  beforeEach(() => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", SECRET);
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns ok for a correctly signed header (id;request-id;ts manifest)", () => {
    const header = makeValidHeader(NOW, DATA_ID, REQUEST_ID, SECRET);
    expect(verifyWebhookSignature(header, REQUEST_ID, DATA_ID, NOW)).toEqual({ ok: true });
  });

  it("rejects a tampered v1 hash with code bad_signature", () => {
    const header = `ts=${NOW},v1=${"0".repeat(64)}`;
    const r = verifyWebhookSignature(header, REQUEST_ID, DATA_ID, NOW);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("bad_signature");
  });

  it("rejects a null x-signature header with code missing_header", () => {
    const r = verifyWebhookSignature(null, REQUEST_ID, DATA_ID, NOW);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("missing_header");
  });

  it("rejects when x-request-id is missing (required by canonical manifest)", () => {
    const header = makeValidHeader(NOW, DATA_ID, REQUEST_ID, SECRET);
    const r = verifyWebhookSignature(header, null, DATA_ID, NOW);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("missing_request_id");
  });

  it("rejects when dataId is empty", () => {
    const header = makeValidHeader(NOW, DATA_ID, REQUEST_ID, SECRET);
    const r = verifyWebhookSignature(header, REQUEST_ID, "", NOW);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("malformed_header");
  });

  it("rejects when ts is missing from x-signature", () => {
    const hash = crypto
      .createHmac("sha256", SECRET)
      .update(`id:${DATA_ID};request-id:${REQUEST_ID};ts:${NOW};`)
      .digest("hex");
    const r = verifyWebhookSignature(`v1=${hash}`, REQUEST_ID, DATA_ID, NOW);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("malformed_header");
  });

  it("rejects when v1 is missing from x-signature", () => {
    const r = verifyWebhookSignature(`ts=${NOW}`, REQUEST_ID, DATA_ID, NOW);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("malformed_header");
  });

  it("rejects when dataId differs from what was signed (signature mismatch)", () => {
    const header = makeValidHeader(NOW, DATA_ID, REQUEST_ID, SECRET);
    const r = verifyWebhookSignature(header, REQUEST_ID, "different_payment_id", NOW);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("bad_signature");
  });

  it("rejects when request-id differs from what was signed", () => {
    const header = makeValidHeader(NOW, DATA_ID, REQUEST_ID, SECRET);
    const r = verifyWebhookSignature(header, "different-req-id", DATA_ID, NOW);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("bad_signature");
  });

  it("rejects a stale ts (older than the replay window)", () => {
    const oldTs = NOW - WEBHOOK_TS_MAX_AGE_SECONDS - 1;
    const header = makeValidHeader(oldTs, DATA_ID, REQUEST_ID, SECRET);
    const r = verifyWebhookSignature(header, REQUEST_ID, DATA_ID, NOW);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("stale_timestamp");
  });

  it("rejects a future ts beyond the replay window", () => {
    const futureTs = NOW + WEBHOOK_TS_MAX_AGE_SECONDS + 1;
    const header = makeValidHeader(futureTs, DATA_ID, REQUEST_ID, SECRET);
    const r = verifyWebhookSignature(header, REQUEST_ID, DATA_ID, NOW);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("stale_timestamp");
  });

  it("accepts a ts at the edge of the replay window", () => {
    const edgeTs = NOW - WEBHOOK_TS_MAX_AGE_SECONDS;
    const header = makeValidHeader(edgeTs, DATA_ID, REQUEST_ID, SECRET);
    expect(verifyWebhookSignature(header, REQUEST_ID, DATA_ID, NOW)).toEqual({ ok: true });
  });

  it("fails closed in production when secret is unset (missing_secret)", () => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    const r = verifyWebhookSignature(`ts=${NOW},v1=abc`, REQUEST_ID, DATA_ID, NOW);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("missing_secret");
  });

  it("fails closed in development when secret is unset (no silent bypass)", () => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");
    const r = verifyWebhookSignature(`ts=${NOW},v1=anything`, REQUEST_ID, DATA_ID, NOW);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("missing_secret");
  });
});
