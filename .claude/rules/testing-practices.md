# Testing Practices — 1UP Gaming Tower

> **Current state (v2.52.0):** 28 Vitest files, **359 tests passing**, <1s wall time.
> All ship through `npm run test:run`; see `vitest.config.ts`. The suite grew incrementally
> around real bugs and the 2026-05-22 security audit (audit closures shipped 21 of these
> tests).

---

## QA methodology — the test pyramid

We use the standard **test pyramid**: a wide base of cheap, fast tests and a thin top of
expensive ones. Each tier answers a different question and runs at a different time.

| Tier | Question it answers | Tool | Runs | Needs auth/browser? |
|------|--------------------|------|------|---------------------|
| **1. Data / migration validation** | "Did this migration do the right thing to live data?" | SQL via Supabase MCP | Once, at apply-time | No |
| **2. Unit / integration tests** *(the base)* | "Is the business logic correct, forever?" | Vitest | Every push (pre-deploy) | No — boundaries mocked |
| **3. End-to-end (E2E)** *(the thin top)* | "Does the full flow work through the real UI + auth?" | *(not yet — see below)* | CI, pre-deploy | Yes |

**Tier 1 — data validation.** Every DDL/data migration applied to prod is immediately
followed by SQL checks that prove the outcome (row counts match, no record changed state
unexpectedly, no orphans). This *is* the migration's test — see the
`passes` backfill (v2.38.0): three checks confirmed 22 orders → 22 passes and **0** users
changed `pass_status`. Never apply a data migration to prod without a paired verification query.

**Tier 2 — unit/integration (where most of our confidence lives).** The rule is **extract the
bug-prone logic into a pure `src/lib/*` function and test that** — don't test the Next.js
request/response wiring or assert "the ORM was called". Canonical examples:
`isValidPassOrderAmount` and `validatePrizes` (mirror DB CHECKs), `computePassWindow`
(pass-stacking math), `selectBestDiscount`, the webhook idempotency map. When a route has
risky logic, the move is: pull it into a helper, unit-test the helper exhaustively, have the
route call it. This is why a "race condition" or "stacking" bug becomes a one-line import +
a test file, not a manual click-through.

**Tier 3 — E2E (deliberately deferred).** We have **zero** E2E tests today, and that's an
intentional, professional posture for this stage — E2E is slow and brittle, and the blocker
is that **Privy auth resists automation** (email OTP / Google OAuth). Real browser E2E
(Playwright/Cypress driving admin login → action → assert) requires a **test-auth path**
first: a Privy test user with a programmatic login, or a non-prod-only auth-bypass header
that is hard-gated to never work in production. Build this only when a flow is both
business-critical *and* stable. Until then, the residual manual check is a ~60-second visual
"eyeball" — kept small precisely because Tiers 1+2 cover the logic.

**Pyramid discipline:** when you reach for an E2E test, first ask whether the thing you want
to prove is really logic (→ Tier 2) or really data (→ Tier 1). Most "I need to test the whole
flow" instincts are actually a missing pure-function test plus a data-validation query.

---

## What's covered today

Test files live under `src/__tests__/lib/` (the unified payment-layer tests under `src/__tests__/lib/payments/`):

