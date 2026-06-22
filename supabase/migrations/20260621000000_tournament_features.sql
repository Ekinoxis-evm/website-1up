-- Tournament feature additions (v2.51.0):
-- 1) Per-tournament bank account: which COP account receives wire/cash entry fees.
-- 2) Sponsor logo background choice (for light/dark logos) — rendered rounded on the page.
-- 3) Per-podium-place physical reward: free-text + optional image (e.g. a card set the
--    winner claims in person), shown on the public tournament page.

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS bank_account_id integer REFERENCES public.bank_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS sponsor_logo_bg text;

ALTER TABLE public.tournaments
  DROP CONSTRAINT IF EXISTS tournaments_sponsor_logo_bg_check;
ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_sponsor_logo_bg_check
  CHECK (sponsor_logo_bg IS NULL OR sponsor_logo_bg = ANY (ARRAY['transparent'::text, 'white'::text, 'black'::text]));

ALTER TABLE public.tournament_prizes
  ADD COLUMN IF NOT EXISTS reward_text text;
ALTER TABLE public.tournament_prizes
  ADD COLUMN IF NOT EXISTS reward_image_url text;
