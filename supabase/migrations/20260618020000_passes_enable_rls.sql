-- Security fix (continuation of 20260618010000): the `passes` table (v2.38.0
-- first-class pass asset) also shipped with RLS disabled while anon held grants,
-- exposing owner/wallet/state to the public anon key and allowing tampering
-- (e.g. flipping a pass to 'active'). It is touched ONLY via service-role routes
-- (/api/user/passes*, /api/admin/passes*, admin pages). Deny-all RLS, same
-- pattern as every other order/asset table. Applied live via the Supabase MCP.
--
-- After this, NO table in the public schema has RLS disabled.
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;
