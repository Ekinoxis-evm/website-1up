-- Security fix: enable RLS on the payment tables so the public anon/PostgREST
-- role can NOT read or write them. These are touched ONLY by API routes using
-- the service-role client (supabaseAdmin), which bypasses RLS — so enabling RLS
-- with NO policies is the project's standard deny-all pattern (matches
-- pass_orders / token_purchase_orders / enrollments, which are all RLS-on, 0
-- policies). Without this, the public anon key could read the financial ledger,
-- tamper the per-service method config, or read/write entry orders.
--
-- tournament_entry_orders shipped RLS-OFF in v2.41.0 (#54) and is live in
-- production — this closes that exposure too.

ALTER TABLE public.payment_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_payment_methods  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_entry_orders  ENABLE ROW LEVEL SECURITY;
