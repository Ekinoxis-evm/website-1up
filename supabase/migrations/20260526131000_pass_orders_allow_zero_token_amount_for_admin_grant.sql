-- The original CHECK predated the admin_grant payment_method. Admin grants
-- legitimately record token_amount_paid = 0 (no payment changed hands), so the
-- old `token_amount_paid > 0` predicate rejected every grant attempt with
-- SQLSTATE 23514 and zero rows ever landed in the table. The new predicate
-- preserves the invariant for real purchases (token / bank) and exempts grants.

ALTER TABLE public.pass_orders
  DROP CONSTRAINT IF EXISTS pass_orders_token_amount_paid_check;

ALTER TABLE public.pass_orders
  ADD CONSTRAINT pass_orders_token_amount_paid_check
  CHECK (
    payment_method = 'admin_grant'
    OR token_amount_paid > 0
  );
