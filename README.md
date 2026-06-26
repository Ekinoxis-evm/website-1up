# 1UP Gaming Tower — Website

Production platform for **1UP Gaming Tower** — Colombia's first professional esports hub.
Built and maintained by **Ekinoxis**. Three subdomains, one monorepo:

| Domain | Purpose |
|--------|---------|
| `1upesports.org` | Public website |
| `app.1upesports.org` | User app (wallet, pass, courses) |
| `admin.1upesports.org` | Admin panel |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| Styling | Tailwind CSS v3 — Neo-Brutalist design system |
| Auth | Privy (`@privy-io/react-auth 3.18.0` + `@privy-io/server-auth 1.32.5`) — exact-pinned, `appId` claim asserted on every verify |
| Database | Supabase (`@supabase/supabase-js`) — full schema versioned in `supabase/migrations/` (1097-line idempotent baseline + incremental migrations) |
| File Storage | Supabase Storage — `images` bucket (public, 5MB) + `comprobantes` bucket (private, magic-byte sniffed, caller-namespace pinned) + `course-docs` bucket (private, 25MB, session documents) |
| Video Streaming | Cloudflare Stream — signed RS256 JWTs (1h) bound to caller IP via `accessRules`, direct upload from admin browser |
| Payments | **Unified payment layer** — one admin-selectable method set (`token` / `wire` / `cash` / `card`) live across all four paid services (tournament entry, academia, $1UP, 1UP Pass); every confirmed payment recorded in the `payment_events` ledger via the atomic `apply_payment_event()` RPC. **Stripe** (`stripe` SDK) for `card` Checkout (hosted, card + Apple Pay / Google Pay; gated by `PAYMENTS_CARD_LIVE`). MercadoPago (`mercadopago` SDK v2) scaffolded but inactive — `id;request-id;ts` HMAC manifest + ±10 min replay window + allowed-transition idempotency map |
| Rate limiting | Upstash Ratelimit + Upstash Redis (`@upstash/ratelimit 2.0.8` + `@upstash/redis 1.38.0`) — sliding window, IP + per-user buckets; **live in production** as of 2026-05-23 |
| Image optimization | `next/image` on all public content + `next/og` for 1200×630 OG cards (every section has its own `opengraph-image.tsx`) |
| ISR | `revalidate` declared on every public page; admin mutations bust the cache via `revalidatePath` |
| QR Codes | `react-qr-code` — admin tournament QR + check-in flow |
| User avatars | `users/{user_profile_id}/avatar` in Supabase Storage `images` bucket; deterministic initials-gradient fallback via `<Avatar />`. Surfaced on Hall of Fame, admin participant lists, top app bar, bracket match cards (regular + TV + admin scales) — v2.31.0 |
| Tournament brackets | `@g-loot/react-tournament-brackets 1.0.31-rc` with a custom avatar-aware `matchComponent` (regular / TV / admin scales). Standard mirror-recursive seeding (v2.36.10) for power-of-2 N. Single-elim non-pow2 uses a **play-in round** (v2.36.13). Double-elim non-pow2 uses **bye-cascading** (v2.36.14) so phantom losers-bracket slots auto-collapse. Responsive `ResponsiveScale` wrapper fits any viewport (v2.36.9) + admin Pantalla completa overlay (v2.36.7). |
| Testing | Vitest — **337 tests**, all green (`npm run test:run`) |
| Runtime | Node.js 24 |

---

## Project Structure

