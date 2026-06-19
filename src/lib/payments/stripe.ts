// Stripe integration for the `card` payment method (v2.47.0). Card payments use
// Stripe Checkout Sessions (hosted) with DYNAMIC payment methods — so Apple Pay /
// Google Pay turn on automatically from the Dashboard, with no card-element / PCI
// work. Everything here is gated by PAYMENTS_CARD_LIVE: with it unset/false the
// helpers throw / the webhook is inert, so card stays invisible until we flip it on.
//
// COP note: the account settles in USD, but we present in COP. Stripe treats COP as
// a TWO-decimal currency, so the API amount is centavos = pesos × 100.

import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function isCardLive(): boolean {
  return process.env.PAYMENTS_CARD_LIVE === "true";
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!_stripe) _stripe = new Stripe(key); // pin to the account's default API version
  return _stripe;
}

// Maps an order_kind to its catalog Product, built once in Stripe via the MCP.
// Set per environment so test mode and live mode reference each mode's own
// product IDs; when unset we fall back to an inline product_data name (test mode
// works with zero setup — at the cost of an ad-hoc product per session).
const PRODUCT_ENV: Record<string, string> = {
  pass: "STRIPE_PRODUCT_PASS",
  tournament_entry: "STRIPE_PRODUCT_TOURNAMENT_ENTRY",
  token_purchase: "STRIPE_PRODUCT_TOKEN_PURCHASE",
  enrollment: "STRIPE_PRODUCT_ENROLLMENT",
};

function productId(orderKind: string): string | undefined {
  const envName = PRODUCT_ENV[orderKind];
  return envName ? process.env[envName] : undefined;
}

export interface CardCheckoutArgs {
  orderKind: string;
  orderId: number;
  amountCop: number; // whole pesos
  productName: string; // line-item label (e.g. the specific tournament/course)
  customerEmail?: string | null;
  successUrl: string;
  cancelUrl: string;
}

// Creates a hosted Checkout Session for a single COP charge tied to an order.
// No payment_method_types → DYNAMIC payment methods (cards + wallets like Apple
// Pay) per the Dashboard. The (order_kind, order_id) live in BOTH the session and
// the PaymentIntent metadata so the webhook can resolve the order from either.
export async function createCardCheckoutSession(args: CardCheckoutArgs): Promise<{ url: string; sessionId: string }> {
  if (!isCardLive()) throw new Error("card_not_live");
  const stripe = getStripe();
  const metadata = { order_kind: args.orderKind, order_id: String(args.orderId) };

  const prod = productId(args.orderKind);
  const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
    currency: "cop",
    unit_amount: Math.round(args.amountCop * 100), // COP → centavos (two-decimal)
    ...(prod
      ? { product: prod }
      : { product_data: { name: args.productName } }),
  };

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ quantity: 1, price_data: priceData }],
    customer_email: args.customerEmail ?? undefined,
    client_reference_id: `${args.orderKind}:${args.orderId}`,
    metadata,
    payment_intent_data: { metadata },
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
  });

  if (!session.url) throw new Error("stripe_no_session_url");
  return { url: session.url, sessionId: session.id };
}

// Verifies a webhook payload against STRIPE_WEBHOOK_SECRET (HMAC + replay window,
// handled inside the SDK). Throws on a bad/forged signature.
export function constructStripeEvent(payload: string, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return getStripe().webhooks.constructEvent(payload, signature, secret);
}

export function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (!pi) return null;
  return typeof pi === "string" ? pi : pi.id;
}
