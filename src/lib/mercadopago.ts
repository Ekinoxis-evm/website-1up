/**
 * MercadoPago integration helpers.
 *
 * Uses the official `mercadopago` Node.js SDK v2.
 * Docs: https://github.com/mercadopago/sdk-nodejs
 */

import MercadoPagoConfig, { Preference, Payment } from "mercadopago";
import crypto from "crypto";

function getClient(): MercadoPagoConfig {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN is not set");
  return new MercadoPagoConfig({ accessToken: token });
}

// ── Types ────────────────────────────────────────────────────────

export interface CreatePreferenceInput {
  enrollmentId: number;
  courseId: number;
  courseName: string;
  unitPrice: number;        // final price in COP (after discounts)
  originalPrice: number;    // original price in COP (for display)
  discountPct: number;      // 0–100
  buyerEmail: string;
}

export interface MpPreferenceResult {
  preferenceId: string;
  initPoint: string;        // production checkout URL
  sandboxInitPoint: string; // sandbox checkout URL
}

// ── Preference creation ──────────────────────────────────────────

export async function createCoursePreference(
  input: CreatePreferenceInput,
): Promise<MpPreferenceResult> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://1upesports.org";
  const client = getClient();
  const preference = new Preference(client);

  const response = await preference.create({
    body: {
      items: [
        {
          id: `course-${input.courseId}`,
          title: input.courseName,
          quantity: 1,
          unit_price: input.unitPrice,
          currency_id: "COP",
        },
      ],
      payer: {
        email: input.buyerEmail,
      },
      back_urls: {
        success: `${baseUrl}/academia?payment=success`,
        failure: `${baseUrl}/academia?payment=failure`,
        pending: `${baseUrl}/academia?payment=pending`,
      },
      auto_return: "approved",
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
      external_reference: String(input.enrollmentId),
      metadata: {
        enrollment_id: input.enrollmentId,
        course_id: input.courseId,
        original_price: input.originalPrice,
        discount_pct: input.discountPct,
      },
    },
  });

  if (!response.id || !response.init_point) {
    throw new Error("MercadoPago did not return a valid preference");
  }

  return {
    preferenceId: response.id,
    initPoint: response.init_point,
    sandboxInitPoint: response.sandbox_init_point ?? response.init_point,
  };
}

// ── Webhook verification ─────────────────────────────────────────

/**
 * Maximum age of an x-signature timestamp before it is considered stale and
 * rejected as a replay attempt. MP's documented webhook delivery latency is
 * well under this window. H-9 audit fix.
 */
export const WEBHOOK_TS_MAX_AGE_SECONDS = 10 * 60; // 10 minutes

export type VerifyWebhookSignatureResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "missing_secret"
        | "missing_header"
        | "malformed_header"
        | "missing_request_id"
        | "stale_timestamp"
        | "bad_signature";
      reason: string;
    };

/**
 * Verify the `x-signature` header sent by MercadoPago on webhook deliveries.
 *
 * MP's documented signing template is:
 *   manifest = `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 *   v1       = HMAC_SHA256(manifest, secret)
 * The `x-signature` header has the form `ts=<unix>,v1=<hex>`.
 *
 * Security rules (H-9 + audit fail-closed note):
 *   - If `MERCADOPAGO_WEBHOOK_SECRET` is unset we ALWAYS reject — including in
 *     development. There is no silent bypass.
 *   - `id`, `x-request-id`, `ts`, and `v1` must all be present.
 *   - `ts` must be within `WEBHOOK_TS_MAX_AGE_SECONDS` of now (replay window).
 *   - HMAC comparison uses constant-time equality.
 *
 * @param signatureHeader  Value of `x-signature`
 * @param requestId        Value of `x-request-id`
 * @param dataId           `data.id` from the JSON body (also passed as `?id=` on the URL)
 * @param nowSeconds       Override `Date.now()` for tests; defaults to current unix time
 */
export function verifyWebhookSignature(
  signatureHeader: string | null,
  requestId: string | null,
  dataId: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): VerifyWebhookSignatureResult {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    return {
      ok: false,
      code: "missing_secret",
      reason: "MERCADOPAGO_WEBHOOK_SECRET is not configured — refusing to verify.",
    };
  }

  if (!signatureHeader) {
    return { ok: false, code: "missing_header", reason: "Missing x-signature header." };
  }
  if (!requestId) {
    return {
      ok: false,
      code: "missing_request_id",
      reason: "Missing x-request-id header.",
    };
  }
  if (!dataId) {
    return {
      ok: false,
      code: "malformed_header",
      reason: "Missing data.id in body.",
    };
  }

  let parts: Record<string, string>;
  try {
    parts = Object.fromEntries(
      signatureHeader.split(",").map((p) => {
        const eq = p.indexOf("=");
        if (eq === -1) return [p.trim(), ""];
        return [p.slice(0, eq).trim(), p.slice(eq + 1).trim()];
      }),
    ) as Record<string, string>;
  } catch {
    return { ok: false, code: "malformed_header", reason: "Could not parse x-signature." };
  }

  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) {
    return {
      ok: false,
      code: "malformed_header",
      reason: "x-signature is missing ts or v1.",
    };
  }

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || tsNum <= 0) {
    return { ok: false, code: "malformed_header", reason: "ts is not a number." };
  }
  if (Math.abs(nowSeconds - tsNum) > WEBHOOK_TS_MAX_AGE_SECONDS) {
    return {
      ok: false,
      code: "stale_timestamp",
      reason: `ts is more than ${WEBHOOK_TS_MAX_AGE_SECONDS}s away from current time.`,
    };
  }

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  let a: Buffer;
  let b: Buffer;
  try {
    a = Buffer.from(v1, "hex");
    b = Buffer.from(expected, "hex");
  } catch {
    return { ok: false, code: "bad_signature", reason: "v1 is not valid hex." };
  }
  if (a.length !== b.length) {
    return { ok: false, code: "bad_signature", reason: "Signature length mismatch." };
  }
  if (!crypto.timingSafeEqual(a, b)) {
    return { ok: false, code: "bad_signature", reason: "Signature mismatch." };
  }

  return { ok: true };
}

// ── Payment lookup ───────────────────────────────────────────────

export async function getPaymentById(paymentId: string) {
  const client = getClient();
  const payment = new Payment(client);
  return payment.get({ id: paymentId });
}