```
src/
  proxy.ts            # Subdomain routing (Next.js 16 native proxy) — app.* → /app, admin.* → /admin
  app/
    sitemap.ts        # Native sitemap generator → /sitemap.xml (all public routes with priority)
    robots.ts         # Native robots.txt → /robots.txt (blocks /admin, /app, /api)
    (main)/           # 1upesports.org — all public routes (TopAppBar + Footer + MobileBottomNav)
    app/              # app.1upesports.org — user shell
      login/          #   Public login page (Privy, redirects to dashboard)
      (protected)/    #   Auth-gated group — requires privy-token cookie
        layout.tsx    #     Auth guard + AppSidebar + AppBottomNav (mobile)
        page.tsx      #     Wallet ($1UP balance card → HISTORIAL/ÓRDENES tab toggle — send/receive/buy + Blockscout tx history + purchase orders)
        identidad/    #     Personal data form (nombre, apellidos, username, phone, games, document)
        beneficios/   #     Aliado verification — unlock discounts by checking affiliation
        pass/         #     1UP Pass status + purchase
        academia/     #     My courses + content access
        settings/     #     Linked accounts management
    admin/            # admin.1upesports.org — admin panel
      login/          #   Public login page (admin Privy login)
      (protected)/    #   Auth-gated group — requires privy-token + isAdmin
    api/
      recruitment/    # Public form submission
      checkout/       # MercadoPago preference creation
      webhooks/mercadopago/  # Payment webhook (HMAC-SHA256)
      user/
        profile/      # GET/PUT own user profile
        comfenalco/verify/   # POST Comfenalco affiliation check
        aliado/verify/       # POST generic aliado verification
      admin/          # Protected CRUD endpoints (all require isAdmin)
  components/
    home/             # Home page
    tower/            # Gaming Tower
    team/             # Team + Hall of Fame (PlayerCard with social PNG icons)
    masters/          # MasterCard, MasterGrid — shared with /academia page
    academia/         # Course catalog + PaymentFeedback
    torneos/          # TournamentCard, RegisterButton (with redirect flow), CalendarPromptModal, TournamentCheckinClient, HallOfFameSection, IntlTournamentCard
    perfil/           # WalletTab, AjustesClient (IDENTIDAD + SEGURIDAD tabs), IdentidadTab, SettingsTab, BeneficiosTab, MisTorneosTab
    app/              # App shell (AppSidebar — desktop, AppBottomNav — mobile)
    admin/            # Admin panel components
    layout/           # TopAppBar, Footer (reads social_links from DB), MobileBottomNav
    providers/        # PrivyClientProvider, ServiceWorkerRegister (PWA SW registration)
  lib/
    supabase.ts       # Public + admin Supabase clients
    blob.ts           # uploadImage() → Supabase Storage images bucket
    privy.ts          # Token verification + email resolution
    admin.ts          # isAdmin check (env + DB)
    viem.ts           # Public client + ERC-20 ABIs ($1UP token)
    passVerifier.ts       # On-chain pass tx verification — getTransactionReceipt + decodeEventLog
    socialIcons.ts        # Platform → /public/socialmedia/ icon path mapping
    stream.ts            # Cloudflare Stream — signStreamToken() (RS256 JWT via jose), createUploadUrl() (direct upload)
    courseDocs.ts        # course-docs private bucket — validate/upload/move/delete/signedUrl helpers
    courseAccess.ts      # assertEnrollment(), courseIdFromSession(), CourseAccessError (401/403/404)
    comfenalco.ts         # Comfenalco API client (stub — awaiting credentials)
    mercadopago.ts        # MP preference creation + webhook signature
    email.ts              # Resend emails — token orders, pass purchases (token+bank), tournament registrations (with .ics attachment + admin notification)
    calendar.ts           # buildGoogleCalendarUrl + buildIcsContent (UTC, 2h duration)
    tournamentPoints.ts   # POINTS_BY_POSITION {1:10, 2:5, 3:3} + pointsFor()
  types/
    database.types.ts # Full Supabase type definitions (manually maintained)
public/
  manifest.json       # PWA manifest — display: standalone, theme #e91e8c, shortcuts (Wallet/Torneos/Academia)
  sw.js               # Service worker — offline fallback cache strategy
  socialmedia/        # Brand PNG icons: instagram, tiktok, kick, youtube, x, twitch, github, linkedin, discord, whatsapp
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` at the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # Also used for Supabase Storage uploads

# Privy
NEXT_PUBLIC_PRIVY_APP_ID=
PRIVY_APP_SECRET=

# Admin access
ADMIN_EMAILS=                 # Comma-separated root admin emails

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=

# Card / Apple Pay (Stripe Checkout) — BUILT (v2.47.0), gated by the PAYMENTS_CARD_LIVE flag.
# With PAYMENTS_CARD_LIVE unset/false, card never appears to users and the webhook is inert.
PAYMENTS_CARD_LIVE=                # "true" to flip card on (kill-switch)
STRIPE_SECRET_KEY=                 # inert until card is live
STRIPE_WEBHOOK_SECRET=             # inert until card is live
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRODUCT_PASS=              # per-service catalog Product ids (inline fallback if unset)
STRIPE_PRODUCT_TOURNAMENT_ENTRY=
STRIPE_PRODUCT_TOKEN_PURCHASE=
STRIPE_PRODUCT_ENROLLMENT=

# Subdomains
NEXT_PUBLIC_BASE_URL=https://1upesports.org
NEXT_PUBLIC_APP_URL=https://app.1upesports.org
NEXT_PUBLIC_ADMIN_URL=https://admin.1upesports.org

# Email (Resend — resend.com)
RESEND_API_KEY=                   # Resend dashboard → API Keys
ADMIN_NOTIFICATION_EMAIL=         # Receives purchase/pass notifications

# Comfenalco (activate when API docs are available)
# COMFENALCO_API_URL=
# COMFENALCO_API_KEY=

# Cloudflare Stream (active — required for academia video)
CF_STREAM_ACCOUNT_ID=
CF_STREAM_API_TOKEN=                   # "Read and write to Cloudflare Stream and Images" token
CF_STREAM_KEY_ID=                      # From POST /accounts/{id}/stream/keys (one-time — never regenerate)
CF_STREAM_PEM=                         # Base64-encoded RSA private key from same signing key response
NEXT_PUBLIC_CF_CUSTOMER_CODE=          # From CF Stream playback URL: customer-{CODE}.cloudflarestream.com

