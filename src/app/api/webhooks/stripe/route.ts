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
  // Only tournament_entry is card-enabled in v2.47.0; other kinds are added as
  // card rolls out to them. Unknown kinds are recorded as paid but left for an
  // admin (never silently dropped).
  if (orderKind === "tournament_entry") {
    await fulfillTournamentEntry(orderId, piId);
    return;
  }
  console.error("stripe webhook: card fulfillment not implemented for", orderKind, orderId);
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

  // Record the card payment. became_paid is true for exactly one caller (handles
  // Stripe's at-least-once delivery); a duplicate stripe_payment_intent_id is also
  // blocked by the UNIQUE index.
  const { data: evt, error: evtErr } = await supabaseAdmin.rpc("apply_payment_event", {
    p_order_kind: "tournament_entry",
    p_order_id: orderId,
    p_method: "card",
    p_amount_cop: order.amount_cop ?? undefined,
    p_idempotency_key: piId,
    p_reason: "Pago con tarjeta (Stripe)",
  });
  // The reserved stripe_payment_intent_id column isn't a direct RPC param; persist
  // it on the event for traceability + the unique replay guard.
  if (evtErr) {
    console.error("stripe webhook: apply_payment_event failed", orderId, evtErr.message);
    return;
  }
  const res = evt as { ok: boolean; became_paid: boolean; event_id?: number };
  if (res.event_id) {
    await supabaseAdmin
      .from("payment_events")
      .update({ stripe_payment_intent_id: piId })
      .eq("id", res.event_id);
  }
  if (!res.became_paid) return; // already paid/handled

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
