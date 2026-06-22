// Stripe webhook for the `card` method (v2.47.0). Inert unless PAYMENTS_CARD_LIVE
// is on AND STRIPE_WEBHOOK_SECRET is set. Verifies the signature FIRST, then on a
// completed+paid Checkout Session records the payment via apply_payment_event
// (idempotent: single-confirmed invariant + stripe_payment_intent_id UNIQUE) and
// fulfills the order. Returns 200 on handled/ignored events so Stripe stops
// retrying; 400 only on a bad signature.

import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { constructStripeEvent, paymentIntentId } from "@/lib/payments/stripe";
import { decideStripeCheckout } from "@/lib/payments/stripeWebhookDecision";
import { revalidatePath } from "next/cache";
import type { OrderKind } from "@/lib/payments/orderKind";

export async function POST(req: NextRequest) {
  // Inert when card isn't live or no secret is configured — nothing to verify against.
  if (process.env.PAYMENTS_CARD_LIVE !== "true" || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ ignored: "card_not_live" });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new NextResponse("missing signature", { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = constructStripeEvent(payload, sig);
  } catch {
    return new NextResponse("invalid signature", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const decision = decideStripeCheckout({
    type: event.type,
    paymentStatus: session.payment_status ?? null,
    orderKind: session.metadata?.order_kind,
    orderId: session.metadata?.order_id,
    paymentIntentId: paymentIntentId(session),
  });
  if (!decision.fulfill) return NextResponse.json({ ignored: decision.reason });

  await recordAndFulfill(decision.orderKind, decision.orderId, decision.paymentIntentId);
  return NextResponse.json({ received: true });
}

async function recordAndFulfill(orderKind: OrderKind, orderId: number, piId: string) {
  // Card is live across all four paid services. Each fulfiller records the COP
  // receipt via apply_payment_event (idempotent) and then performs the
  // service-specific side-effect — except token_purchase, which deliberately
  // leaves delivery to the admin's on-chain $1UP send.
  switch (orderKind) {
    case "tournament_entry": await fulfillTournamentEntry(orderId, piId); return;
    case "pass":             await fulfillPass(orderId, piId);            return;
    case "enrollment":       await fulfillEnrollment(orderId, piId);      return;
    case "token_purchase":   await fulfillTokenPurchase(orderId, piId);   return;
    default:
      console.error("stripe webhook: card fulfillment not implemented for", orderKind, orderId);
  }
}

// Records the COP receipt and persists the PaymentIntent id on the resulting
// event. Returns whether THIS call flipped the order to paid (true for exactly
// one caller — handles Stripe's at-least-once delivery; the
// stripe_payment_intent_id UNIQUE index is the second guard). null on a hard
// failure that should abort fulfillment.
async function recordCardPayment(
  orderKind: OrderKind,
  orderId: number,
  piId: string,
  amountCop: number | null | undefined,
  reason: string,
): Promise<boolean | null> {
  const { data: evt, error } = await supabaseAdmin.rpc("apply_payment_event", {
    p_order_kind: orderKind,
    p_order_id: orderId,
    p_method: "card",
    p_amount_cop: amountCop ?? undefined,
    p_idempotency_key: piId,
    p_reason: reason,
  });
  if (error) {
    console.error("stripe webhook: apply_payment_event failed", orderKind, orderId, error.message);
    return null;
  }
  const res = evt as { ok: boolean; became_paid: boolean; event_id?: number };
  if (res.event_id) {
    await supabaseAdmin
      .from("payment_events")
      .update({ stripe_payment_intent_id: piId })
      .eq("id", res.event_id);
  }
  return res.became_paid;
}

async function fulfillTournamentEntry(orderId: number, piId: string) {
  const { data: order } = await supabaseAdmin
    .from("tournament_entry_orders")
    .select("id, tournament_id, user_profile_id, privy_user_id, amount_cop, registration_id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) {
    console.error("stripe webhook: tournament_entry order not found", orderId);
    return;
  }

  const becamePaid = await recordCardPayment("tournament_entry", orderId, piId, order.amount_cop, "Pago con tarjeta (Stripe)");
  if (becamePaid !== true) return; // failed, or already paid/handled

  // Fulfillment: take the slot. If the tournament filled after a captured card
  // payment, keep the order confirmed (registration_id null) as the manual-refund
  // evidence — no refunds in v1.
  const { data: rpcResult } = await supabaseAdmin.rpc("register_for_tournament", {
    tour_id: order.tournament_id,
    user_pid: order.user_profile_id,
    privy_uid: order.privy_user_id,
  });
  const rpc = (rpcResult ?? { ok: false }) as { ok: boolean };

  let registrationId: number | null = null;
  if (rpc.ok) {
    const { data: reg } = await supabaseAdmin
      .from("tournament_registrations")
      .select("id")
      .eq("tournament_id", order.tournament_id)
      .eq("user_profile_id", order.user_profile_id)
      .eq("status", "registered")
      .maybeSingle();
    registrationId = reg?.id ?? null;
  }

  await supabaseAdmin
    .from("tournament_entry_orders")
    .update({ status: "confirmed", registration_id: registrationId, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  revalidatePath("/torneos");
  revalidatePath("/torneos/[slug]", "page");
  revalidatePath("/admin/torneos/[slug]/manage", "page");
}

// 1UP Pass: record the COP receipt, then activate the pass EXACTLY like the
// admin bank-approve does (computePassWindow stacking + status='confirmed' +
// started_at/expires_at). The `passes` trigger mirrors the confirmed order.
async function fulfillPass(orderId: number, piId: string) {
  const { data: order } = await supabaseAdmin
    .from("pass_orders")
    .select("id, user_profile_id, duration_days, token_amount_paid, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) {
    console.error("stripe webhook: pass order not found", orderId);
    return;
  }

  // COP for a pass = token_amount_paid × 1.000 (1 $1UP = 1.000 COP).
  const amountCop = Math.round(Number(order.token_amount_paid) * 1000);
  const becamePaid = await recordCardPayment("pass", orderId, piId, amountCop, "Pago con tarjeta (Stripe)");
  if (becamePaid !== true) return;

  // Stacking: if the user already has an active confirmed pass, extend from its
  // expiry; otherwise start now. Mirrors the admin approve path.
  const now = new Date();
  const { data: activeOrder } = await supabaseAdmin
    .from("pass_orders")
    .select("expires_at")
    .eq("user_profile_id", order.user_profile_id)
    .eq("status", "confirmed")
    .gt("expires_at", now.toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const baseDate = activeOrder?.expires_at ? new Date(activeOrder.expires_at) : now;
  const expiresAt = new Date(baseDate.getTime() + order.duration_days * 24 * 60 * 60 * 1000);

  await supabaseAdmin
    .from("pass_orders")
    .update({
      status:     "confirmed",
      paid_at:    now.toISOString(),
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .eq("id", orderId);

  revalidatePath("/app/pass");
  revalidatePath("/admin/pass-orders");
}

// Academia course: record the COP receipt, then grant access — set
// payment_status='approved' + paid_at, identical to the admin approve.
async function fulfillEnrollment(orderId: number, piId: string) {
  const { data: order } = await supabaseAdmin
    .from("enrollments")
    .select("id, final_price_cop, payment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) {
    console.error("stripe webhook: enrollment not found", orderId);
    return;
  }

  const becamePaid = await recordCardPayment("enrollment", orderId, piId, order.final_price_cop, "Pago con tarjeta (Stripe)");
  if (becamePaid !== true) return;

  await supabaseAdmin
    .from("enrollments")
    .update({ payment_status: "approved", paid_at: new Date().toISOString() })
    .eq("id", orderId);

  revalidatePath("/academia");
  revalidatePath("/admin/enrollments");
  revalidatePath("/app/academia");
}

// $1UP purchase — the NUANCE: record the COP receipt ONLY. Do NOT auto-approve.
// The admin must still send the $1UP on-chain (verifyTokenTransfer +
// approved_tx_hash). The order stays `pending`; we flag it so the admin panel
// shows it as paid-but-awaiting-delivery.
async function fulfillTokenPurchase(orderId: number, piId: string) {
  const { data: order } = await supabaseAdmin
    .from("token_purchase_orders")
    .select("id, cop_amount, status, admin_notes")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) {
    console.error("stripe webhook: token_purchase order not found", orderId);
    return;
  }

  const becamePaid = await recordCardPayment("token_purchase", orderId, piId, order.cop_amount, "Pago con tarjeta (Stripe)");
  if (becamePaid !== true) return;

  // Surface the paid-but-undelivered state to the admin without changing status.
  const flag = "Pagado con tarjeta — pendiente envío de $1UP";
  const notes = order.admin_notes ? `${order.admin_notes}\n${flag}` : flag;
  await supabaseAdmin
    .from("token_purchase_orders")
    .update({ admin_notes: notes, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  revalidatePath("/admin/token-orders");
  revalidatePath("/app");
}