# Optional — Base L2 RPC
# NEXT_PUBLIC_BASE_RPC_URL=
```

> Note: `BLOB_READ_WRITE_TOKEN` is not needed — storage uses Supabase (`SUPABASE_SERVICE_ROLE_KEY`).

### 3. Apply database migrations

All migrations have been applied to the live Supabase project. For a fresh database, apply these in order via Supabase SQL Editor:

1. Base schema — `game_categories`, `games`, `players`, `competitions`, `courses`, `pass_benefits`, `floor_info`, `recruitment_submissions`, `admin_users`
2. `incremental_comfenalco_mp.sql` — `user_profiles`, `discount_rules`, `enrollments`
3. `masters_aliados_academia_content` — `masters`, `aliados`, `academia_content`
4. `courses_master_discounts_aliado_user_verified` — FK columns + `user_profiles.verified_aliados`
5. `create_images_storage_bucket` — Supabase Storage `images` bucket + policies
6. `create_social_links` — `social_links` table (footer social icons, 6 platforms seeded)
7. `incremental_masters_social_categories.sql` — `masters` table: adds `kick_url`, `twitch_url`, `github_url`, `categories[]`
8. `create_site_content` — `site_content` table seeded with `equipment_highlight` and `learning_path` rows
9. `extend_user_profiles_v1_6` — adds `nombre`, `apellidos`, `username`, `phone_country`, `phone_number`, `game_ids` to `user_profiles`; unique partial index on `username WHERE username IS NOT NULL`
10. `create_bank_accounts` + `create_token_purchase_orders` — $1UP token purchase purchase tables + `token_purchase_status` enum; unique partial index on `user_profile_id WHERE status = 'pending'`
11. `create_pass_config` — single-row config table; seeded with initial price (30,000 $1UP), recipient address, 30-day duration
12. `create_pass_orders` — pass purchase records + `pass_order_status` enum (`pending_tx | confirmed | failed | expired_unverified`); unique index on `tx_hash`
13. `extend_user_profiles_onboarding` — adds `barrio`, `birth_year`, `onboarding_completed_at`, `referred_by_code` to `user_profiles`
14. `create_referral_codes` — `referral_codes` table with `code`, `description`, `is_active`, `max_uses`, `used_count`; seeded with 3 launch codes
15. `birth_date_replace_birth_year` — renames `birth_year` → `birth_date`, changes type to DATE; best-effort backfills existing rows as Jan 1 of that year
16. `pass_orders_bank_transfer_support` — `tx_hash` made nullable; adds `payment_method` (default 'token'), `bank_account_id` FK to `bank_accounts`, `comprobante_url`, `rejection_reason`; adds `pending_bank` to `pass_order_status` enum
17. `add_pass_status_to_user_profiles` — adds `pass_status_enum` (`never | active | expired`) + `pass_status` column to `user_profiles` (default `'never'`, indexed); trigger `trg_sync_pass_status` auto-syncs on every `pass_orders` INSERT/UPDATE; existing users backfilled
18. `schedule_pass_status_nightly_expiry` — enables `pg_cron`; schedules `expire-1up-passes` job at `0 4 * * *` UTC to flip `active → expired` for lapsed passes
19. `create_tournament_brackets` — `brackets` (one per tournament, unique), `bracket_matches` (with self-referential next_match_id / next_loser_match_id), `bracket_participants` tables; enums `bracket_format`, `bracket_status`, `match_state`, `slot_source`
20. `20260523161035_add_avatar_url_to_user_profiles.sql` — adds `avatar_url text` column (v2.31.0)
21. `20260523161959_hall_of_fame_view_add_avatar_url.sql` — rebuilds `hall_of_fame` view to expose `avatar_url` (v2.31.0)
22. `20260524050326_audit_closure_v2_36_4.sql` — `hall_of_fame` view → `security_invoker = on`, `set_updated_at` search_path pinned, dead `report_match_result` function dropped, `tournament_registrations` RLS policy wrapped in `(SELECT …)` (v2.36.4)
23. `20260526131000_pass_orders_allow_zero_token_amount_for_admin_grant.sql` — relaxes the `pass_orders` token-amount CHECK to allow `0` for `admin_grant` orders while keeping `> 0` for paid purchases (v2.36.16)
24. `20260527144250_tournament_prizes_include_pass.sql` — adds `tournament_prizes.includes_pass` + `pass_days`, extends `prize_type` CHECK to admit `pass`, rewrites the amount-consistency CHECK to encode pass invariants (v2.37.0)
25. `20260527144344_tournament_results_pass_order_id.sql` — adds `tournament_results.pass_order_id` (FK → `pass_orders`, ON DELETE SET NULL) + partial UNIQUE index for delivery idempotency (v2.37.0)
26. `20260531132045_passes_object_model.sql` — adds the `passes` table (first-class pass asset, `id` = future ERC-721 tokenId) + `pass_state` enum (`issued/active/expired/revoked`); repoints `pass_status` derivation + the `pass_orders` trigger (now mirrors into `passes`) + nightly cron; backfills all confirmed orders. Behavior-neutral (v2.38.0, Pass redesign Phase 1)
27. `20260531140045_tournament_results_pass_id.sql` — adds `tournament_results.pass_id` (FK → `passes`, ON DELETE SET NULL) + partial UNIQUE index; the link for claim-later prize delivery (v2.39.0, Pass redesign Phase 2)
28. `20260531182031_paid_tournament_entry.sql` — adds `tournaments.entry_fee_tokens`/`entry_fee_cop`, the `tournament_entry_orders` table + `tournament_entry_status` enum, the one-in-flight partial UNIQUE and `lower(tx_hash)` UNIQUE (v2.41.0, paid tournament entry data layer)
29. `20260612000000_tournament_treasury_address.sql` — adds `tournaments.treasury_address` (nullable text, EVM address) — per-tournament $1UP entry-fee treasury; never reuses `pass_config`, required when `entry_fee_tokens > 0` (v2.41.0)
30. `20260625120000_user_profiles_location_columns.sql` — adds `country` / `state` / `city` (text) to `user_profiles` for the cascading onboarding location selector; `barrio` kept nullable for back-compat, no longer collected (v2.55.0)

### 4. Start the dev server

```bash
npm run dev
# → http://localhost:3000
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with Turbopack |
| `npm run build` | Production build (run before shipping) |
| `npm run start` | Start production server |
| `npm run lint` | ESLint check |
| `npm run test` | Vitest in watch mode |
| `npm run test:run` | Vitest single run (CI) |