| File | What it covers |
|---|---|
| `admin.test.ts` | `isAdmin()` env match, DB match, unknown email rejection |
| `privy.test.ts` | `verifyToken()` (mocked PrivyClient), `resolveUserEmail()` provider fan-out |
| `mercadopago.test.ts` | HMAC verification using MP's `id;request-id;ts` manifest |
| `mpWebhookDecision.test.ts` | Webhook idempotency — allowed-transition map + `mp_payment_id` dedupe (audit C-3 closure) |
| `discount.test.ts` | `selectBestDiscount()` — best wins, expired rules ignored, aliado-linked rules |
| `comfenalco.test.ts` | `ComfenalcoConfigError` thrown when env vars absent |
| `passVerifier.test.ts` | Exact-amount match, ≥3 Base confirmations, sender pinned to verified wallet (audit C-2, H-8 closures) |
| `tokenTransferVerifier.test.ts` | Re-runs the receipt before flipping a token order to `approved` — treasury → wallet, amount ≥, confirmations (audit H-3 closure) |
| `verifiedWallet.test.ts` | Server-side derivation of order wallet from `user_profiles.wallet_address` — fails closed (audit C-1 closure) |
| `rateLimit.test.ts` | Upstash sliding-window limits per endpoint + safe-by-default fallback when env unset |
| `podium.test.ts` | `derivePodium()` from a completed bracket — 1st/2nd/3rd assignment + manual-override preservation |
| `tournamentPoints.test.ts` | `pointsFor()` / `POINTS_BY_POSITION` (10/5/3 defaults) |
| `sniffAvatarMime.test.ts` | Magic-byte detection for image uploads (rejects spoofed `image/*` MIMEs) |
| `passOrders.test.ts` | `isValidPassOrderAmount()` — mirrors the `pass_orders` token-amount CHECK (admin_grant allows 0; paid purchases require >0) |
| `tournamentPrizes.test.ts` | `validatePrizes()` — mirrors the `tournament_prizes` pass invariant (pass_days > 0 when a prize includes a pass) |
| `passWindow.test.ts` | `computePassWindow()` — pass-stacking math (stacks onto an active pass, starts now otherwise, exact duration) |
| `passActivation.test.ts` | `canActivatePass()` / `canRevokePass()` — claim-later + revoke preconditions (ownership, state machine, 404/409s) |
| `tournamentEntry.test.ts` | Paid tournament entry (v2.41.0; expanded v2.43.0 + v2.47.0) — `tournamentEntryFee()` (null/0 = gratis), `parseEntryFeeInput()` (admin fee validation), `isValidTreasuryAddress()` + fee/treasury coupling (token fee requires a valid per-tournament treasury, bank-only doesn't), `availableEntryMethods()` + `canCreateEntryOrder()` (free/closed/method gates, **cash + card** gated by the per-tournament fee unit AND `service_payment_methods`; card additionally needs `PAYMENTS_CARD_LIVE`), `canReviewEntryOrder()` (only `pending_bank` reviewable, idempotent 409s, cash needs a note), manual-refund messaging |
| `payments/methodRegistry.test.ts` | Unified payment layer — canonical methods, `METHOD_META`, `normalizeMethod`/`toLegacyMethod` (legacy `bank`↔`wire`, fails closed on unknown), `enabledMethods`/`isMethodEnabled` (card hidden unless `PAYMENTS_CARD_LIVE`) |
| `payments/paymentEvents.test.ts` | `validateEventAmount` + `validateCashEvent` (mirror the DB CHECKs — COP xor tokens, cash requires `recorded_by_admin`+`reason`), `canTransition` (append-only event state machine) |
| `payments/orderKind.test.ts` | `order_kind` → table + Spanish label + revalidate paths; `isOrderKind` guard |
| `payments/stripeWebhookDecision.test.ts` | Card path (v2.47.0) — decides fulfillment from a `checkout.session.completed` + `paid` event; rejects bad/unknown metadata |
| `courseEnrollment.test.ts` | Cash + card on academia courses (v2.44.0; card v2.52.0) — `availableCourseMethods()` (gates by course price unit AND `service_payment_methods`; card additionally needs `PAYMENTS_CARD_LIVE`), `canSelectCourseMethod`, `canReviewEnrollment` (only `pending`, allows cash, idempotent 409s) |
| `tokenPurchase.test.ts` | Cash + card on $1UP purchases (v2.45.0; card v2.52.0) — `tokenPurchaseCashAvailable` / `canSelectTokenMethod` gating by the `service_payment_methods` (`token_purchase`) toggle; card additionally gated by `PAYMENTS_CARD_LIVE` |
| `passPurchase.test.ts` | Cash + card on 1UP Pass (v2.46.0; card v2.52.0) — `passCashAvailable` / `canSelectPassMethod` gating by the `service_payment_methods` (`pass`) toggle; card additionally gated by `PAYMENTS_CARD_LIVE` |
| `utils.test.ts` | Misc shared utilities |

---

## How to run

```bash
npm run test       # watch mode
npm run test:run   # single pass (CI / pre-deploy)
```

The Vitest config is in `vitest.config.ts`:
- Environment: `jsdom`
- Path alias: `@` → `src`
- `setupFiles` and env stubs configured per-test via `vi.stubEnv`

---

## What to test (priority order)

### 1. API route logic — the highest-value layer

Test the business logic extracted from route handlers — not the Next.js request/response
wiring. The audit closures are the canonical examples:

- **Auth guards** — `checkAdmin()` valid → true, missing → false, non-admin → false.
- **Webhook signature + idempotency** — HMAC, replay window, `(payment_id, status)` dedupe.
- **Money flows** — discount selection, order state transitions, on-chain verification.
- **Ownership / IDOR** — wallet derivation from the calling user, never the body.

### 2. Pure utility functions

`src/lib/*` — pure functions are the easiest to lock down. Mock the SDKs at the boundary.

### 3. Supabase query correctness

Only worth testing where the query has *meaningful filtering* (e.g. an `is_active = true`
filter that once leaked drafts). Don't write tests that just assert "the ORM was called".

### 4. React components — lowest priority

Smoke tests only for the complex Client Components (checkout flow, cockpit panels).

---

## What NOT to test

- Simple CRUD pass-throughs that just call `supabaseAdmin.from().insert()` — nothing to assert.
- Next.js routing itself — framework is tested by Vercel.
- Tailwind class presence — visual correctness is verified in the browser.
- The Privy / Supabase / viem SDK internals.

---

## Pre-deploy checklist

Mandatory before any deploy:

```
[ ] npm run build       — zero errors, all routes generated
[ ] npm run test:run    — all files, all tests pass
[ ] npm run lint        — zero ESLint errors
[ ] Manual smoke if the change touches:
      - auth (login → admin/app dashboards)
      - payments (a token-order or pass-order end-to-end on Sepolia/test)
      - admin CRUD (one full create + edit + delete + verify public revalidate)
```

---

## If a bug recurs

1. Write a test that reproduces it **before** fixing.
2. Fix, confirm test passes.
3. Keep the test to prevent regression.

This is how the suite grew from 0 to 114 — only around real bugs and audit findings,
never hypothetical coverage.
