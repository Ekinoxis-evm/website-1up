import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { verifyWebhookSignature } from "@/lib/mercadopago";

const SECRET = "test_webhook_secret_xyz";
const DATA_ID = "payment_789";
const TS = "1716000000";

function makeValidHeader(ts: string, dataId: string, secret: string): string {
  const payload = `${ts}.${dataId}`;
  const hash = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `ts=${ts},v1=${hash}`;
}

describe("verifyWebhookSignature", () => {
  beforeEach(() => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", SECRET);
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns true for a correctly signed header", () => {
    const header = makeValidHeader(TS, DATA_ID, SECRET);
    expect(verifyWebhookSignature(header, DATA_ID)).toBe(true);
  });

  it("returns false for a tampered hash", () => {
    const header = `ts=${TS},v1=${"0".repeat(64)}`;
    expect(verifyWebhookSignature(header, DATA_ID)).toBe(false);
  });

  it("returns false for null header", () => {
    expect(verifyWebhookSignature(null, DATA_ID)).toBe(false);
  });

  it("returns false when header is missing ts field", () => {
    const hash = crypto.createHmac("sha256", SECRET).update(`${TS}.${DATA_ID}`).digest("hex");
    expect(verifyWebhookSignature(`v1=${hash}`, DATA_ID)).toBe(false);
  });

  it("returns false when header is missing v1 field", () => {
    expect(verifyWebhookSignature(`ts=${TS}`, DATA_ID)).toBe(false);
  });

  it("returns false when dataId differs from what was signed", () => {
    const header = makeValidHeader(TS, DATA_ID, SECRET);
    expect(verifyWebhookSignature(header, "different_payment_id")).toBe(false);
  });

  it("returns false in production when secret is not configured", () => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(verifyWebhookSignature(`ts=${TS},v1=abc`, DATA_ID)).toBe(false);
  });

  it("returns true in development when secret is not configured (bypass)", () => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(verifyWebhookSignature(`ts=${TS},v1=anything`, DATA_ID)).toBe(true);
  });
});
