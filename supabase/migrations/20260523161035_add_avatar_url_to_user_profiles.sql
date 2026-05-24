-- Avatar URL column for user profiles.
-- Applied to live DB on 2026-05-23 via Supabase MCP; committed here to keep
-- the repo in sync (per the CLAUDE.md migration-file convention).

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.user_profiles.avatar_url IS
  'Public Supabase Storage URL of the user''s profile picture. Managed by /api/user/avatar. Null when the user has not uploaded one (UI falls back to the initials gradient via <Avatar />).';
