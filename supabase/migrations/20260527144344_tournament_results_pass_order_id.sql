-- v2.37.0 — link the granted pass_order to a tournament_results row so the
-- cockpit can render "Pase entregado" and re-clicking the Entregar Pase
-- button is idempotent (one pass order per podium row).

ALTER TABLE public.tournament_results
  ADD COLUMN IF NOT EXISTS pass_order_id BIGINT
    REFERENCES public.pass_orders(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tournament_results_pass_order_id_uniq
  ON public.tournament_results (pass_order_id)
  WHERE pass_order_id IS NOT NULL;