---

## Pages

**1upesports.org (public)**

| Route | Description |
|-------|-------------|
| `/` | Home — Hero, Brands Banner (animated marquee), 1UP Pass section, Academia teaser, Torneos teaser, Marketplace teaser, Nuestro Ecosistema (3-pillar), Recruitment form |
| `/torneos` | Tournament list — Hall of Fame leaderboard, upcoming/live/completed cards with prizes, registration CTA, month+game filters. International tournaments section. HallOfFame team competition history at bottom. Recruitment form. |
| `/torneos/[slug]` | Tournament detail — cover image, status/game/location badges, prize podium, sponsor strip, `RegisterButton` CTA (paid tournaments open the `TournamentEntryWizard` payment step — $1UP on-chain or bank comprobante, v2.41.0). Dynamic OG metadata per tournament. Numeric ID fallback for old QR codes/bookmarks. |
| `/torneos/[slug]/checkin` | QR check-in — inline Privy login (modal, no redirect), validates registration status, marks attendance via API. Numeric ID fallback for old QR codes. |
| `/torneos/[slug]/tv` | **TV / venue display view (v2.35.0).** Fullscreen, no chrome (lives in `(bare)` route group — sibling of `(main)`). Huge tournament title, avatar-aware bracket scaled to viewport (`scale="tv"`), sponsor strip at bottom. Polls `/api/tournaments/[slug]/bracket` every 15 s for live updates as the cockpit records winners. |
| `/gaming-tower` | 6-floor breakdown, 1UP Pass benefits, per-category games showcase (category image + game cards), Map |
| `/privacidad` | Política de Privacidad y Tratamiento de Datos (Ley 1581) |
| `/team` | Redirects to `/` — roster removed; Masters live on `/academia` |
| `/academia` | Course catalog + Masters profiles (full bio, social links, courses per master) + checkout via the unified payment methods (cash/$1UP/wire live; card via Stripe gated by `PAYMENTS_CARD_LIVE`; MercadoPago scaffolded but inactive). Each course card links to its public preview. |
| `/academia/[courseId]` | Public course preview — hero card (image, master, stats, price), playable intro video (Cloudflare Stream, no login required), full module + session list with lock icons, `INSCRIBIRSE` CTA. Dynamic OG metadata per course. |
| `/juegos` | Redirects to `/gaming-tower` — games integrated into Tower page |
| `/recreativo` | Casual gaming section |
| `/marketplace` | Coming soon — merchandise + periféricos, paga con $1UP tokens. Dynamic social links from DB. |
| `/perfil` | Legacy profile page (redirects to app subdomain) |

**app.1upesports.org (user app)**

| Route | Description |
|-------|-------------|
| `/app` | Wallet — $1UP balance, send (min 1 $1UP, max = live balance, QR scanner), receive (QR code), purchase orders, Blockscout tx history (paginated 10/page, Colombia timezone) |
| `/app/mis-torneos` | My tournament registrations — card list with status badges (INSCRITO/ASISTIÓ/CANCELADO/NO ASISTIÓ), links to tournament detail pages |
| `/app/beneficios` | Aliado verification — unlock discounts (Comfenalco, Comfandi, universities, etc.) |
| `/app/onboarding` | Mandatory first-time wizard — nombre, contacto, ubicación (país/estado/ciudad cascading select), birth_date (day/month/year picker, min age 14), documento de identidad (required), juegos, referral code (optional), privacy consent (required, Ley 1581) |
| `/app/pass` | 1UP Pass status + purchase — payment methods governed by Métodos de Pago: $1UP tokens (on-chain, instant), bank transfer (manual admin approval, max 24h), and cash (in-person, admin-approved with a note — v2.46.0) |
| `/app/academia` | My enrolled courses — course cards with "Ver curriculum" link |
| `/app/academia/[courseId]` | Per-course curriculum — intro video, module tabs, session accordion (lazy video player + signed doc downloads) — enrollment required |
| `/app/ajustes` | Settings — two tabs: IDENTIDAD (profile data, nombre/apellidos/@username/phone/games/document) + SEGURIDAD (linked accounts). `/app/identidad` and `/app/settings` redirect here. |

---

## Admin Panel

