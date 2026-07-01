# CLAUDE.md — 1UP Gaming Tower Website

Production website for **1UP Gaming Tower** (`1upesports.org`), Colombia's first professional esports hub.
Built and maintained by **Ekinoxis** — stack: Next.js 16 App Router, TypeScript, Tailwind CSS v3, Privy auth, Supabase JS, Supabase Storage, MercadoPago, Stripe (Checkout — card/Apple Pay). Node 24 LTS.

---

## 8 Non-Negotiable Rules

1. **0px border-radius.** `rounded-*` is banned except `rounded-full`. Sharp corners everywhere.
2. **No 1px dividers.** Never `<hr>`, `border-b`, or `border-t` for section separation — use background color shifts.
3. **Public pages = pure Tailwind.** No shadcn imports in `src/components/{home,tower,team,academia,recreativo,juegos,masters,torneos}/`.
4. **Skew pattern.** Outer element: `className="skew-fix"`. Inner text: `className="block skew-content"`.
5. **Glass nav.** TopAppBar always uses `glass-panel` class — never opaque.
6. **Auth on every admin API route.** `verifyToken` + `isAdmin` before any DB operation. No exceptions.
7. **`revalidatePath()` after every mutation.** Call it for both the public page AND the admin page. Footer is in the shared layout — use `revalidatePath("/", "layout")` when mutating `social_links` so all public pages refresh.
8. **Update docs after every change.** After any addition, fix, or feature: update `CHANGELOG.md` (new version entry), `README.md` (if routes/tables/stack changed), and this file (if rules/routes/env vars changed). Also update `docs/FICHA-TECNICA.md` on every MINOR or MAJOR release — bump its version number (2.x), update the "Última actualización" date, and correct any sections affected by the change (endpoints, tables, login providers, integrations). **When you add/remove tests or run/close an audit, also update the Notion "Pruebas & Auditorías (QA)" page** (`389999f7-988e-8194-a0af-e304b8cb1ce5`) — see `.claude/rules/testing-practices.md`. No exception — docs drift is technical debt.

---

## Infrastructure Access — use these proactively

You (Claude) have **live access to the four platforms that run this project**. Use them directly to diagnose, fix, and verify — do not ask the user to do things you can do yourself.

| Platform | How to access | What it's for |
|----------|--------------|---------------|
| **Supabase** | MCP `mcp__plugin_supabase_supabase__*` (OAuth — re-auth per session via `__authenticate`, then complete via `/mcp`) | Project `1uptower` = `kwqfpkvalspuvyiszrfh`. Run migrations (`apply_migration`), queries (`execute_sql`), check logs/advisors. See **Database Migrations** below. |
| **Vercel** | MCP `mcp__claude_ai_Vercel__*` (always available) **or** `npx vercel@latest <cmd>` (CLI not globally installed; `npm i -g vercel` needs sudo on this machine — use `npx` for one-off `env ls/add/pull`). Repo already linked to the project. | Project `website-1up` = `prj_hNsodgd6Gh4eToJub3zUKnG6m7ND`, team `team_jxTNRBmimeErr5ULGBepXlL0` (slug `ekinoxis-team`). Inspect deployments, build logs, runtime logs; manage env vars. |
| **Cloudflare** | MCP `mcp__plugin_cloudflare_cloudflare-api__*` (OAuth — re-auth per session via `__authenticate`) | Account `3347a58a0885b5e3c040d1f9fb408c4e`. General CF API. **Caveat:** the MCP OAuth scope excludes Stream — for Stream API calls use `CF_STREAM_API_TOKEN` from `.env.local` directly via `curl`/`fetch`. |
| **GitHub** | `gh` CLI (installed v2.92.0, authed via keyring — persistent across sessions). **Do not try the GitHub MCP** — the server (`api.githubcopilot.com/mcp`) rejects Claude Code's dynamic OAuth client registration with "Incompatible auth server"; `mcp__github__authenticate` will always fail until either side updates. Plain `git` covers branch/commit/push. | Repo `Ekinoxis-evm/website-1up`. Default branch `main`. Use `gh pr create / list / merge / view`, `gh issue ...`, `gh release ...`, `gh run ...` via plain `Bash`. For branch cleanup use plain git (`git push origin --delete <branch>`). |

**Critical practice — env vars are NOT auto-synced.** `.env.local` is local-only; Vercel has its own env var store. When something works locally but fails in production, **first check `vercel env ls production`** for missing/stale keys before touching code. (This exact gap — `CF_STREAM_*` vars absent on Vercel — caused the v2.27.1 production outage.)

