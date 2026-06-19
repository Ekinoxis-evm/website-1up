-- Allow 'card' (Stripe Checkout) as a tournament entry payment method (v2.47.0).
-- Card orders are created `pending_bank` and confirmed asynchronously by the
-- Stripe webhook (checkout.session.completed → apply_payment_event → register).
ALTER TABLE public.tournament_entry_orders
  DROP CONSTRAINT IF EXISTS tournament_entry_orders_payment_method_check;

ALTER TABLE public.tournament_entry_orders
  ADD CONSTRAINT tournament_entry_orders_payment_method_check
  CHECK (payment_method = ANY (ARRAY['token'::text, 'bank'::text, 'cash'::text, 'card'::text]));
