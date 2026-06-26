-- Onboarding location: replace the free-text `barrio` field with a structured
-- Country -> State/Department -> City selection. New columns store the display
-- names (resolved client-side from the country-state-city dataset). `barrio`
-- is kept (nullable) for backwards-compatibility with existing rows; it is no
-- longer collected.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS state   text,
  ADD COLUMN IF NOT EXISTS city    text;
