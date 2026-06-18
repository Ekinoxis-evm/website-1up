-- Allow 'cash' as a tournament entry payment method (v2.43.0).
-- Cash reuses the manual-review path: the user selects it, the order lands
-- pending_bank, and an admin approves it (attesting receipt with a mandatory
-- note) — like a bank transfer, minus the uploaded comprobante. The confirmed
-- cash payment is recorded in payment_events via apply_payment_event.
ALTER TABLE public.tournament_entry_orders
  DROP CONSTRAINT IF EXISTS tournament_entry_orders_payment_method_check;

ALTER TABLE public.tournament_entry_orders
  ADD CONSTRAINT tournament_entry_orders_payment_method_check
  CHECK (payment_method = ANY (ARRAY['token'::text, 'bank'::text, 'cash'::text]));
