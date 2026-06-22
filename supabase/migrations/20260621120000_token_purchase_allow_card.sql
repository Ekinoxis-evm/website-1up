-- Allow 'card' (Stripe Checkout) on $1UP purchases (v2.52.0 card rollout).
-- Card pays the COP; the admin still sends the $1UP on-chain (the existing
-- approved_tx_hash step), so a card token order is "paid, pendiente envío".
-- pass_orders + enrollments are free-text payment_method (no migration).
ALTER TABLE public.token_purchase_orders
  DROP CONSTRAINT IF EXISTS token_purchase_orders_payment_method_check;

ALTER TABLE public.token_purchase_orders
  ADD CONSTRAINT token_purchase_orders_payment_method_check
  CHECK (payment_method = ANY (ARRAY['bank'::text, 'cash'::text, 'card'::text]));
