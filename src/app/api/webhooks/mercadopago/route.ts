/**
 * /api/webhooks/mercadopago — POST
 *
 * Receives payment notifications from MercadoPago.
 * Verifies the x-signature header before processing.
 * Updates enrollment payment_status and records mp_payment_id.
 *
 * Must be publicly accessible — no auth token required.
 * Security: verified via HMAC-SHA256 signature.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyWebhookSignature, getPaymentById } from "@/lib/mercadopago";
import { revalidatePath } from "next/cache";
import {
  decideWebhookAction,
  STATUS_MAP,
  type EnrollmentStatus,
} from "@/lib/mpWebhookDecision";

interface MpWebhookPayload {
  action: string;
  type: string;
  data: { id: string };
  external_reference?: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as MpWebhookPayload;

  // ── Signature verification ─────────────────────────────────────
  const signature = req.headers.get("x-signature");
  const dataId = body.data?.id ?? "";

  if (!verifyWebhookSignature(signature, dataId)) {
    console.warn("[MP Webhook] Invalid signature — rejecting");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Only handle payment notifications
  if (body.type !== "payment") {
    return NextResponse.json({ ok: true });
  }

  const paymentId = body.data.id;

  // ── Fetch full payment from MP API ─────────────────────────────
  let payment;
  try {
    payment = await getPaymentById(paymentId);
  } catch (err) {
    console.error("[MP Webhook] Failed to fetch payment:", err);
    return NextResponse.json({ error: "Failed to fetch payment" }, { status: 502 });
  }

  const externalRef = payment.external_reference;
  if (!externalRef) {
    return NextResponse.json({ ok: true }); // not our enrollment
  }

  const enrollmentId = parseInt(externalRef, 10);
  if (isNaN(enrollmentId)) {
    return NextResponse.json({ ok: true });
  }

  // ── Idempotency + transition guard ────────────────────────────
  const { data: enrollment, error: fetchErr } = await supabaseAdmin
    .from("enrollments")
    .select("id, payment_status, mp_payment_id, paid_at")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (fetchErr) {
    console.error("[MP Webhook] Failed to fetch enrollment:", fetchErr);
    return NextResponse.json({ error: "DB read failed" }, { status: 500 });
  }
  if (!enrollment) {
    return NextResponse.json({ ok: true });
  }

  const decision = decideWebhookAction(
    {
      payment_status: enrollment.payment_status as EnrollmentStatus | null,
      mp_payment_id:  enrollment.mp_payment_id,
      paid_at:        enrollment.paid_at,
    },
    { paymentId, mpStatus: payment.status ?? "" },
  );

  if (decision.kind === "ignore_other_payment") {
    console.warn(
      `[MP Webhook] Enrollment ${enrollmentId} already bound to payment ${enrollment.mp_payment_id}; ignoring delivery for ${paymentId}`,
    );
    return NextResponse.json({ ok: true });
  }
  if (decision.kind === "dedupe") {
    return NextResponse.json({ ok: true, deduped: true });
  }
  if (decision.kind === "ignore_regression") {
    console.warn(
      `[MP Webhook] Ignoring disallowed transition ${enrollment.payment_status} → ${STATUS_MAP[payment.status ?? ""] ?? "pending"} for enrollment ${enrollmentId}`,
    );
    return NextResponse.json({ ok: true, ignored: true });
  }

  // ── Update enrollment ──────────────────────────────────────────
  const newStatus: EnrollmentStatus = STATUS_MAP[payment.status ?? ""] ?? "pending";
  const update: {
    mp_payment_id:  string;
    payment_status: EnrollmentStatus;
    paid_at?:       string;
  } = {
    mp_payment_id:  paymentId,
    payment_status: newStatus,
  };
  if (decision.stampPaidAt) {
    update.paid_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from("enrollments")
    .update(update)
    .eq("id", enrollmentId);

  if (error) {
    console.error("[MP Webhook] Failed to update enrollment:", error);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }

  if (newStatus === "approved") {
    revalidatePath("/admin/enrollments");
  }

  return NextResponse.json({ ok: true });
}
