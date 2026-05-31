-- v2.39.0 — link a tournament_results row to the claimable `passes` row it issued.
-- Replaces the pass_orders link for prize delivery (tournament prizes now issue a
-- first-class pass asset directly, not a confirmed pass_order). pass_order_id is
-- left in place for the historical rows delivered under v2.37.0/2.38.0.

ALTER TABLE public.tournament_results
  ADD COLUMN IF NOT EXISTS pass_id bigint
    REFERENCES public.passes(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tournament_results_pass_id_uniq
  ON public.tournament_results (pass_id)
  WHERE pass_id IS NOT NULL;
