# Skill: Unified Payment Layer

Activates when editing `src/lib/payments/**`, the `payment-events` / `service-payment-methods`
admin routes, `src/components/admin/payments/**`, or the `/admin/payment-methods` page.

## What this is

One **admin-selectable payment-method set across every paid service** (1UP Pass, paid
tournaments, $1UP purchases, academia courses; marketplace later). The four methods:

| Method | Unit | Who starts it | Notes |
|--------|------|---------------|-------|
| `token` | $1UP | user | on-chain, `verifyPassTransfer` exact-match + ≥3 confs + pinned sender |
| `wire` | COP | user → admin approves | the legacy **`'bank'`** flow, relabeled. DB value stays `'bank'` — bridged by `normalizeMethod`/`toLegacyMethod` |
| `cash` | COP | **admin records** | in-person/venue payment, no user upload. Admin-attested: mandatory `recorded_by_admin` + `reason` |
| `card` | COP | user (Stripe) | **design-only** — hidden unless `PAYMENTS_CARD_LIVE`; no webhook route until live |

## Architecture — a shared layer, not a table merge

The four existing order tables (`pass_orders`, `tournament_entry_orders`,
`token_purchase_orders`, `enrollments`) keep their own audited state machines. Payments are
recorded in a single polymorphic ledger, `payment_events`, linked via `(order_kind, order_id)`
(no FK). Consistency lives in **Postgres**, never JS.

### The cornerstone: `apply_payment_event()` RPC
Always record a confirmed payment through this RPC — never insert a confirmed `payment_events`
row directly from a route. It:
1. Takes a **transaction-scoped advisory lock** on `(order_kind, order_id)` (serializes callers).
2. Enforces the **v1 single-confirmed invariant** — at most one `confirmed` event per order.
3. Inserts a new confirmed event (token success, cash) **or** confirms a pending one (`p_event_id`).
4. Returns `{ ok, became_paid, event_id?, reason? }`.

**Fulfillment fires iff `became_paid` is true** (true for exactly one caller). The per-service
side-effect stays in the route: `register_for_tournament` (tournament), pass activation (pass),
course access (enrollment). Each is independently idempotent, so the small window between the RPC
and fulfillment degrades to the existing "paid-but-unfulfilled / manual-refund" case already
surfaced in the admin panels — not a double-fulfillment.

`reason` codes from the RPC: `already_paid` (single-confirmed hit), `duplicate` (tx_hash/stripe
replay), `not_found`/`order_mismatch`/`not_pending` (bad `p_event_id`).

## Pure libs (`src/lib/payments/`, unit-tested, DB-free)
- `methodRegistry.ts` — `PaymentMethod`, `METHOD_META`, `normalizeMethod`/`toLegacyMethod`
  (legacy `bank`↔`wire`, throws on unknown), `enabledMethods(cfg, {cardLiveEnv})` /
  `isMethodEnabled` (card hidden unless env on).
- `paymentEvents.ts` — `validateEventAmount` (exactly one unit, positive, COP integer — mirrors
  the DB CHECKs), `validateCashEvent` (admin + reason required), `canTransition` (append-only:
  `pending` → confirmed/rejected/cancelled; confirmed/rejected terminal).
- `orderKind.ts` — `order_kind` → table + revalidate paths + fulfillment dispatch.
- `paymentOwnership.ts` — `ownerOf(order_kind, order_id)` server-side IDOR guard; call on **every**
  user-facing read/write. Order ownership derived server-side, never from the request body.
- `expectedAmount.ts` — per-kind expected COP/tokens from the order's existing fee/price fields.

## Hard rules
- **Cash is append-only.** Void a mistaken cash entry with a compensating `cancelled` event —
  never UPDATE/DELETE the confirmed row. Fulfillment is **not** auto-reversed (no refunds v1).
- **Credit the server-expected amount, never the on-chain-parsed value.** Token amount-correctness
  is `verifyPassTransfer`'s exact-match; never weaken to `>=`.
- **`tx_hash` is globally unique** across order kinds (replay block).
- **`card` never ships a live webhook** until `PAYMENTS_CARD_LIVE` — and then signature-verify first.
- **Deposits are deferred.** v1 = a single full payment per order. Adding deposits later means
  relaxing the single-confirmed invariant + `amount_due`/`amount_paid` (RPC-maintained) + a
  reservation TTL + an admin reconciliation panel + server-quoted token tranches. Do NOT bolt on
  partial payments without that whole scope.

## Security
`payment_events`, `service_payment_methods`, and the order tables are **RLS-on with no policies**
(deny-all) — touched ONLY via the service-role client. Never read them with the anon `supabase`
client (even in a Server Component, use `supabaseAdmin`). v2.43.0 enabled RLS after finding these
tables exposed to the anon key.

## Rollout state
- **v2.42.0-data** (shipped) — schema + RPC + `methodRegistry`/`paymentEvents` + tests.
- **v2.42.0** (shipped) — admin Métodos de Pago config page + `orderKind`.
- **v2.43.0** (shipped) — **cash** on **tournament entry** (user-selected → admin-approved with a
  note → `apply_payment_event` → register). Methods now gated by the per-service config. RLS
  hardening on the payment tables.
- **v2.44.0** (shipped) — **cash** on **academia courses** (`src/lib/courseEnrollment.ts`; same
  pattern; fulfillment = `payment_status` → `approved`).
- **v2.45.0** (shipped) — **cash** on **$1UP purchases** (`src/lib/tokenPurchase.ts`). Nuance:
  fulfillment is the admin's on-chain $1UP send (`verifyTokenTransfer` + `approved_tx_hash`) — cash
  only records the COP receipt; approve still requires the txHash.
- **v2.46.0** (shipped) — **cash** on **1UP Pass** (`src/lib/passPurchase.ts`; COP =
  `price_token × 1.000`; approve reuses the bank activation path). **Cash rollout COMPLETE across
  all four paid services.**
- **next** — the **Stripe / Apple Pay (`card`)** track (design-only behind `PAYMENTS_CARD_LIVE`:
  stand up the Stripe MCP + a signature-verified webhook first); and the deferred **deposits**
  feature (needs a reservation lifecycle + reconciliation panel).
- token_purchase fulfillment nuance: approval still requires an admin on-chain $1UP send
  (`verifyTokenTransfer` + `approved_tx_hash`), so cash there records the COP receipt but does
  **not** auto-deliver tokens.

See `.claude/skills/database.md` for the table/RPC schema and `~/.claude/plans/` for the full plan.
