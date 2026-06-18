-- Per-tournament treasury wallet for paid $1UP entry fees (v2.41.0).
-- Entry fees must NOT reuse pass_config.recipient_address — each tournament
-- defines its own destination wallet. A token entry fee (entry_fee_tokens > 0)
-- is meaningless without one; that coupling is enforced in the API layer
-- (src/lib/tournamentEntry.ts → parseEntryFeeInput) and the admin Info tab.
-- Nullable so existing/free and bank-only tournaments are unaffected.

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS treasury_address text;
