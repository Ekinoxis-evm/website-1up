-- Migration: masters — social links + categories
-- Apply in Supabase SQL Editor
-- Version: 1.3.7

ALTER TABLE masters
  ADD COLUMN IF NOT EXISTS kick_url    text,
  ADD COLUMN IF NOT EXISTS twitch_url  text,
  ADD COLUMN IF NOT EXISTS github_url  text,
  ADD COLUMN IF NOT EXISTS categories  text[] DEFAULT '{}';
