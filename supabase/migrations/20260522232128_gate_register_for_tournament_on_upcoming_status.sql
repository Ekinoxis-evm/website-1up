-- Tighten the tournament-registration RPC so it can ONLY enroll users into a
-- tournament whose status is still 'upcoming'.
--
-- Before: the function accepted both 'upcoming' and 'live'; it only blocked when
-- is_registration_open was false. That meant if the boolean ever drifted out of sync
-- with status (manual DB edit, a future bug, an admin mistake) a `live` tournament
-- could still accept entries. Application-level code (`api/admin/brackets` start
-- action and `api/admin/tournaments` PUT) now keeps the boolean closed in lockstep
-- with status, but the RPC itself should also refuse non-upcoming tournaments —
-- belt-and-suspenders, matching the documented "no registration after start" spec.
--
-- Also adds an explicit is_active check so soft-deleted tournaments cannot be
-- registered for, even if a stale tournamentId is supplied by a client.
--
-- Audit reference: AUDIT.md → tournament-flow follow-up (2026-05-22), and a
-- first step toward H-7 (un-versioned schema) since the live RPC body now has a
-- matching file in supabase/migrations/.

CREATE OR REPLACE FUNCTION public.register_for_tournament(
  tour_id   integer,
  user_pid  integer,
  privy_uid text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t   tournaments%ROWTYPE;
  cnt integer;
BEGIN
  SELECT * INTO t FROM tournaments WHERE id = tour_id;
  IF NOT FOUND                  THEN RETURN '{"ok":false,"reason":"not_found"}'::jsonb;   END IF;
  IF NOT t.is_active            THEN RETURN '{"ok":false,"reason":"not_active"}'::jsonb;  END IF;
  IF NOT t.is_registration_open THEN RETURN '{"ok":false,"reason":"closed"}'::jsonb;      END IF;
  -- Hardened gate: only 'upcoming' tournaments accept new registrations.
  -- 'live' and 'completed' are terminal w.r.t. signups.
  IF t.status <> 'upcoming'     THEN RETURN '{"ok":false,"reason":"not_active"}'::jsonb;  END IF;

  IF t.max_participants IS NOT NULL THEN
    SELECT COUNT(*) INTO cnt
    FROM tournament_registrations
    WHERE tournament_id = tour_id AND status NOT IN ('cancelled');
    IF cnt >= t.max_participants THEN RETURN '{"ok":false,"reason":"full"}'::jsonb; END IF;
  END IF;

  BEGIN
    INSERT INTO tournament_registrations (tournament_id, user_profile_id, privy_user_id)
    VALUES (tour_id, user_pid, privy_uid);
  EXCEPTION WHEN unique_violation THEN
    RETURN '{"ok":false,"reason":"already_registered"}'::jsonb;
  END;

  RETURN '{"ok":true}'::jsonb;
END;
$function$;
