-- Add a payment_method to $1UP purchase orders so they can be paid in cash
-- (v2.45.0). The table was bank-only; cash reuses the same admin-review flow
-- (the admin still SENDS the $1UP on-chain on approval — cash only changes how
-- the COP is collected, recording the peso receipt with no comprobante).
-- Default 'bank' preserves every existing row's meaning.
ALTER TABLE public.token_purchase_orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'bank';

ALTER TABLE public.token_purchase_orders
  DROP CONSTRAINT IF EXISTS token_purchase_orders_payment_method_check;

ALTER TABLE public.token_purchase_orders
  ADD CONSTRAINT token_purchase_orders_payment_method_check
  CHECK (payment_method = ANY (ARRAY['bank'::text, 'cash'::text]));

-- Cash orders have no uploaded proof: make comprobante_url nullable but keep it
-- required for bank orders via a CHECK.
ALTER TABLE public.token_purchase_orders ALTER COLUMN comprobante_url DROP NOT NULL;

ALTER TABLE public.token_purchase_orders
  DROP CONSTRAINT IF EXISTS token_purchase_orders_bank_needs_comprobante;

ALTER TABLE public.token_purchase_orders
  ADD CONSTRAINT token_purchase_orders_bank_needs_comprobante
  CHECK (payment_method <> 'bank' OR comprobante_url IS NOT NULL);
