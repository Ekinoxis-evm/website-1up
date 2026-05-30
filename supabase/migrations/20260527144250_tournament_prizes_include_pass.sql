-- v2.37.0 — allow 1UP Pass as a tournament prize.
--
-- Two shapes are now supported:
--   (a) add-on:    tokens / cop / both + pass on the same prize row
--   (b) pass-only: prize_type='pass', no tokens, no COP
--
-- All existing rows default to includes_pass=false, pass_days=NULL — no data
-- backfill needed. Existing tokens/cop/both shapes keep their amount-consistency
-- semantics for any rows where includes_pass=false.

ALTER TABLE public.tournament_prizes
  ADD COLUMN IF NOT EXISTS includes_pass BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.tournament_prizes
  ADD COLUMN IF NOT EXISTS pass_days INTEGER;

-- Extend prize_type to admit 'pass'
ALTER TABLE public.tournament_prizes
  DROP CONSTRAINT IF EXISTS tournament_prizes_prize_type_check;
ALTER TABLE public.tournament_prizes
  ADD CONSTRAINT tournament_prizes_prize_type_check
  CHECK (prize_type = ANY (ARRAY['tokens'::text, 'cop'::text, 'both'::text, 'pass'::text]));

-- Replace the amount-consistency CHECK with one that also encodes pass invariants
ALTER TABLE public.tournament_prizes
  DROP CONSTRAINT IF EXISTS tournament_prizes_check;
ALTER TABLE public.tournament_prizes
  ADD CONSTRAINT tournament_prizes_check CHECK (
    (
      (prize_type = 'tokens' AND amount_tokens IS NOT NULL AND amount_cop IS NULL)
      OR (prize_type = 'cop'    AND amount_cop    IS NOT NULL AND amount_tokens IS NULL)
      OR (prize_type = 'both'   AND amount_tokens IS NOT NULL AND amount_cop    IS NOT NULL)
      OR (prize_type = 'pass'   AND amount_tokens IS NULL     AND amount_cop    IS NULL     AND includes_pass = true)
    )
    AND (
      (includes_pass = false AND pass_days IS NULL)
      OR (includes_pass = true AND pass_days IS NOT NULL AND pass_days > 0)
    )
  );
