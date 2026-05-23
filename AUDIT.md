# Website Audit — 1UP Gaming Tower (`website/`)

**Audited:** 2026-05-22 · **Version:** 2.29.8 · **Method:** six parallel deep-dives —
public web, user portal, admin panel, database, payments, security.

> **2026-05-22 patch · H-batch 1 — `fix/audit-h-batch-1`:** three 🟠 High findings
> (H-1 aliados key leak, H-5 `@privy-io` pinning, H-2 anon-client admin pages) closed in
> 2.29.2.
>
> **2026-05-22 patch · H-4 — `fix/audit-h4-rate-limiting`:** rate limiting added on the 5
> most abuse-prone endpoints — `src/lib/rateLimit.ts` + Upstash Ratelimit. Ships
> safe-by-default. Closed in 2.29.3.
>
> **2026-05-22 patch · H-3 / H-8 / H-9 — `fix/audit-h3-h8-h9-payments`:** payments-layer
> hardening closed in 2.29.4. Token-order approval now verifies the payout on-chain via
> new `src/lib/tokenTransferVerifier.ts` before persisting `approved` (H-3).
> `verifyPassTransfer` now requires an exact-amount match and at least 3 Base-mainnet
> confirmations (H-8). The MercadoPago webhook uses MP's documented `id;request-id;ts` HMAC
> manifest with a ±10-min replay window and fails closed when the secret is unset, including
> in development (H-9). 21 new unit tests.
>
> **2026-05-22 patch · quick wins — `fix/audit-quick-wins-h6-h10-h11-h13`:** five 🟠 Highs
> closed in 2.29.5 — H-6 (bank-account masking + per-id endpoint), H-10 (/perfil server
> redirect), H-11 (sitemap tournament slugs), H-12 remainder (AdminCoursesClient delete),
> H-13 (revalidatePath gaps in 3 admin routes).
>
> **2026-05-22 patch · H-7 — `fix/audit-h7-schema-baseline`:** the full live `public`
> schema (34 tables, 67 constraints, 19 indexes, 4 functions, 5 triggers, 25 policies,
> 1 view, 13 enums, 5 extensions) is committed to
> `supabase/migrations/00000000000000_baseline.sql` — fully idempotent, ~1100 lines.
> Plus `supabase/config.toml` for local-stack reproducibility. **All 13 Highs closed.**

> **2026-05-22 patch — `fix/tournament-flow-and-critical-audit`:** all 3 🔴 Critical
> findings (C-1, C-2, C-3) are fixed in 2.29.1. Tournament flow tightened end-to-end —
> registration now auto-closes when the bracket starts, and a running bracket can no longer
> be deleted or re-seeded (matches the documented "no edits after start" spec). The
> `register_for_tournament` RPC was tightened to `status = 'upcoming'` and committed as the
> first repo-mirrored migration (start of H-7 work). Audit H-12 partial: the
> tournament-registrations PATCH now checks `res.ok` and surfaces failures.

This is the comprehensive audit of the production website (`1upesports.org`) — the main app.
It covers all three surfaces (public web, user portal, admin panel) and the cross-cutting
layers (database, payments, security). The six maintainer agents in `.claude/agents/` each
own one section below.

## Build health ✅

`npm run build` passes (all 62 routes), 52 Vitest tests pass. The `GET /api/admin/tournaments`
fix (added `is_active = true` filter, 2026-05-22) is verified present. **No missing API auth
guards** — all 36 admin routes are `checkAdmin`-gated, all user routes verify a Privy token.

## Severity scoreboard

| Severity | Count | Status | Theme |
|---|---|---|---|
| 🔴 Critical | 3 | ✅ **all fixed in 2.29.1** | ~~Wallet IDOR~~ · ~~pass-transfer hijack~~ · ~~webhook idempotency~~ |
| 🟠 High | 13 | **all 13 closed (2.29.2 → 2.29.6)** ✅ | ~~all struck~~ |
| 🟡 Medium | ~22 | **11 fixed (through 2.29.8)** | Web batch (1px dividers · route map · checkin noindex · placeholder WhatsApp · Rule 3) · Portal batch (age-floor · `Bearer null` · `value: BigInt(0)` · `any[]` types) · tournament-flow revalidatePath gaps · registrations PATCH res.ok · still open: input validation · OG images · `next/image` migration · ISR strategy · admin UX consistency · payments TOCTOU · comprobante MIME · CF JWT accessRules · more |
| 🔵 Low / Info | many | open | see per-area sections |