| Route | Description |
|-------|-------------|
| `/admin` | Dashboard — stat cards + quick links |
| `/admin/games` | Games + categories CRUD (image upload per game + per category) |
| `/admin/floors` | Gaming Tower floor info CRUD (image upload per floor) |
| `/admin/players` | Team roster CRUD (photo upload, social links) |
| `/admin/competitions` | Hall of Fame CRUD |
| `/admin/masters` | Masters CRUD (photo, categories checkboxes, all 8 social links, topics, assigned courses shown) |
| `/admin/courses` | Academia course list — `+ NUEVO CURSO` (→ `/courses/new`) + per-row `Editar` (→ full editor) + `Eliminar` |
| `/admin/courses/new` | Quick-create course (name + category) → redirects to full editor |
| `/admin/courses/[id]/edit` | Full course editor — **Información** tab (all fields + CF Stream intro video + cover image) + **Contenido** tab (drag-reorder modules, expandable session list per module, slide-in session editor with video upload/docs/links) |
| `/admin/1pass` | 1UP Pass (v2.49.0) — **Configuración del Pass** (price, treasury wallet **dropdown** from `treasury_wallets`, duration, active toggle) + **current pass-holders table** (`AdminPassesList`, from the `passes` table). Benefits editing moved to Beneficios Pass (Sitio Web). |
| `/admin/pass-orders` | Pass purchase orders only (v2.49.0) — KPIs, status/active badges, BaseScan TX links, admin notes. Cash + bank tabs approve through the same activation path. |
| `/admin/pass-benefits` | **Beneficios Pass** — 1UP Pass perks CRUD (add/edit/delete). In the **Sitio Web** sidebar group (v2.49.0). |
| `/admin/payment-methods` | **Métodos de Pago (v2.42.0)** — matrix of the 4 paid services × 4 methods (`$1UP`/`transferencia`/`efectivo`/`tarjeta`), backed by `service_payment_methods`. `tarjeta` (Stripe) locked until `PAYMENTS_CARD_LIVE`. In the **Sistema** sidebar group. |
| `/admin/pass-bank-orders` | Bank-transfer pass orders — approve (calculates expiry + stacking) or reject (with rejection reason). Pending orders require admin review within 24h. |
| `/admin/discounts` | Discount rule CRUD (trigger: Comfenalco/promo/manual/auto + aliado link) |
| `/admin/enrollments` | Course enrollment table — filterable by status (approved/pending/rejected/cancelled) AND payment method (MercadoPago/Banco/$1UP Token). Inline approve/reject panel for pending token/bank enrollments. Revenue KPI at top. |
| `/admin/privy-users` | All Privy users — table view with columns: Usuario / Wallet·$1UP / Cédula / Juegos / Cursos / Registrado. Search by email/wallet/cédula/nombre/@username, sort by $1UP balance or date, filter by game. |
| `/admin/user-profiles` | Supabase user profiles — table view (Email / Documento / Comfenalco / Privy ID / Registro). Legacy read-only. |
| `/admin/token-orders` | $1UP token purchase purchase orders — filterable by status, comprobante preview, wallet-send approve (admin sends $1UP on-chain from connected wallet), reject |
| `/admin/bank-accounts` | **Cuentas y Tesorerías (v2.48.0)** — COP bank accounts CRUD (shown to users in the BUY modal) **+ treasury wallets CRUD** (`treasury_wallets`). Moved to the **Sistema** sidebar group; tournaments + the 1UP Pass pick their $1UP treasury from this wallet list. |
| `/admin/torneos` | Tournament directory + **creation wizard (v2.50.0)** — `TournamentCreateWizard` (5 steps: Básico → Inscripción [gratis/pago: $1UP and/or COP + tesorería dropdown] → Premios *(saltable)* → Presentación *(saltable)* → Revisar y crear) replaces the name-only quick-create. Rows show a prominent name + status pill + date. Per-tournament fields: prize structure (1°/2°/3° — tokens/COP/both/Pase 1UP), sponsor, entry fee, treasury. Slug auto-generated from name. |
| `/admin/tournament-registrations` | All tournament registrations — filter by tournament/status, mark attended/no_show, CSV export |
| `/admin/torneos-internacionales` | International tournament CRUD — country, city, organizer, external registration link |
| `/admin/torneos/[slug]/manage` | **Per-tournament cockpit (v2.36.0).** Single page with stats strip, 4-step phase stepper (Inscripciones → Borrador → En curso → Finalizado, driven by bracket lifecycle), Pública/TV/QR/Share/Cancelar/Eliminar toolbar, and 5 tabs: **Información** (inline-editable form incl. entry fee — v2.41.0), **Inscripciones** (status mgmt + CSV), **Pagos** (entry-fee orders: approve/reject pending bank payments with comprobante preview + manual-refund flags — v2.41.0), **Bracket** (seeding, start, record winners, undo), **Premios** (podium + on-chain $1UP delivery with one click, or manual tx-hash/comprobante; **one-click 1UP Pass delivery** when a position's prize includes a pass — v2.37.0). Replaces the prior standalone `/admin/tournament-brackets` and `/admin/tournament-results` pages — both deleted in 2.36.0. |
| `/admin/site-images` | Site-level images — Equipment Highlight (Gaming Tower) + Learning Path (Academia) |
| `/admin/referral-codes` | Referral code CRUD — create codes with optional use cap, activate/deactivate, usage tracking |
| `/admin/social-links` | Social link URLs per platform — footer icons (instagram, tiktok, kick, youtube, x, twitch) + community invite links (discord, whatsapp — shown in CommunitySection, filtered from footer) |
| `/admin/aliados` | Aliados & Sponsors CRUD — two tabs: **Banner** (show_in_banner = true, home marquee) and **API / Verificación** (integration partners with NIT, email, API URL/key). Replaces `/admin/brand-logos`. |
| `/admin/submissions` | Recruitment form submissions (read-only) |
| `/admin/users` | Admin user management |

---

## Auth & Admin

- **Login methods**: email, Google (via Privy) — Discord disabled
- **Admin guard**: `src/app/admin/(protected)/layout.tsx` — verifies Privy cookie token + `isAdmin`
- **API protection**: every `/api/admin/*` calls `verifyToken` + `isAdmin` — no exceptions
- **User APIs**: `/api/user/*` require Privy Bearer token (not admin)
- **Client token**: `const token = await getAccessToken()` from `usePrivy()` → `Authorization: Bearer <token>`
- **Cross-subdomain auth (tournament registration)**: unauthenticated users on `1upesports.org` are redirected to `app.1upesports.org/login?redirect=<tournament-url>`. After login, `safeRedirectTarget()` returns them to the tournament page. Privy session is shared at the app-ID level via secure iframe — no separate cookie config needed. Privy Dashboard must have `1upesports.org` in both **Allowed Domains** and **Allowed OAuth Redirect URLs**.

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `game_categories` | Fighting, FPS, Dancing, TCG |
| `games` | Individual games per category |
| `players` | Pro roster (social links, photo) |
| `competitions` | Hall of Fame entries |
| `courses` | Academia catalog — `price_cop`, `price_token`, `duration_hours`, `session_duration_min`, `intro_video_uid` (CF Stream), `intro_description`, master_id FK, is_active |
| `course_modules` | Modules per course — title, description, sort_order, is_published (CASCADE) |
| `course_sessions` | Sessions per module — title, description, `video_uid` (CF Stream UID), duration_minutes, sort_order, is_published (CASCADE) |
| `course_session_links` | Support links per session — label, url, sort_order (CASCADE) |
| `course_session_documents` | Downloadable files — label, `storage_path` (bucket `course-docs`, private), mime_type, size_bytes, sort_order (CASCADE) |
| `masters` | Coaches — photo, specialty, categories[], topics[], all 8 social links (instagram/tiktok/youtube/x/kick/twitch/github/linkedin) |
| `pass_benefits` | 1UP Pass perks |
| `floor_info` | Gaming Tower 6-floor breakdown |
| `recruitment_submissions` | Form submissions from Home + Team pages |
| `user_profiles` | Extended user data — nombre, apellidos, username, phone, **country/state/city** (cascading onboarding location, v2.55.0; `barrio` legacy/nullable), birth_date (DATE), game_ids[], document, Comfenalco status, verified_aliados[], onboarding_completed_at, referred_by_code, pass_status (never/active/expired), **avatar_url** (Supabase Storage URL, v2.31.0; null → UI shows initials gradient) |
| `aliados` | Partner organizations AND banner sponsors — name, NIT, email, api_url, api_key, logo_url, website_url, sort_order, show_in_banner, is_active. `show_in_banner = true` → appears in home marquee. Replaces the former `brand_logos` table. |
| `discount_rules` | Discount engine — trigger type + applies_to + aliado_id FK |
| `enrollments` | Payment records — user → course/pass, MP lifecycle |
| `academia_content` | Videos/docs/quizzes per course (published after enrollment) |
| `social_links` | Footer social icons — platform, url, is_active, sort_order |
| `site_content` | Site-level images — key (PK), image_url (equipment_highlight, learning_path) |
| `admin_users` | DB-stored admins (env var admins always override) |
| `bank_accounts` | Bank transfer destinations — shown in the BUY modal; admin-managed (bank name, type, account number, holder, instructions) |
| `token_purchase_orders` | $1UP token purchase purchases — user submits COP amount + comprobante; admin approves/rejects and sends tokens manually. Rate: 1 $1UP = 1,000 COP |
| `pass_config` | Single-row config for 1UP Pass: price in $1UP (`price_token`), `recipient_address`, `duration_days`, `is_active` — admin-editable |
| `pass_orders` | Pass purchases — `payment_method` (token/bank/admin_grant), `tx_hash` (nullable — only for token path), `bank_account_id` FK, `comprobante_url`, `status` (confirmed/failed/pending_bank/…), `expires_at` (stacks on renewal), `rejection_reason`. The *transaction* record; the *asset* is `passes` |
| `passes` | **First-class pass asset (v2.38.0)** — one row per pass. `id` (→ future ERC-721 tokenId), `owner_user_profile_id`, `owner_wallet_address`, `source` (purchase/admin_grant/tournament_prize), `source_order_id` FK → `pass_orders`, `state` (`issued`/`active`/`expired`/`revoked`), `activated_at`/`expires_at` (null until activated — claim-later), revoke columns, and null NFT columns (`token_id`/`contract_address`/`mint_tx_hash`/`chain_id`) for Phase 3. `user_profiles.pass_status` is derived from this table |
| `referral_codes` | Codes optional at onboarding (can be added later on `/app/identidad`): `code` (unique), `description`, `is_active`, `max_uses`, `used_count` — admin-managed |
| `tournaments` | Esports tournaments — `slug` (unique, auto-generated from name), game FK, date, image, max_participants, status (upcoming/live/completed), location_type (presencial/online/mixto), sponsor_name, sponsor_website_url, sponsor_logo_url, is_registration_open, sort_order, **entry_fee_tokens** / **entry_fee_cop** (both null = free — v2.41.0), **treasury_address** (per-tournament $1UP treasury; required when entry_fee_tokens > 0, never reuses pass_config — v2.41.0) |
| `tournament_entry_orders` | **Entry-fee payment record (v2.41.0)** — mirrors `pass_orders`: tournament/user FKs, `registration_id` (linked once the slot is taken), payment_method (token/bank), amount_tokens/amount_cop, tx_hash (`lower()` UNIQUE), bank_account_id, comprobante_url, status (`tournament_entry_status`: pending_bank/confirmed/rejected/cancelled), review fields. Partial UNIQUE: one in-flight order per user+tournament. Confirmed order with null registration_id = paid-but-full → manual refund |
| `tournament_prizes` | Prize structure per tournament — position (1–3 unique per tournament), prize_type (tokens/cop/both/**pass**), amount_tokens, amount_cop, **includes_pass** (bool), **pass_days** (int). DB CHECK enforces type/amount consistency + pass invariants. A 1UP Pass can be a standalone prize or an add-on on a tokens/cop/both row (v2.37.0) |
| `tournament_registrations` | User registrations — tournament FK, user_profile FK, privy_user_id, status (registered/cancelled/attended/no_show), registered_at, cancelled_at. RPC `register_for_tournament` enforces capacity + uniqueness atomically |
| `international_tournaments` | International tournaments — organizer, country, city, game FK, registration_link (external). No prizes/registrations/capacity lifecycle |
| `tournament_results` | Podium results — tournament FK, user_profile FK, position (1–3), points, awarded_by, prize_status (`no_prize`/`pending`/`sent`), prize_tx_hash, prize_sent_at, prize_sent_by, prize_comprobante_url, **pass_order_id** (legacy v2.37.0 link), **pass_id** (FK → `passes` — the claimable pass issued as a prize, partial UNIQUE for idempotency, v2.39.0). UNIQUE per tournament+position and per tournament+user |
| `hall_of_fame` | PostgreSQL VIEW — aggregates gold/silver/bronze counts + total_points per player, ordered by points DESC then golds DESC |
| `payment_events` | **Unified payment ledger (v2.42.0-data)** — one row per payment, polymorphically linked to any order via `(order_kind, order_id)` (no FK). `method` (`token`/`wire`/`cash`/`card`), `amount_cop` **xor** `amount_tokens`, `status` (`pending`/`confirmed`/`rejected`/`cancelled`), method refs (`tx_hash`, `comprobante_url`, `recorded_by_admin`+`reason` for cash, reserved `stripe_*`). Global UNIQUE `lower(tx_hash)` (cross-kind replay block) + UNIQUE `stripe_payment_intent_id`. Written by the `apply_payment_event()` RPC (advisory-lock serialized, single-confirmed invariant, returns `became_paid`). **Live across all four paid services** (tournament entry, academia, $1UP, 1UP Pass) — the cash rollout (v2.43.0→v2.46.0) + the card path (v2.47.0) record here |
| `service_payment_methods` | Per-service enabled-methods config (v2.42.0-data) — `service` (`order_kind` PK), `token_enabled`/`wire_enabled`/`cash_enabled`/`card_enabled`. Admin-editable from **Métodos de Pago**; card stays hidden until `PAYMENTS_CARD_LIVE` |
| `treasury_wallets` | **Admin-managed on-chain destination wallets for $1UP (v2.48.0)** — `label`, `address` (EVM, CHECK), `chain_id` (default 8453/Base), `is_active`, `sort_order`. RLS deny-all (service-role only). Managed on the **Cuentas y Tesorerías** page; tournaments + the 1UP Pass select their treasury from this list (the chosen `address` is written into `tournaments.treasury_address` / the Pass config, so on-chain verification is unchanged) |

---

## File Storage

### `images` bucket — public, 5 MB, jpg/png/webp/gif/avif

Entity uploads use `{folder}/{entityId}/cover` (no extension — MIME stored in metadata). Re-uploading always overwrites the same key via `upsert: true`. New entities without an ID yet land at `{folder}/pending/{timestamp}.{ext}`.

| Path | Used by |
|------|---------|
| `images/players/{id}/cover` | Player photos |
| `images/courses/{id}/cover` | Course cover images |
| `images/games/{id}/cover` | Game cover images |
| `images/categories/{id}/cover` | Game category images |
| `images/floors/{id}/cover` | Floor images (Gaming Tower) |
| `images/masters/{id}/cover` | Master photos |
| `images/aliados/{id}/cover` | Partner logos and banner sponsor logos |
| `images/tournaments/{id}/cover` | Tournament cover images |
| `images/site/{key}/cover` | Site-level images (equipment-highlight, learning-path) |
| `images/users/{user_profile_id}/avatar` | User profile avatars (v2.31.0) — JPEG/PNG/WebP, ≤5 MB, magic-byte sniffed |

### `comprobantes` bucket — **private**, 5 MB, jpg/png/webp/pdf

Payment receipts uploaded by users during token purchase, pass purchase, and course enrollment. No permanent public URL exists — admin routes generate 1-hour signed URLs via `getComprobanteSignedUrl()` in `src/lib/blob.ts`.

| Path | Used by |
|------|---------|
| `pending/{userHash}-{timestamp}.{ext}` | Temporary path before order ID is assigned |
| `{orderId}/receipt.{ext}` | Final path after order is created |

Static brand icons (instagram, tiktok, etc.) live in `/public/socialmedia/` — not uploaded, shipped with the app.

---

## Payment Flow (MercadoPago)

```
User clicks "INSCRIBIRSE"
  → POST /api/checkout { courseId }     (Privy Bearer token required)
    → lookup user_profiles.comfenalco_afiliado
    → fetch active discount_rules (best discount wins)
    → INSERT enrollments (status: pending)
    → create MP Preference
    → return { checkoutUrl }
  → window.location.href = checkoutUrl
  → user pays on MercadoPago
  → POST /api/webhooks/mercadopago      (HMAC-SHA256 verified)
    → fetch full payment from MP API
    → UPDATE enrollments (status: approved | rejected | cancelled)
  → user redirected to /academia?payment=success|failure|pending
```

---

## Comfenalco Integration

Status: **stub** — awaiting API documentation and credentials from Comfenalco.

To activate: set `COMFENALCO_API_URL` + `COMFENALCO_API_KEY` and implement response parsing in `src/lib/comfenalco.ts` (marked with `// TODO`).

---

## Cloudflare Stream (Academia Video)

Status: **active** — architecture documented in `.claude/skills/cloudflare-stream.md`. Required env vars are configured on Vercel (Production).

### Why Cloudflare Stream
Course videos need to be gated — only enrolled users can watch, and URLs must not be shareable. Cloudflare Stream provides:
- Signed JWT tokens (1h expiry) — videos only play for verified enrolled users
- `requireSignedURLs: true` — no direct URL sharing or hotlinking
- Adaptive bitrate (360p–1080p HLS) — no custom player infrastructure needed
- Direct creator uploads from admin panel — no video passes through the server

### Architecture

```
ADMIN UPLOAD
  Admin clicks "Subir Video" → POST /api/admin/stream-upload-url
    → Cloudflare API returns { uid, uploadURL }
    → Browser POSTs file as multipart/form-data to uploadURL (never exposes API token)
      NOTE: CF's direct_upload URL only accepts POST multipart — PUT silently fails
    → Store uid in course_sessions.video_uid (or courses.intro_video_uid)

USER PLAYBACK
  Enrolled user opens /app/academia/[courseId]
    → POST /api/user/stream-token { contentId }
      → Verify enrollment: enrollments.status = 'approved'
      → Sign RS256 JWT (1h expiry)
      → Return { token }
    → <iframe src="https://customer-{CODE}.cloudflarestream.com/{token}/iframe" />
```

### DB Change Required

```sql
ALTER TABLE academia_content ADD COLUMN IF NOT EXISTS stream_uid text;
```

`url` column stays for YouTube/docs/quizzes. `stream_uid` is only set for Stream-hosted videos.

### New Environment Variables

| Variable | Description |
|----------|-------------|
| `CF_STREAM_ACCOUNT_ID` | Cloudflare dashboard → Account ID |
| `CF_STREAM_API_TOKEN` | API token with Stream:Edit + Stream:Read permissions |
| `CF_STREAM_KEY_ID` | From one-time signing key creation (POST /accounts/{id}/stream/keys) |
| `CF_STREAM_PEM` | Base64-encoded RSA private key (from same signing key response) |
| `CF_STREAM_CUSTOMER_CODE` | From embed URL in Stream dashboard (customer-XXXXX) |

### New Files

| File | Purpose |
|------|---------|
| `src/lib/stream.ts` | `signStreamToken(uid)` + `createUploadUrl(filename)` helpers |
| `src/app/api/user/stream-token/route.ts` | POST — verify enrollment → return signed JWT |
| `src/app/api/admin/stream-upload-url/route.ts` | POST — isAdmin → return CF direct upload URL + uid |

### Package Required

```bash
npm install jose
```

### Cost Estimate

| Plan | Monthly | Storage | Delivery | Fits 1UP? |
|------|---------|---------|----------|-----------|
| Starter | $5 | 1,000 min | 5,000 min | ❌ storage too small |
| Creator | $50 | 10,000 min | 50,000 min | ✅ comfortable headroom |

Assumptions: 20 courses × avg 2h = 2,400 min stored. 100 enrolled users × avg 30 min/month = 3,000 min delivered.
**Recommendation: Creator plan at $50 USD/month.**

### One-Time Cloudflare Setup

```
1. Create Cloudflare account → enable Stream product
2. Create API token: Permissions → Stream:Edit + Stream:Read
3. Note Account ID (top-right of dashboard)
4. Run signing key creation:
   curl -X POST "https://api.cloudflare.com/client/v4/accounts/${CF_STREAM_ACCOUNT_ID}/stream/keys" \
     -H "Authorization: Bearer ${CF_STREAM_API_TOKEN}"
   → Save id (KEY_ID) and pem (base64 private key)
5. Note Customer Code from any test video embed URL
6. Set allowedOrigins on videos → ["app.1upesports.org"]
```

---

## Design System

Neo-Brutalist Competitive — full spec in `designs/cyber_edge_brutalist/DESIGN.md`.

Key rules:
- **0px border-radius** — `rounded-*` banned except `rounded-full`
- **No 1px dividers** — use background color shifts
- **Public pages** use only custom Tailwind — no shadcn in `src/components/{home,tower,team,academia,recreativo,juegos}/`
- **Skew pattern** — outer: `skew-fix`, inner text: `block skew-content`
- **Nav** always glassmorphism via `glass-panel` class

---

## Versioning & Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a full delivery history.
