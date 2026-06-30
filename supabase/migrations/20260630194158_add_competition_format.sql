-- Tournament-level discriminator: Copa (bracket) vs Liga (round-robin).
-- Named `competition_format` (NOT `format`) to avoid collision with the
-- existing `brackets.format` enum (single_elimination | double_elimination).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'competition_format') THEN
    CREATE TYPE competition_format AS ENUM ('cup', 'league');
  END IF;
END $$;

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS competition_format competition_format NOT NULL DEFAULT 'cup';
