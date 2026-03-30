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
 * Verify the x-signature header sent by MercadoPago on webhook notifications.
 *
 * MP signs with: HMAC_SHA256(ts + "." + dataId, secret)
 * Header format: "ts=<timestamp>,v1=<hex_hash>"
 *
 * @returns true if valid, false otherwise
 */
export function verifyWebhookSignature(
  signatureHeader: string | null,
  dataId: string,
): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    // If secret is not configured, skip verification in development
    if (process.env.NODE_ENV === "production") {
      console.error("[MP Webhook] MERCADOPAGO_WEBHOOK_SECRET is not set — rejecting");
      return false;
    }
    return true;
  }

  if (!signatureHeader) return false;

  try {
    const parts = Object.fromEntries(
      signatureHeader.split(",").map((p) => p.split("=")),
    ) as Record<string, string>;

    const ts = parts["ts"];
    const v1 = parts["v1"];

    if (!ts || !v1) return false;

    const payload = `${ts}.${dataId}`;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(v1, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

// ── Payment lookup ───────────────────────────────────────────────

export async function getPaymentById(paymentId: string) {
  const client = getClient();
  const payment = new Payment(client);
  return payment.get({ id: paymentId });
}
