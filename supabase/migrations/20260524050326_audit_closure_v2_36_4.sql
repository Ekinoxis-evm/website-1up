-- =====================================================================
-- Audit closure pass — v2.36.4
-- =====================================================================
-- Closes the 4 actionable advisor findings from the post-overhaul audit:
--   1. hall_of_fame view: switch to security_invoker so it runs as the
--      querying role, not the view owner. (Was flagged ERROR-level by
--      the Supabase linter after the v2.31.0 rebuild — the
--      `DROP VIEW; CREATE VIEW;` pattern doesn't carry forward
--      `security_invoker = on`.)
--   2. set_updated_at: pin search_path so function-hijack via
--      search_path manipulation is impossible. AUDIT.md claimed this was
--      fixed in 2.29.6 but the live `pg_proc.proconfig` was null.
--   3. report_match_result: drop entirely — the RPC has no callers
--      (only auto-generated in database.types.ts). It was SECURITY
--      DEFINER with EXECUTE granted to PUBLIC, anon, and authenticated.
--      Dropping is simpler than locking down a function nobody uses.
--   4. tournament_registrations RLS policy: wrap current_setting() in
--      (select …) so it evaluates once per query, not per row. Removes
--      the auth_rls_initplan WARN advisory.
--
-- Applied 2026-05-24 via Supabase MCP; advisors re-run post-apply
-- confirmed all four findings cleared. Remaining advisor info-level
-- items are documented in AUDIT.md as correct-by-design.
-- =====================================================================

-- 1. hall_of_fame view → security_invoker
ALTER VIEW public.hall_of_fame SET (security_invoker = on);

-- 2. set_updated_at search_path pin
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;

-- 3. Drop dead report_match_result
DROP FUNCTION IF EXISTS public.report_match_result(bigint, integer, integer);

-- 4. tournament_registrations RLS policy — evaluate auth once per query
DROP POLICY IF EXISTS "user reads own registrations" ON public.tournament_registrations;
CREATE POLICY "user reads own registrations" ON public.tournament_registrations
  FOR SELECT
  USING (
    privy_user_id = ((SELECT current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)
  );
