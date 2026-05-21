-- Extend user_profiles with Privy identity data so the DB holds a complete,
-- self-contained picture of each user (no live Privy call needed to render
-- admin player cards, and admin pass grants can auto-fill the wallet).

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS wallet_address   text,
  ADD COLUMN IF NOT EXISTS auth_provider    text,
  ADD COLUMN IF NOT EXISTS linked_accounts  jsonb,
  ADD COLUMN IF NOT EXISTS privy_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_synced_at   timestamptz;

COMMENT ON COLUMN public.user_profiles.wallet_address   IS 'Privy embedded wallet address (Base), synced from Privy';
COMMENT ON COLUMN public.user_profiles.auth_provider    IS 'Primary Privy login method: email | google | wallet | ...';
COMMENT ON COLUMN public.user_profiles.linked_accounts  IS 'Snapshot of Privy linkedAccounts (type + identifier per account)';
COMMENT ON COLUMN public.user_profiles.privy_created_at IS 'When the Privy account was created';
COMMENT ON COLUMN public.user_profiles.last_synced_at   IS 'Last time Privy data was synced into this row';

-- Reverse lookup: wallet address -> user
CREATE INDEX IF NOT EXISTS idx_user_profiles_wallet_address
  ON public.user_profiles (wallet_address)
  WHERE wallet_address IS NOT NULL;