**Build caveat.** `npm install` on Vercel needs `.npmrc` with `legacy-peer-deps=true` because `@g-loot/react-tournament-brackets` pins React 18 while the project is on React 19. Do not remove `.npmrc`.

**Local dev fact:** the Vercel project ID and team ID above are authoritative — `CLAUDE.local.md` is also kept in sync.

---

## Route Map

All public routes use the single `(main)` layout group — TopAppBar + MobileBottomNav + Footer. No sidebar.

| URL | Layout group | Purpose |
|-----|-------------|---------|
| `/` | `(main)` | Home — Hero, Brands Banner, 1UP Pass, AcademiaSection, TorneosSection, CommunitySection (discord/whatsapp from social_links), MarketplaceSection, TalentPipeline ("Sobre Nosotros"), Recruitment |
| `/torneos` | `(main)` | Tournament list — upcoming/live/completed cards with game, prize, registration CTA. RecruitmentForm at bottom. |
| `/gaming-tower` | `(main)` | 6-floor breakdown, 1UP Pass benefits, per-category games (JuegosDisplay hideHero), Map |
| `/privacidad` | `(main)` | Política de Privacidad y Tratamiento de Datos (Ley 1581) |
| `/juegos` | `(main)` | **Redirects to `/gaming-tower`** — games are now part of the Tower page |
| `/team` | `(main)` | **Redirects to `/`** — Masters on `/academia`, recruitment on `/torneos` |
| `/torneos/[slug]` | `(main)` | Tournament detail — cover, badges (incl. a **game category badge** derived from the game — v2.51.0), prizes podium (each place may show a **physical reward** text + image — v2.51.0), sponsor strip, RegisterButton CTA. `generateMetadata` with per-tournament OG. Numeric ID fallback for old QR codes/bookmarks. |
| `/torneos/[slug]/checkin` | `(main)` | QR check-in — login via `goToLogin()` (routes to `app/login`, returns here authenticated), validates registration, marks `attended` via POST /api/user/tournament-checkin. Numeric ID fallback for old QR codes. |
| `/torneos/[slug]/tv` | `(bare)` | **TV / venue display view** (v2.35.0). Fullscreen, no chrome. Huge tournament title + cover, bracket scaled to viewport with avatar-aware match cards (56px avatars, big typography), sponsor strip at bottom. Polls `/api/tournaments/[slug]/bracket` every 15s for live updates as the cockpit records winners. **For `competition_format='league'` torneos it renders `TournamentTvStandings` instead — a TV standings table polling `/api/tournaments/[slug]/standings` (v2.56.0).** The `(bare)` route group is a sibling of `(main)` so this page inherits no TopAppBar / Footer. |
| `/academia` | `(main)` | Course catalog + Masters profiles + CommunitySection + token/bank checkout (MercadoPago not yet active) |
| `/academia/[courseId]` | `(main)` | Public course preview — hero card (image, master, stats, price), playable intro video (CF Stream signed token via `/api/public/course-intro-token`), full module + session list with lock icons, INSCRIBIRSE CTA. `generateMetadata` with per-course OG. |
| `/recreativo` | `(main)` | Jornadas recreativas (corporate gaming days). CTA URL comes from `social_links` (whatsapp) with a `/torneos#recruitment` fallback. |
| `/marketplace` | `(main)` | Marketplace landing — features + CTA |
| `/perfil` | `(main)` | Legacy — `permanentRedirect` to `app.1upesports.org` (noindex) |
| `/offline` | top-level | PWA offline fallback page (no `(main)` layout — bare shell) |
| `app/login` | `app/` | Public login page — `safeRedirectTarget()` allowlist, redirects back to `?redirect=` URL after auth |
| `app/onboarding` | `app/` | Mandatory first-time wizard (outside `(protected)` to avoid circular redirect) — own auth check |
| `app/(protected)/*` | `app/` | Auth-gated user shell (wallet, mis-torneos, beneficios, pass, academia, ajustes) — AppSidebar on desktop, AppBottomNav on mobile. Layout redirects unonboarded users to `/app/onboarding`. |
| `app/(protected)/mis-torneos` | `app/` | User tournament registrations — card list with status badges, links to detail pages |
| `app/(protected)/ajustes` | `app/` | Two-tab settings: IDENTIDAD (profile data) + SEGURIDAD (linked accounts). Replaces `/app/identidad` and `/app/settings` (both redirect here). |
| `admin/login` | `admin/` | Public login page for admin subdomain |
| `admin/(protected)/*` | `admin/` | Auth-gated admin panel (requires isAdmin) |
| `admin/(protected)/torneos/[slug]/manage` | `admin/` | **Unified tournament cockpit — single source of truth for one tournament** (v2.34.0, consolidated in v2.36.0). Layout: stats strip (Inscritos · Asistieron · Capacidad · Premios) → header (image, name, status pill, dates, location) → action toolbar (Pública · TV · QR · **Compartir** · Cancelar · Eliminar) → **4-step phase stepper** (Inscripciones → Borrador → En curso → Finalizado — driven by bracket lifecycle, current ring-highlighted, completed shown as tertiary with ✓, future dim) → 5 tabs persisted in URL hash: **Información** (`AdminTournamentInfoEditor` — full inline-editable form: image, name, game, date, location, max participants, description, **entry fee** ($1UP / COP, vacío = gratis — v2.41.0) + **tesorería (wallet)** per torneo — a **dropdown** picking from the `treasury_wallets` list (v2.48.0; obligatoria si el fee en $1UP > 0; nunca reutiliza pass_config; the chosen wallet's address is stored into `tournaments.treasury_address`) + **bank-account dropdown** (which active account receives wire/cash entry fees — `tournaments.bank_account_id`, v2.51.0), prizes (each podium place also takes an optional **physical reward**: text + image — `tournament_prizes.reward_text`/`reward_image_url`, v2.51.0, shown on the public podium), **sponsor** (logo via URL **or** PNG upload + background toggle transparent/white/black + rounded display — v2.51.0), registration/visibility toggles; no popup), **Inscripciones** (`AdminTournamentRegistrationsPanel` — status chips, status updates, CSV), **Pagos** (`AdminTournamentEntryOrdersPanel` — entry-fee orders: pending-bank approve/reject with comprobante preview, "pago sin cupo" manual-refund flag — v2.41.0), **Bracket** (`AdminTournamentBracketPanel` — full per-tournament editor; **for `competition_format='league'` torneos this tab becomes Liga → `AdminTournamentLeaguePanel`: round-robin calendar + live standings table** — v2.56.0), **Premios** (`AdminTournamentResultsPanel` — podium + on-chain $1UP delivery with sponsored gas, plus manual tx-hash/comprobante path). Compartir copies a formatted text summary (name · game · date · 1° prize · location · sponsor) + the inscription URL, with Web Share API fallback. The prior standalone `/admin/tournament-brackets` and `/admin/tournament-results` pages were deleted in 2.36.0 — the cockpit owns everything per tournament. `/admin/tournament-registrations` stays as the cross-tournament report. |
| `admin/(protected)/payment-methods` | `admin/` | **Métodos de Pago (v2.42.0)** — matrix of the 4 services × 4 methods (`$1UP`/`transferencia`/`efectivo`/`tarjeta`), backed by `service_payment_methods`. Toggles persist via `PATCH /api/admin/service-payment-methods`. `tarjeta` (Stripe Checkout) now ships on **all 4 services** (v2.52.0), shown per service only when its `card_enabled` toggle **and** `PAYMENTS_CARD_LIVE` are on (off by default). See `.claude/skills/payments-layer.md` |
| `admin/(protected)/torneos` | `admin/` | Tournament directory + **creation wizard (v2.50.0)** — `TournamentCreateWizard` (5 steps: Básico [name + date + **image upload** — moved here in v2.51.0] → Inscripción [gratis/pago: $1UP and/or COP + tesorería dropdown] → Premios *(saltable)* → Presentación *(saltable)* → Revisar y crear; "Crear ahora" shortcut from step 2) replaces the name-only quick-create. Rows show a prominent name + status pill + date. |
| `admin/(protected)/bank-accounts` | `admin/` | **Cuentas y Tesorerías (v2.48.0)** — bank accounts CRUD **+ treasury wallets** (`treasury_wallets`) CRUD. Moved to the **Sistema** sidebar group (icon `account_balance_wallet`); tournaments + the Pass select their treasury from this wallet list. |
| `admin/(protected)/1pass` | `admin/` | **1UP Pass (v2.49.0)** — Configuración del Pass (price, treasury **dropdown** from `treasury_wallets`, duration, active toggle) **+ current pass-holders table** (`AdminPassesList`, from the `passes` table). The inline Beneficios editor moved out (now under Sitio Web). |
| `admin/(protected)/pass-orders` | `admin/` | **Órdenes Pass (v2.49.0)** — pass purchase orders only (the holders table moved to `/admin/1pass`). |
| `admin/(protected)/pass-benefits` | `admin/` | **Beneficios Pass** — pass perks CRUD. In the **Sitio Web** sidebar group (v2.49.0). |
| `admin/(protected)/courses` | `admin/` | Course list — `+ NUEVO CURSO` (→ new), per-row `Editar` (→ editor) + `Eliminar`. Fetches courses only — no legacy academia_content fetch |
| `admin/(protected)/courses/new` | `admin/` | Quick-create a course (name + category) then redirect to editor |
| `admin/(protected)/courses/[id]/edit` | `admin/` | Full course editor: Info tab (all fields + CF Stream intro video) + Contenido tab (drag-reorder modules/sessions, session panel with video/docs/links) |
| `app/(protected)/academia/[courseId]` | `app/` | Per-course curriculum page for enrolled users — intro video, module tabs, session accordion with lazy video player + doc downloads |

**API routes** — all `/api/admin/*` require Privy Bearer token + isAdmin check. **The full endpoint reference (every user + admin route) and the bracket lifecycle live in `.claude/skills/database.md`** — it auto-loads whenever you edit `src/app/api/**`.

---

## Database Tables

**The full schema reference (every table + key fields + FK delete behavior) lives in `.claude/skills/database.md`**, which auto-loads when you edit `src/app/api/**`, `src/lib/supabase.ts`, or `src/lib/blob.ts`. **Schema source of truth:** `src/types/database.types.ts` — keep it in sync with the live Supabase schema after any migration.

> **Admin Server Components must use `supabaseAdmin`** (service role key), never `supabase` (anon). RLS policies on tables like `masters` silently filter inactive records from the anon client — admin panels need to see everything. Import: `import { supabaseAdmin } from "@/lib/supabase"`.

> **Admin failure UX: use the shared toast, not `alert()` or silent failure.** The admin `(protected)` layout wraps every page in `AdminToastProvider` (`src/components/admin/ui/Toast.tsx`). In any `"use client"` admin component, call `const { showError, showSuccess, showInfo } = useAdminToast();` and surface every API failure through it. Existing inline `setSaveError` banners can stay where they're working, but new code uses the toast. **Never use `alert()`** — it breaks the design system flow.

---

## Database Migrations

**Always run migrations via the Supabase MCP tool — never ask the user to run SQL manually.**

```
1. mcp__plugin_supabase_supabase__list_projects  → confirm project ID (1uptower = kwqfpkvalspuvyiszrfh)
2. mcp__plugin_supabase_supabase__apply_migration → for DDL (CREATE TABLE, ALTER TABLE, etc.)
3. mcp__plugin_supabase_supabase__execute_sql     → for DML checks (SELECT) or seed data
```

After applying, confirm `success: true` before moving on.

**Schema baseline.** The full live schema is committed at
`supabase/migrations/00000000000000_baseline.sql` (audit H-7). It's idempotent — running it
on the live DB is a no-op; running it on a fresh DB produces the live state. After applying
any new DDL migration via the MCP, also commit a matching `.sql` file under
`supabase/migrations/` named `YYYYMMDDHHMMSS_<snake_case_name>.sql` so the repo and the
remote stay in sync (the live `supabase_migrations.schema_migrations` table is the source
of truth on timestamps — `mcp__plugin_supabase_supabase__list_migrations` shows them).

Local dev: `supabase start` will spin up a Postgres + Auth + Studio + Storage replica that
matches production (configured in `supabase/config.toml`). Requires the Supabase CLI:
`brew install supabase/tap/supabase`.

---

## Image Storage

All images use **Supabase Storage** — `images` bucket (public, 5MB limit).
Upload via `/api/admin/upload` → `src/lib/blob.ts` → `supabaseAdmin.storage`.

**Path structure** — entity uploads use `{folder}/{entityId}/cover` (no extension — Supabase stores MIME in metadata). New entities without an ID yet use `{folder}/pending/{timestamp}.{ext}`. Upsert always overwrites the same key so re-uploads never leave orphaned files.

| Folder | Used by |
|--------|---------|
| `players/{id}/cover` | Player photos |
| `courses/{id}/cover` | Course cover images |
| `games/{id}/cover` | Game cover images |
| `categories/{id}/cover` | Game category images |
| `floors/{id}/cover` | Floor images (Gaming Tower) |
| `masters/{id}/cover` | Master photos |
| `aliados/{id}/cover` | Partner logos and banner sponsor logos (consolidated from brand-logos) |
| `tournaments/{id}/cover` | Tournament cover images |
| `site/{key}/cover` | Site-level images (equipment-highlight, learning-path) |
| `users/{user_profile_id}/avatar` | User profile avatar — JPEG/PNG/WebP only, ≤5MB, managed by `/api/user/avatar` |
| `comprobantes/pending/{privyUserIdHash}-{timestamp}.{ext}` | Payment receipt — temporary path before order ID exists |
| `comprobantes/{orderId}/receipt.{ext}` | Payment receipt — moved here after order is created (jpg/png/webp/pdf). Tournament entry orders use the `entry-` prefix (`comprobantes/entry-{orderId}/receipt.{ext}`) so they never collide with pass/token order ids |

**Comprobante uploads** go through `/api/user/upload-comprobante` (Privy user auth, NOT admin-only). The file is uploaded to the pending path first, then `move()`d to the final order path by `/api/user/token-orders`. Accepts jpg/png/webp/pdf only, 5MB max.

**Course documents** use a separate **private** bucket `course-docs` (25 MB max, no public URL). Paths:

| Path | Used by |
|------|---------|
| `courses/{courseId}/sessions/pending/{timestamp}-{filename}` | Temporary on upload — admin uploads file, then save moves it |
| `courses/{courseId}/sessions/{sessionId}/{timestamp}-{filename}` | Final path after session is created/saved |

Access via `/api/user/course-document?id=N` which returns a 1-hour signed URL after verifying enrollment. Managed via `src/lib/courseDocs.ts`.

Social media brand icons live in `/public/socialmedia/` as static PNGs — not uploaded, shipped with the app.

---

## Skills — deeper context auto-injects when you edit these areas

| Skill file | Activates when editing |
|-----------|----------------------|
| `.claude/skills/design-system.md` | `src/components/**` |
| `.claude/skills/admin-crud.md` | `src/app/admin/**`, `src/components/admin/**` |
| `.claude/skills/database.md` | `src/lib/supabase.ts`, `src/lib/blob.ts`, `src/app/api/**` |
| `.claude/skills/auth.md` | `src/lib/privy.ts`, `src/lib/admin.ts`, `src/app/admin/(protected)/layout.tsx`, `src/app/app/(protected)/layout.tsx` |
| `.claude/skills/release-management.md` | `CHANGELOG.md`, `README.md`, any version/delivery task |
| `.claude/skills/cloudflare-stream.md` | `src/lib/stream.ts`, `src/app/api/user/stream-token/**`, `src/app/api/user/stream-token-v2/**`, `src/app/api/user/course-intro-token/**`, `src/app/api/admin/stream-upload-url/**`, `src/lib/courseDocs.ts`, `src/app/api/user/course-session/**`, `src/app/api/user/course-document/**`, `src/app/api/admin/course-sessions/**`, `src/app/api/admin/course-modules/**`, `src/app/api/admin/course-session-links/**`, `src/app/api/admin/course-session-documents/**`, academia content work |
| `.claude/skills/token-purchase-flow.md` | `src/components/perfil/BuyTokensWizard.tsx`, `src/components/perfil/MisOrdenes.tsx`, `src/app/api/user/token-orders/**`, `src/app/api/user/upload-comprobante/**`, `src/app/api/bank-accounts/**`, `src/app/api/admin/token-orders/**`, `src/app/api/admin/bank-accounts/**`, `src/app/admin/(protected)/token-orders/**`, `src/app/admin/(protected)/bank-accounts/**`, `src/components/admin/AdminTokenOrdersClient.tsx`, `src/components/academia/CourseCheckoutWizard.tsx`, `src/app/api/user/course-orders/**`, `src/app/api/admin/enrollments/**` |
| `.claude/skills/onboarding-flow.md` | `src/app/app/onboarding/**`, `src/components/perfil/OnboardingWizard.tsx`, `src/app/api/user/onboarding/**`, `src/app/api/user/referral-codes/**`, `src/app/api/admin/referral-codes/**`, `src/app/admin/(protected)/referral-codes/**`, `src/components/admin/AdminReferralCodesClient.tsx` |
| `.claude/skills/mobile-responsive.md` | `src/components/layout/**`, `src/components/admin/**`, any new page or client component |
| `.claude/skills/pass-purchase-flow.md` | `src/components/perfil/BuyPassWizard.tsx`, `src/components/perfil/MisPassOrders.tsx`, `src/components/perfil/PassPurchasePanel.tsx`, `src/lib/passVerifier.ts`, `src/app/api/user/pass-orders/**`, `src/app/api/user/pass-config/**`, `src/app/api/admin/pass-orders/**`, `src/app/api/admin/pass-config/**`, `src/app/admin/(protected)/pass-orders/**`, `src/app/app/(protected)/pass/**` |
| `.claude/skills/payments-layer.md` | `src/lib/payments/**`, `src/app/api/admin/payment-events/**`, `src/app/api/admin/service-payment-methods/**`, `src/components/admin/payments/**`, `src/app/admin/(protected)/payment-methods/**`, any work touching the unified payment ledger / `apply_payment_event` RPC / cash method |
| `.claude/skills/seo.md` | `src/app/(main)/**/page.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, any new public page |

---

## Dev Commands

```bash
npm run dev        # Turbopack dev server → http://localhost:3000
npm run build      # Production build (run to verify types before shipping)
npm run lint       # ESLint
```

---

## Product Tracking & Ship Workflow — the funnel

Every feature **and** bug fix runs the same clean loop, tracked end-to-end in the **Master Dashboard** (Notion → "Gaming Tower app" hub → Product Backlog DB). The workflow status **is** the pipeline: `Idea → Backlog → Planned → In Progress → QA / En pruebas → Shipped`.

1. **Check Notion** — open the Master Dashboard (Flujo/Kanban + Roadmap views); see what's in flight.
2. **Describe the issue/feature** — create a row: `Name` + `Módulo` (Torneos · 1UP Pass · Academia · 1UP Token & Wallet · Marketplace · Pagos · Onboarding & Identidad · Plataforma · Gaming Tower) + `Superficie` (Público/Usuario/Admin/Transversal) + `Why`. Status `Backlog`/`Planned`.
3. **Plan** — analyze the approach (plan mode for non-trivial); Status → `In Progress`; branch off `main`.
4. **Build** — implement on the feature branch.
5. **Test** — `npm run build` + `npm run test:run` + `npm run lint` (all green); Status → `QA / En pruebas`.
6. **Push & merge** — open a PR, merge to `main` (Vercel auto-deploys); Status → `Shipped` + `Release` (version) + PR link in `Links`.
7. **Docs** — update `CHANGELOG.md` / `README.md` / `FICHA-TECNICA.md` per Rule 8.

A piece of work isn't "done" until its dashboard row is `Shipped` with a `Release`. Full protocol, Notion page IDs, and the two-product-surface context live in `.claude/rules/product-management.md`.

---

## Environment Variables

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (also used for Supabase Storage uploads) |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy dashboard |
| `PRIVY_APP_SECRET` | Privy dashboard |
| `ADMIN_EMAILS` | Manual — comma-separated root admin emails |
| `MERCADOPAGO_ACCESS_TOKEN` | MercadoPago dashboard → Credentials |
| `MERCADOPAGO_WEBHOOK_SECRET` | MercadoPago dashboard → Webhooks |
| `NEXT_PUBLIC_BASE_URL` | Production URL (`https://1upesports.org`) |
| `NEXT_PUBLIC_APP_URL` | App subdomain (`https://app.1upesports.org`) |
| `NEXT_PUBLIC_ADMIN_URL` | Admin subdomain (`https://admin.1upesports.org`) |
| `COMFENALCO_API_URL` | Pending — Comfenalco API endpoint |
| `COMFENALCO_API_KEY` | Pending — Comfenalco API key |
| `NEXT_PUBLIC_BASE_RPC_URL` | Optional — Base L2 RPC (defaults to mainnet.base.org) |
| `RESEND_API_KEY` | Resend dashboard → API Keys |
| `ADMIN_NOTIFICATION_EMAIL` | Email that receives purchase notifications (usually same as ADMIN_EMAILS) |
| `CF_STREAM_ACCOUNT_ID` | Cloudflare dashboard → Account ID |
| `CF_STREAM_API_TOKEN` | Cloudflare → API Tokens → "Read and write to Cloudflare Stream and Images" template |
| `CF_STREAM_KEY_ID` | From one-time `POST /accounts/{id}/stream/keys` — RS256 signing key ID |
| `CF_STREAM_PEM` | Base64-encoded RSA private key from same signing key response — never regenerate (invalidates all issued tokens) |
| `NEXT_PUBLIC_CF_CUSTOMER_CODE` | From CF Stream video playback URL: `customer-{CODE}.cloudflarestream.com` |
| `UPSTASH_REDIS_REST_URL` *(or `UPSTASH_REDIS_REST_KV_REST_API_URL`)* | Vercel Marketplace → Upstash → "Add to Project". Drives `src/lib/rateLimit.ts`. Vercel auto-generates the longer `_KV_REST_API_URL` form; the code falls back to it. **When unset, all rate limiters are pass-through** — code ships safely without it, but H-4 is unenforced until provisioned. |
| `UPSTASH_REDIS_REST_TOKEN` *(or `UPSTASH_REDIS_REST_KV_REST_API_TOKEN`)* | Same source as the URL above; same dual-name handling. |
| `PAYMENTS_CARD_LIVE` | Kill-switch for the `card`/Apple Pay (Stripe) method. **Unset/`false` → card never appears to users and no Stripe webhook acts** (design-only). Set `"true"` only when card goes live. Consumed by `enabledMethods()` in `src/lib/payments/methodRegistry.ts`. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Checkout for the `card` method (v2.47.0). Unused until `PAYMENTS_CARD_LIVE=true`. `STRIPE_SECRET_KEY` = restricted/secret key; `STRIPE_WEBHOOK_SECRET` = signing secret from the Dashboard webhook endpoint (`/api/webhooks/stripe`, event `checkout.session.completed`). Stripe account: Ekinoxis Labs, LLC (`acct_1TgnjyBYH4gcyfom`). |
| `STRIPE_PRODUCT_PASS` / `STRIPE_PRODUCT_TOURNAMENT_ENTRY` / `STRIPE_PRODUCT_TOKEN_PURCHASE` / `STRIPE_PRODUCT_ENROLLMENT` | Per-service Stripe catalog Product IDs (charged with dynamic COP amounts). Live IDs built via the Stripe MCP: `prod_UjRIsruufYyfZ1` / `prod_UjRJcahnu5MvhM` / `prod_UjRJv0xIFH2mwg` / `prod_UjRJBpraVBjwUm`. Unset → Checkout falls back to an inline product name (fine for test mode). |

> `BLOB_READ_WRITE_TOKEN` is **not needed** — image storage migrated to Supabase Storage.

> **Activating rate limiting in production:** add the Upstash integration to the Vercel
> project (Marketplace → Upstash → "Add to Project"). It auto-provisions a free-tier Redis
> and writes `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` into the project env vars.
> No code redeploy is needed — the next request after the env vars land starts enforcing.

---

## Privy + Google OAuth Setup

Login methods configured: **email** and **google** (`loginMethods: ["email", "google"]` in `src/components/providers/PrivyClientProvider.tsx`). Discord is disabled.

Custom Privy auth domain: **`privy.1upesports.org`** (set in Privy Dashboard → Settings → Custom Auth Domain).

**Critical: even with a custom auth domain, the Google callback Privy sends is the standard one.**

### Google Cloud Console (one-time)
Credentials → OAuth 2.0 Client → **Authorized redirect URIs** — must contain exactly:
```
https://auth.privy.io/api/v1/oauth/callback
```
Do NOT use `https://privy.1upesports.org/api/v1/oauth/callback` — Privy always sends the `auth.privy.io` callback to Google regardless of the custom domain.

### Privy Dashboard (one-time)
- **Allowed origins**: `https://1upesports.org`, `https://www.1upesports.org`, `https://app.1upesports.org`, `https://admin.1upesports.org` *(www is required because Vercel auto-redirects the apex to www — login attempts from the public marketing site would otherwise hit an origin Privy doesn't recognize)*
- **Allowed OAuth redirect URLs**: `https://app.1upesports.org/login` **and** `https://admin.1upesports.org/login` (this is the `redirect_to` Privy sends to its own `/oauth/init` endpoint — must be an exact match, no trailing slash). **Both subdomain login pages must be listed** — Google login is triggered from each one, and the list is exact-match: if a page's URL isn't on it, Privy 401s `/oauth/init` and only Google breaks (email still works, since email skips the OAuth redirect). Any new origin that shows a Google login button needs its exact URL added here too.

### Debugging checklist
If Google login breaks again (401 from `privy.1upesports.org/api/v1/oauth/init`):
1. Privy is rejecting the `redirect_to` → check **Allowed OAuth redirect URLs** in Privy dashboard
2. If it reaches Google and returns `redirect_uri_mismatch` → the Google Cloud Console is missing `https://auth.privy.io/api/v1/oauth/callback`
3. The exact rejected URI is encoded in the Google error page URL (`authError` param, base64 protobuf) — decode to confirm

### Login routing — NEVER call Privy `login()` inline on a public page
Privy's OAuth (Google) flow returns the user to the **exact URL where login was initiated**, and that URL must be an exact match in **Allowed OAuth redirect URLs**. Public pages with dynamic slugs (`/torneos/[slug]`, `/academia/[courseId]`, `/torneos/[slug]/checkin`) can never be allowlisted, so triggering `login()` inline there breaks Google login (email still works — it skips the redirect).

**Rule:** any login trigger on a public page must call `goToLogin()` from `src/lib/loginRedirect.ts`, which sends the user to `app.1upesports.org/login?redirect=<page they came from>` — the single allowlisted public login page. The Privy session cookie is shared across all `*.1upesports.org` subdomains, so the user returns to the public site already authenticated and lands back on the page they started from. `app/login` strips its `?redirect=` query into `sessionStorage` on mount so its own OAuth `redirect_to` stays a clean, exact-match URL. Allowlist only needs `app/login` + `admin/login` — no per-page entries.

---

## Gas Sponsorship

All $1UP token sends from embedded wallets use **Privy native gas sponsorship (EIP-7702)**. Privy upgrades the embedded wallet to a Kernel smart contract in-place — same address, no migration — and its paymaster covers the gas fee.

**Pattern — always use this for embedded wallet sends:**
```ts
const { sendTransaction } = useSendTransaction(); // from @privy-io/react-auth

const { hash } = await sendTransaction(
  {
    to: ONE_UP_TOKEN.address,
    value: BigInt(0),
    chainId: 8453,
    data: encodeFunctionData({ abi: ERC20_TRANSFER_ABI, functionName: "transfer", args: [...] }),
  },
  { address: walletAddress, sponsor: true }  // ← sponsor: true is mandatory
);
```

**Files that use this pattern:**
- `src/components/perfil/WalletTab.tsx` — user send modal
- `src/components/perfil/BuyPassWizard.tsx` — pass purchase
- `src/components/admin/AdminTokenOrdersClient.tsx` — admin approve token purchase order

**Dashboard requirements (one-time setup):**
- Privy Dashboard → Gas Sponsorship tab → enable for **Base mainnet**
- Settings → Wallet Infrastructure → confirm **TEE execution** is active (not MPC legacy)

**Transaction history** — use Blockscout API v2, not Privy (Privy has no list-transactions endpoint):
```
GET https://base.blockscout.com/api/v2/addresses/{wallet}/token-transfers?token={ONE_UP_TOKEN.address}
```
Do NOT append `&limit=N` — Blockscout v2 rejects unknown query params and returns an error with no `items`.

---

## Subdomain Routing

**`src/proxy.ts`** is the Next.js 16 first-class proxy file — it replaces `middleware.ts` for subdomain routing. Next.js 16 picks it up automatically by name; no `middleware.ts` is needed or allowed (having both causes a build error).

- Export the function as `proxy` (not `middleware`)
- Export `config` with the `matcher` array
- Never create a `src/middleware.ts` alongside it — that conflicts and breaks the build

---

## Payment Flow Rules

- **Never hardcode prices** — always read `courses.price_cop` from DB at checkout time.
- **Discounts** are calculated server-side in `/api/checkout`. The best active `discount_rules` row wins.
- **Webhook security** — `/api/webhooks/mercadopago` verifies HMAC-SHA256 `x-signature` before touching DB. In production, `MERCADOPAGO_WEBHOOK_SECRET` must be set or the webhook is rejected.
- **Enrollment lifecycle**: `pending` → `approved` | `rejected` | `cancelled`. Never delete enrollments — only update status.
- **Comfenalco stub** — `src/lib/comfenalco.ts` throws `ComfenalcoConfigError` when env vars are absent. The verify endpoint returns HTTP 503 in that case — handle gracefully in UI.

---

## Versioning

This project follows `MAJOR.MINOR.PATCH` (semver-like):
- **PATCH** — bug fixes, copy changes, style tweaks
- **MINOR** — new features, new admin sections, new integrations
- **MAJOR** — breaking schema changes, full redesigns, platform migrations

All releases are documented in `CHANGELOG.md`. See `.claude/skills/release-management.md` for the full protocol.
