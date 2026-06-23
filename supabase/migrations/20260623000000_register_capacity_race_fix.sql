-- Fix a capacity race in register_for_tournament (v2.54.1).
--
-- The function read COUNT(*) of registrations, checked it against
-- max_participants, then INSERTed — a read-then-write TOCTOU. Under a burst of
-- concurrent registrations for the last few spots, many callers read the same
-- pre-insert count, all pass the check, and the tournament over-fills.
--
-- Fix: `SELECT ... FOR UPDATE` on the tournament row at the top serializes
-- concurrent registrations for the SAME tournament (different tournaments don't
-- contend), so the COUNT + INSERT is effectively atomic per tournament. Nothing
-- else changes. Covers both free registration and paid-entry (both call this RPC).

CREATE OR REPLACE FUNCTION public.register_for_tournament(tour_id integer, user_pid integer, privy_uid text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  t   tournaments%ROWTYPE;
  cnt integer;
BEGIN
  -- FOR UPDATE: lock the tournament row so concurrent registrations for this
  -- tournament run one at a time through the capacity check below.
  SELECT * INTO t FROM tournaments WHERE id = tour_id FOR UPDATE;
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