> **Correction to the workspace `../AUDIT.md`:** the deeper database dive found
> `database.types.ts` and the CLAUDE.md table list are **in sync** (34 tables + 1 view, zero
> drift) — the earlier "missing 8 tables" finding was wrong.

---

## 🔴 Critical — ✅ all fixed in 2.29.1

> Fixed on branch `fix/tournament-flow-and-critical-audit` (2026-05-22). New helpers:
> `src/lib/verifiedWallet.ts` derives the credited wallet from `user_profiles.wallet_address`
> for every order POST; `src/lib/mpWebhookDecision.ts` enforces an allowed-transition map
> with `mp_payment_id` dedupe. 18 new unit tests cover the changes.

### ~~C-1~~ ✅ Wallet IDOR — orders accept an attacker-chosen `walletAddress`
`api/user/token-orders/route.ts:54,117` · also `pass-orders` and `course-orders` POST.

The order is tied to the authenticated user's `user_profile_id`, but `walletAddress` is read
**verbatim from the request body** (validated only as a syntactically valid address). A user
can submit a token purchase order naming **any wallet they don't own** as the credit
destination — when an admin approves it, $1UP tokens are sent to the attacker's address.
**Fix:** derive the wallet server-side from `user_profiles.wallet_address` (synced by
`src/lib/privySync.ts`), or verify the body value against it. Apply to all order-creation
endpoints.

### ~~C-2~~ ✅ `verifyPassTransfer` trusts a client-supplied sender
`src/lib/passVerifier.ts:20-48`, called from `api/user/pass-orders/route.ts:105`.

`expectedFrom` is the body `walletAddress`, never checked against the caller's real wallet.
Anyone who knows a historical tx hash that sent ≥ `price_token` $1UP to the treasury can
submit `{ txHash, walletAddress: <that tx's real sender> }` and have a `confirmed` pass
granted to *their own* profile — funded by someone else's payment. Same root cause as C-1:
pin the sender to the caller's verified wallet.

### ~~C-3~~ ✅ MercadoPago webhook has no idempotency
`api/webhooks/mercadopago/route.ts:76-88`.

The handler unconditionally updates the enrollment on every delivery. MercadoPago **retries**
webhooks — a late `in_process` retry flips an already-`approved` enrollment back to
`pending`; `paid_at` is overwritten each time. **Fix:** guard transitions with an
allowed-transition map and dedupe on `mp_payment_id`. *Latent today — MercadoPago is not yet
active in production — but the code is live.*

---

## 🟠 High — fix soon

