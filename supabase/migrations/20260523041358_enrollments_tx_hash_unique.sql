-- Match the pass_orders pattern: a partial unique index on lower(tx_hash)
-- so on-chain transaction reuse across enrollments is rejected by the DB
-- (closes the check-then-insert TOCTOU race documented in audit M-A5.1).
-- Partial — only enforced when tx_hash is non-null (most enrollments are
-- MercadoPago / bank-paid and never have one).

CREATE UNIQUE INDEX IF NOT EXISTS enrollments_tx_hash_uniq
  ON public.enrollments ((lower(tx_hash)))
  WHERE tx_hash IS NOT NULL;
