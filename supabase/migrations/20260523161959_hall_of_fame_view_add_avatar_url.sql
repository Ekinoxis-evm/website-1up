-- Rebuild the hall_of_fame view to expose user_profiles.avatar_url so
-- /torneos can render the medal list with each player's profile picture.
-- Applied to live DB on 2026-05-23 via Supabase MCP; committed here so the
-- baseline + repo stay in sync.
--
-- NOTE: this revision did NOT set security_invoker = on, which the database
-- linter flagged as ERROR `security_definer_view`. The follow-up migration
-- `20260524050326_audit_closure_v2_36_4.sql` adds `SET (security_invoker = on)`
-- to close that finding.

DROP VIEW IF EXISTS public.hall_of_fame;

CREATE VIEW public.hall_of_fame AS
  SELECT up.id                                          AS user_profile_id,
         up.username,
         up.nombre,
         up.apellidos,
         count(*) FILTER (WHERE tr."position" = 1)      AS gold_count,
         count(*) FILTER (WHERE tr."position" = 2)      AS silver_count,
         count(*) FILTER (WHERE tr."position" = 3)      AS bronze_count,
         COALESCE(sum(tr.points), 0::bigint)            AS total_points,
         up.avatar_url
    FROM public.user_profiles up
    JOIN public.tournament_results tr ON tr.user_profile_id = up.id
   GROUP BY up.id, up.username, up.nombre, up.apellidos, up.avatar_url
   ORDER BY COALESCE(sum(tr.points), 0::bigint) DESC,
            count(*) FILTER (WHERE tr."position" = 1) DESC;