| # | Finding | Location |
|---|---|---|
| ~~H-1~~ ✅ | ~~`select("*")` on `aliados` from the **anon** client ships partner `api_key`/`api_url` to every visitor's browser~~ — **fixed in 2.29.2** (explicit column list + tightened `BrandsBanner` props type) | `app/(main)/page.tsx` |
| ~~H-2~~ ✅ | ~~5 admin pages use the anon `supabase` client~~ — **fixed in 2.29.2** (all 5 switched to `supabaseAdmin`) | `admin/(protected)/{players,competitions,games,floors,discounts}/page.tsx` |
| ~~H-3~~ ✅ | ~~Token-order **approval performs no on-chain verification** — `approved_tx_hash` is admin-typed and unvalidated~~ — **fixed in 2.29.4** (new `src/lib/tokenTransferVerifier.ts` re-runs the receipt before flipping to `approved`; rejects unless treasury → order wallet, value ≥ token_amount, and ≥3 confirmations) | `api/admin/token-orders/route.ts:72-99` |
| ~~H-4~~ ✅ | ~~**No rate limiting** anywhere~~ — **fixed in 2.29.3**: 5 endpoints now behind Upstash Ratelimit sliding-window limits via `src/lib/rateLimit.ts` (anon-strict 5/min/IP, anon-read 30/min/IP, auth-mutate 20/min/user). Ships safe-by-default. | `src/lib/rateLimit.ts` |
| ~~H-5~~ ✅ | ~~`@privy-io/react-auth` + `@privy-io/server-auth` pinned to `"latest"`~~ — **fixed in 2.29.2** (pinned to `3.18.0` / `1.32.5`) | `package.json` |
| ~~H-6~~ ✅ | ~~Full bank account numbers + holder document exposed to **every** authenticated user~~ — **fixed in 2.29.4**: bulk list now masks `account_number` to last 4 and drops `holder_document`; per-id route returns full record under the auth-mutate rate-limit bucket | `api/bank-accounts/route.ts` + new `api/bank-accounts/[id]/route.ts` |
| ~~H-7~~ ✅ | ~~Entire schema un-versioned~~ — **fixed in 2.29.6**: full schema (34 tables / 67 constraints / 19 indexes / 4 functions / 5 triggers / 25 policies / 1 view / 13 enums / 5 extensions) committed as `supabase/migrations/00000000000000_baseline.sql`; `supabase/config.toml` added | `supabase/migrations/` |
| ~~H-8~~ ✅ | ~~No confirmation-depth / reorg check in `verifyPassTransfer`; `value >= expectedWei` silently accepts overpayment~~ — **fixed in 2.29.4** (exact-amount equality + `MIN_CONFIRMATIONS = 3` on Base mainnet; `confirmations_pending` is a retryable code distinct from `amount_mismatch`) | `src/lib/passVerifier.ts:28-54` |
| ~~H-9~~ ✅ | ~~Webhook HMAC manifest is non-standard (`ts.dataId`) — omits `x-request-id`, no `ts` freshness check → signature replayable~~ — **fixed in 2.29.4** (manifest is now `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, ±10 min replay window, fails closed when secret is unset in every environment) | `src/lib/mercadopago.ts:96-133` |
| ~~H-10~~ ✅ | ~~`/perfil` renders a full auth UI instead of redirecting~~ — **fixed in 2.29.5** (server-side `permanentRedirect` to `app.1upesports.org` in production, `noindex` meta added) | `app/(main)/perfil/page.tsx` |
| ~~H-11~~ ✅ | ~~`sitemap.ts` omits all `/torneos/[slug]` tournament detail pages~~ — **fixed in 2.29.5** (slugs added with status-derived priority/changeFreq) | `src/app/sitemap.ts` |
| ~~H-12~~ ✅ | ~~No `res.ok` check after delete/PATCH~~ — **fixed in 2.29.1** (registrations PATCH) + **2.29.5** (`AdminCoursesClient` delete) | both files |
| ~~H-13~~ ✅ | ~~Missing `revalidatePath`~~ — **fixed in 2.29.5** on `users`, `course-session-links`, `course-session-documents` routes | those 3 `api/admin/*` routes |

---

## Area 1 · Public Web — `app/(main)/**` *(owner: web-maintainer)*

**Design system:** mostly clean — 0px-radius rule fully respected. ~~Two real 1px-divider
violations: `CourseCheckoutWizard.tsx:231` (`border-b`), `MasterCard.tsx:99` (`border-t`).~~
✅ both fixed in 2.29.7. ~~CLAUDE.md Rule 3's folder list omits `masters/`~~ ✅ added in 2.29.7
(also added `torneos/`).

**SEO:** ~~`sitemap.ts` missing tournament detail pages (H-11)~~ ✅ 2.29.5.
~~`/torneos/[slug]/checkin` has no metadata — should be `noindex`.~~ ✅ 2.29.7 (`noindex` +
title). ~~`/perfil` is indexable but is an auth page.~~ ✅ 2.29.5 (server redirect + `noindex`).
**Open:** home/section OG images are 512² squares declared as `summary_large_image` —
should be 1200×630.

**Performance:** **Open** — raw `<img>` everywhere (`next/image` used only in `TopAppBar`);
content images (`PlayerCard`, `CourseCatalog`, `FloorBreakdown`, tournament covers) should
use `next/image` with `remotePatterns`. No `revalidate` on any page — ISR effectively unused.

**Correctness:** ~~`recreativo/page.tsx:77` ships a **placeholder WhatsApp number**
(`wa.me/57300000000`).~~ ✅ 2.29.7 — sourced from `social_links` with `/torneos#recruitment`
fallback. ~~`/offline` route directory exists with no `page.tsx` — dead route.~~ ✅ 2.29.7 —
audit note was incorrect; `src/app/offline/page.tsx` exists and works as a PWA fallback.
~~`/marketplace` and `/offline` are absent from the CLAUDE.md route map (doc drift).~~ ✅
2.29.7 — both added.

## Area 2 · User Portal — `app/app/**` *(owner: portal-maintainer)*

**Auth gating is correct and secure** — `(protected)/layout.tsx` properly redirects
unauthenticated and unonboarded users; onboarding sits outside `(protected)` to avoid the
circular redirect. No protected page is reachable without auth.

**Findings:** ~~age-floor mismatch — `IdentidadTab.tsx:365` lets a user later edit their
birth year to age 5~~ ✅ 2.29.8 — `PUT /api/user/profile` now enforces the same 14-year
floor as onboarding. ~~`PassPurchasePanel.tsx` / `MisPassOrders.tsx` send `Bearer null`
when `getAccessToken()` returns null — silent failures.~~ ✅ 2.29.8 — both null-guard the
token and short-circuit to the empty state. ~~`BuyPassWizard`/`CourseCheckoutWizard` omit
`value: BigInt(0)` from the documented sponsored-send pattern.~~ ✅ 2.29.8 — both aligned.
~~`/perfil` dead duplicate (H-10).~~ ✅ 2.29.5. ~~Three `any[]` in `academia/[courseId]/page.tsx:57-61`.~~
✅ 2.29.8 — replaced with three structural `SessionRow`/`LinkRow`/`DocRow` types.

**All Area 2 Mediums closed.**

## Area 3 · Admin Panel — `app/admin/**` *(owner: admin-maintainer)*

**Auth layout is correct** — `admin/(protected)/layout.tsx` enforces `isAdmin` server-side
before any child renders. No client component imports `supabaseAdmin` (no service-role leak).

**Findings:** H-2 (5 pages on the anon client — the top fix here), H-12 (missing `res.ok`
checks), H-13 (missing `revalidatePath`). `revalidatePath` gaps: tournaments/brackets routes
don't revalidate `/` or `/torneos/[slug]`; `tournament-results` DELETE omits `/team`;
`pass-orders` revalidates the dead `pass-bank-orders` redirect stub. Inconsistent failure UX
— inline `setSaveError` vs `alert()` vs nothing. `/admin/academia-content` is an orphan page
(reachable by URL, not in the sidebar). Several modal-header 1px-divider violations.

## Area 4 · Database — Supabase *(owner: database-maintainer)*

**Pass:** `database.types.ts` ↔ CLAUDE.md table list in perfect sync; `supabaseAdmin`
correctly server-only.

**Findings:** H-1 (`aliados` `select("*")` leaks API keys — fix with explicit column lists),
H-7 (schema un-versioned — generate a `supabase db dump` baseline migration). 68× `select("*")`
overall — over-fetch risk. `hall_of_fame` queried with an unnecessary `as "tournaments"` cast.
`report_match_result` RPC is typed but never called — possibly dead.

**⚠️ Needs the Supabase MCP (interactive OAuth) to close:** RLS status of ~18 anon-read
tables (any with RLS disabled = anon-key data leak), FK/filter-column index coverage. Run
`get_advisors` for security + performance once authorized.

## Area 5 · Payments *(owner: payments-maintainer)*

**Correct:** prices read from DB server-side (no client-trusted amounts), discounts computed
server-side, HMAC uses constant-time `timingSafeEqual`, webhook re-fetches payment from MP's
API, comprobantes in a private bucket with 1h signed URLs.

**Findings:** ~~C-2, C-3, H-3, H-8, H-9~~ (all closed by 2.29.4). Plus: ~~webhook **skips
signature verification when the secret is unset outside production**~~ — fixed in 2.29.4
(`verifyWebhookSignature` returns `missing_secret` in every environment; route returns 500).
Duplicate-`tx_hash` guard is a check-then-insert TOCTOU race relying on a DB unique constraint
not present in repo migrations (ties into H-7). Comprobante upload trusts client-declared
MIME/extension — add magic-byte sniffing. `moveComprobanteToOrder` lets a user attach any
`pending/` object they can name. Dead `pass` branch in `/api/checkout`.

## Area 6 · Security *(owner: security-auditor)*

**Pass:** no missing auth guards, no `.env*` tracked, no hardcoded secrets, no secret env
vars reachable from client code, ownership checks correct on `token-orders/cancel`,
`tournament-checkin`, `profile` PUT, and all course-content/stream-token endpoints.

**Findings:** C-1, H-4, H-5, H-6 above. Plus: `/api/recruitment` stores unvalidated,
uncapped free-form input (spam + stored-content vector — add length caps + email regex).
`tournament-registrations` doesn't coerce `tournamentId`. Public `course-intro-token` is an
unrate-limited signing oracle. CF Stream JWTs carry no `accessRules` (1h shareable bearer
tokens). `verifyToken` doesn't assert the `appId` claim (defense-in-depth).

---

## Recommended remediation order

1. ~~**C-1 / C-2**~~ ✅ **Done in 2.29.1** — credited wallet derived from `user_profiles.wallet_address` via `src/lib/verifiedWallet.ts` across all three order POSTs; `verifyPassTransfer.expectedFrom` pinned to the same verified value.
2. ~~**C-3**~~ ✅ **Done in 2.29.1** — webhook now has an allowed-transition map + `mp_payment_id` dedupe (`src/lib/mpWebhookDecision.ts`).
3. ~~**H-1** — explicit column lists on every `aliados` read~~ ✅ **Done in 2.29.2**.
4. ~~**H-5** — pin `@privy-io/*` to exact versions~~ ✅ **Done in 2.29.2**.
5. ~~**H-2** — switch the 5 admin pages to `supabaseAdmin`~~ ✅ **Done in 2.29.2**.
6. ~~**H-4** — add IP rate limiting~~ ✅ **Done in 2.29.3** (Upstash Ratelimit, 5 endpoints).
7. ~~**H-3 / H-8 / H-9** — server-side on-chain verification for token approvals; confirmation depth; correct HMAC manifest + fail-closed.~~ ✅ **Done in 2.29.4** (new `src/lib/tokenTransferVerifier.ts`; `verifyPassTransfer` exact-amount + 3-block depth; MP webhook `id;request-id;ts` + ±10 min replay window + fail-closed).
8. ~~**H-7** — commit a schema baseline migration~~ ✅ **Done in 2.29.6** — `supabase/migrations/00000000000000_baseline.sql` + `supabase/config.toml`. Two pre-existing advisor warnings (`function_search_path_mutable` on `set_updated_at`, `anon_security_definer_function_executable` on `report_match_result`) closed in the same pass.
9. **H-6, H-10 → H-13** and the Medium items per area.
10. ~~CHANGELOG patch entry for the `2026-05-22` tournaments-GET fix~~ ✅ **Done in 2.29.1**.

## Open verification items (need user action)

- **Supabase MCP** — authorize it (interactive OAuth) so `get_advisors` can confirm RLS
  coverage on anon-read tables and FK index coverage. Until then, RLS exposure is *unverified*.
- Confirm the `UNIQUE(tx_hash)` constraint on `pass_orders` and the pending-order partial
  index on `token_purchase_orders` actually exist in the live DB.

---

*Generated with [Claude Code](https://claude.com/claude-code). The six agents in
`.claude/agents/` each own one area above and carry its open issues.*
