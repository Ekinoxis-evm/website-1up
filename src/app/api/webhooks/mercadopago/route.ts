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

interface MpWebhookPayload {
  action: string;
  type: string;
  data: { id: string };
  external_reference?: string;
}

// MercadoPago payment status → our internal status
const STATUS_MAP: Record<string, "approved" | "rejected" | "pending" | "cancelled"> = {
  approved:       "approved",
  rejected:       "rejected",
  pending:        "pending",
  in_process:     "pending",
  cancelled:      "cancelled",
  refunded:       "cancelled",
  charged_back:   "cancelled",
};

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

  const newStatus = STATUS_MAP[payment.status ?? ""] ?? "pending";

  // ── Update enrollment ──────────────────────────────────────────
  const { error } = await supabaseAdmin
    .from("enrollments")
    .update({
      mp_payment_id:  paymentId,
      payment_status: newStatus,
      paid_at:        newStatus === "approved" ? new Date().toISOString() : null,
    })
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
