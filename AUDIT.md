# Website Audit — 1UP Gaming Tower (`website/`)

**Audited:** 2026-05-22 · **Version:** 2.29.3 · **Method:** six parallel deep-dives —
public web, user portal, admin panel, database, payments, security.

> **2026-05-22 patch · H-batch 1 — `fix/audit-h-batch-1`:** three 🟠 High findings
> (H-1 aliados key leak, H-5 `@privy-io` pinning, H-2 anon-client admin pages) closed in
> 2.29.2.
>
> **2026-05-22 patch · H-4 — `fix/audit-h4-rate-limiting`:** rate limiting added on the 5
> most abuse-prone endpoints (recruitment, course-intro-token, referral-codes/validate,
> pass-orders POST, course-orders POST) — `src/lib/rateLimit.ts` + Upstash Ratelimit. Ships
> safe-by-default; activates as soon as Upstash env vars are provisioned. 9 of 13 Highs
> remain.

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
| 🟠 High | 13 | **4 fixed in 2.29.2 + 2.29.3** · 9 open | ~~`aliados` key leak~~ · ~~`@privy-io` unpinned~~ · ~~anon-client admin pages~~ · ~~no rate limiting~~ · no on-chain verify on token approval · schema un-versioned · more |
| 🟡 Medium | ~22 | 2 fixed in 2.29.1 | input validation · revalidatePath gaps (tournaments fixed) · 1px-divider violations · error-handling gaps (registrations PATCH fixed) |
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
| H-3 | Token-order **approval performs no on-chain verification** — `approved_tx_hash` is admin-typed and unvalidated | `api/admin/token-orders/route.ts:72-99` |
| ~~H-4~~ ✅ | ~~**No rate limiting** anywhere~~ — **fixed in 2.29.3**: 5 endpoints now behind Upstash Ratelimit sliding-window limits via `src/lib/rateLimit.ts` (anon-strict 5/min/IP, anon-read 30/min/IP, auth-mutate 20/min/user). Ships safe-by-default. | `src/lib/rateLimit.ts` |
| ~~H-5~~ ✅ | ~~`@privy-io/react-auth` + `@privy-io/server-auth` pinned to `"latest"`~~ — **fixed in 2.29.2** (pinned to `3.18.0` / `1.32.5`) | `package.json` |
| H-6 | Full bank account numbers + holder document exposed to **every** authenticated user | `api/bank-accounts/route.ts:9-14` |
| H-7 | Entire schema un-versioned — `supabase/migrations/` has **one** file; no baseline DDL, no `config.toml`; the DB cannot be rebuilt from the repo | `supabase/migrations/` |
| H-8 | No confirmation-depth / reorg check in `verifyPassTransfer`; `value >= expectedWei` silently accepts overpayment | `src/lib/passVerifier.ts:28-54` |
| H-9 | Webhook HMAC manifest is non-standard (`ts.dataId`) — omits `x-request-id`, no `ts` freshness check → signature replayable | `src/lib/mercadopago.ts:96-133` |
| H-10 | `/perfil` renders a full auth UI instead of redirecting (CLAUDE.md says "redirects to app subdomain") — stale duplicate of the `(protected)` shell | `app/(main)/perfil/page.tsx`, `ProfilePage.tsx` |
| H-11 | `sitemap.ts` omits all `/torneos/[slug]` tournament detail pages | `src/app/sitemap.ts` |
| H-12 | No `res.ok` check after delete/PATCH — failed operations look successful to the operator | `AdminCoursesClient.tsx:24`, `AdminTournamentRegistrationsClient.tsx:46` |
| H-13 | Missing `revalidatePath` — `users`, `course-session-links`, `course-session-documents` routes mutate without revalidating | those 3 `api/admin/*` routes |

---

## Area 1 · Public Web — `app/(main)/**` *(owner: web-maintainer)*

**Design system:** mostly clean — 0px-radius rule fully respected. Two real 1px-divider
violations: `CourseCheckoutWizard.tsx:231` (`border-b`), `MasterCard.tsx:99` (`border-t`).
CLAUDE.md Rule 3's folder list omits `masters/` — add it.

**SEO:** `sitemap.ts` missing tournament detail pages (H-11). `/torneos/[slug]/checkin` has no
metadata — should be `noindex`. `/perfil` is indexable but is an auth page. Home/section OG
images are 512² squares declared as `summary_large_image` — should be 1200×630.

**Performance:** raw `<img>` everywhere (`next/image` used only in `TopAppBar`) — content
images (`PlayerCard`, `CourseCatalog`, `FloorBreakdown`, tournament covers) should use
`next/image` with `remotePatterns`. No `revalidate` on any page — ISR effectively unused.

**Correctness:** `recreativo/page.tsx:77` ships a **placeholder WhatsApp number**
(`wa.me/57300000000`). `/offline` route directory exists with no `page.tsx` — dead route.
`/marketplace` and `/offline` are absent from the CLAUDE.md route map (doc drift).

## Area 2 · User Portal — `app/app/**` *(owner: portal-maintainer)*

**Auth gating is correct and secure** — `(protected)/layout.tsx` properly redirects
unauthenticated and unonboarded users; onboarding sits outside `(protected)` to avoid the
circular redirect. No protected page is reachable without auth.

**Findings:** age-floor mismatch — onboarding enforces min age 14, but `IdentidadTab.tsx:365`
lets a user later edit their birth year to age 5 (the PUT `/api/user/profile` should mirror
the 14-year rule). `PassPurchasePanel.tsx` / `MisPassOrders.tsx` send `Bearer null` when
`getAccessToken()` returns null — silent failures. `BuyPassWizard`/`CourseCheckoutWizard`
omit `value: BigInt(0)` from the documented sponsored-send pattern. `/perfil` dead duplicate
(H-10). Three `any[]` in `academia/[courseId]/page.tsx:57-61`.

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

**Findings:** C-2, C-3, H-3, H-8, H-9 above. Plus: webhook **skips signature verification
when the secret is unset outside production** (`mercadopago.ts:100-108`) — fail closed
instead. Duplicate-`tx_hash` guard is a check-then-insert TOCTOU race relying on a DB unique
constraint not present in repo migrations (ties into H-7). Comprobante upload trusts
client-declared MIME/extension — add magic-byte sniffing. `moveComprobanteToOrder` lets a
user attach any `pending/` object they can name. Dead `pass` branch in `/api/checkout`.

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
7. **H-3 / H-8 / H-9** — server-side on-chain verification for token approvals; confirmation depth; correct HMAC manifest + fail-closed.
8. **H-7** — commit a schema baseline migration; authorize the Supabase MCP and run `get_advisors`. *Started in 2.29.1: `register_for_tournament` is now committed in `supabase/migrations/`; `get_advisors` ran clean for the change. Remaining: dump every other live function/table/policy as a baseline migration.*
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
