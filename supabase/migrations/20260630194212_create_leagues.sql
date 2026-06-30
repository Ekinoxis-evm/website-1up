-- League (round-robin) schema — mirror of brackets, lives alongside it.
-- Standings are DERIVED (computed on read), never stored here.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'league_status') THEN
    CREATE TYPE league_status AS ENUM ('draft', 'in_progress', 'completed');
  END IF;
END $$;

-- 1:1 with a tournament (UNIQUE tournament_id), same lifecycle shape as brackets.
CREATE TABLE IF NOT EXISTS leagues (
  id                serial PRIMARY KEY,
  tournament_id     integer NOT NULL UNIQUE REFERENCES tournaments(id) ON DELETE CASCADE,
  status            league_status NOT NULL DEFAULT 'draft',
  points_win        integer NOT NULL DEFAULT 3,
  points_draw       integer NOT NULL DEFAULT 1,
  points_loss       integer NOT NULL DEFAULT 0,
  tiebreaker_order  text[]  NOT NULL DEFAULT ARRAY['head_to_head','wins','goal_diff','goals_for'],
  participant_count integer NOT NULL DEFAULT 0,
  rounds            integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS league_participants (
  id              serial PRIMARY KEY,
  league_id       integer NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  display_name    text NOT NULL,
  seed            integer NOT NULL,
  user_profile_id integer REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_league_participants_league ON league_participants(league_id);

CREATE TABLE IF NOT EXISTS league_matches (
  id           serial PRIMARY KEY,
  league_id    integer NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  round        integer NOT NULL,
  match_number integer NOT NULL,
  p1_id        integer REFERENCES league_participants(id) ON DELETE SET NULL,
  p2_id        integer REFERENCES league_participants(id) ON DELETE SET NULL,
  p1_score     integer,
  p2_score     integer,
  winner_id    integer REFERENCES league_participants(id) ON DELETE SET NULL,
  is_draw      boolean NOT NULL DEFAULT false,
  state        match_state NOT NULL DEFAULT 'pending',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_league_matches_league ON league_matches(league_id);
CREATE INDEX IF NOT EXISTS idx_league_matches_league_round ON league_matches(league_id, round);
