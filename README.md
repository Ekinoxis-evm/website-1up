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
| Auth | Privy (`@privy-io/react-auth` + `@privy-io/server-auth`) |
| Database | Supabase (`@supabase/supabase-js`) |
| File Storage | Supabase Storage (`images` bucket — public, 5MB limit) |
| Payments | MercadoPago (`mercadopago` SDK v2) |
| QR Codes | `react-qr-code` — admin tournament QR + check-in flow |
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

# Cloudflare Stream (planned — activate when integrating Academia video)
# CF_STREAM_ACCOUNT_ID=
# CF_STREAM_API_TOKEN=
# CF_STREAM_KEY_ID=
# CF_STREAM_PEM=
# CF_STREAM_CUSTOMER_CODE=

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
10. `create_bank_accounts` + `create_token_purchase_orders` — OTC $1UP purchase tables + `token_purchase_status` enum; unique partial index on `user_profile_id WHERE status = 'pending'`
11. `create_pass_config` — single-row config table; seeded with initial price (30,000 $1UP), recipient address, 30-day duration
12. `create_pass_orders` — pass purchase records + `pass_order_status` enum (`pending_tx | confirmed | failed | expired_unverified`); unique index on `tx_hash`
13. `extend_user_profiles_onboarding` — adds `barrio`, `birth_year`, `onboarding_completed_at`, `referred_by_code` to `user_profiles`
14. `create_referral_codes` — `referral_codes` table with `code`, `description`, `is_active`, `max_uses`, `used_count`; seeded with 3 launch codes
15. `birth_date_replace_birth_year` — renames `birth_year` → `birth_date`, changes type to DATE; best-effort backfills existing rows as Jan 1 of that year
16. `pass_orders_bank_transfer_support` — `tx_hash` made nullable; adds `payment_method` (default 'token'), `bank_account_id` FK to `bank_accounts`, `comprobante_url`, `rejection_reason`; adds `pending_bank` to `pass_order_status` enum
17. `add_pass_status_to_user_profiles` — adds `pass_status_enum` (`never | active | expired`) + `pass_status` column to `user_profiles` (default `'never'`, indexed); trigger `trg_sync_pass_status` auto-syncs on every `pass_orders` INSERT/UPDATE; existing users backfilled
18. `schedule_pass_status_nightly_expiry` — enables `pg_cron`; schedules `expire-1up-passes` job at `0 4 * * *` UTC to flip `active → expired` for lapsed passes

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

---

## Pages

**1upesports.org (public)**

| Route | Description |
|-------|-------------|
| `/` | Home — Hero, Brands Banner (animated marquee), 1UP Pass section, Academia teaser, Torneos teaser, Marketplace teaser, Nuestro Ecosistema (3-pillar), Recruitment form |
| `/torneos` | Tournament list — Hall of Fame leaderboard, upcoming/live/completed cards with prizes, registration CTA, month+game filters. International tournaments section. HallOfFame team competition history at bottom. Recruitment form. |
| `/torneos/[id]` | Tournament detail — cover image, status/game/location badges, prize podium, `RegisterButton` CTA. Dynamic OG metadata per tournament. |
| `/torneos/[id]/checkin` | QR check-in — inline Privy login (modal, no redirect), validates registration status, marks attendance via API. |
| `/gaming-tower` | 6-floor breakdown, 1UP Pass benefits, per-category games showcase (category image + game cards), Map |
| `/privacidad` | Política de Privacidad y Tratamiento de Datos (Ley 1581) |
| `/team` | Redirects to `/` — roster removed; Masters live on `/academia` |
| `/academia` | Course catalog + Masters profiles (full bio, social links, courses per master) + MercadoPago checkout |
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
| `/app/onboarding` | Mandatory first-time wizard — nombre, contacto, barrio, birth_date (day/month/year picker, min age 14), documento de identidad (required), juegos, referral code (optional), privacy consent (required, Ley 1581) |
| `/app/pass` | 1UP Pass status + purchase — two payment methods: $1UP tokens (on-chain, instant) or bank transfer (manual admin approval, max 24h) |
| `/app/academia` | My enrolled courses + content access |
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
| `/admin/courses` | Academia course CRUD (image, master assignment, category) + inline content management (video/doc/quiz per course, published toggle) — content sub-modal at z-60 inside course edit modal |
| `/admin/1pass` | 1UP Pass — config card (price, recipient wallet, duration, active toggle) + KPIs + inline benefits CRUD (add/edit/delete) |
| `/admin/pass-orders` | On-chain pass purchase orders — KPIs, status/active badges, BaseScan TX links, admin notes |
| `/admin/pass-bank-orders` | Bank-transfer pass orders — approve (calculates expiry + stacking) or reject (with rejection reason). Pending orders require admin review within 24h. |
| `/admin/discounts` | Discount rule CRUD (trigger: Comfenalco/promo/manual/auto + aliado link) |
| `/admin/enrollments` | Read-only payment log with revenue total |
| `/admin/privy-users` | All Privy users — merged with profiles, $1UP balance, enrollments, pass status |
| `/admin/user-profiles` | Supabase user profiles (legacy read-only view, Comfenalco status) |
| `/admin/token-orders` | OTC $1UP purchase orders — filterable by status, comprobante preview, wallet-send approve (admin sends $1UP on-chain from connected wallet), reject |
| `/admin/bank-accounts` | Bank accounts CRUD — controls which accounts are shown to users in the BUY modal |
| `/admin/torneos` | Tournament CRUD — name, game, date, image, description, max participants, location type, status, prize structure (1°/2°/3° — tokens/COP/both), sort order |
| `/admin/tournament-registrations` | All tournament registrations — filter by tournament/status, mark attended/no_show, CSV export |
| `/admin/torneos-internacionales` | International tournament CRUD — country, city, organizer, external registration link |
| `/admin/tournament-results` | Podium results — select tournament → assign 1°/2°/3° from registered players → save points (10/5/3 default, custom override) |
| `/admin/brand-logos` | Brands Banner CRUD — logos for the animated marquee on home (name, logo, optional link, sort order) |
| `/admin/site-images` | Site-level images — Equipment Highlight (Gaming Tower) + Learning Path (Academia) |
| `/admin/referral-codes` | Referral code CRUD — create codes with optional use cap, activate/deactivate, usage tracking |
| `/admin/social-links` | Social link URLs per platform — footer icons (instagram, tiktok, kick, youtube, x, twitch) + community invite links (discord, whatsapp — shown in CommunitySection, filtered from footer) |
| `/admin/aliados` | Partner CRUD (name, NIT, email, API URL/key) |
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
| `courses` | Academia catalog (price, master_id FK, checkout via MP) |
| `masters` | Coaches — photo, specialty, categories[], topics[], all 8 social links (instagram/tiktok/youtube/x/kick/twitch/github/linkedin) |
| `pass_benefits` | 1UP Pass perks |
| `floor_info` | Gaming Tower 6-floor breakdown |
| `recruitment_submissions` | Form submissions from Home + Team pages |
| `user_profiles` | Extended user data — nombre, apellidos, username, phone, barrio, birth_date (DATE), game_ids[], document, Comfenalco status, verified_aliados[], onboarding_completed_at, referred_by_code, pass_status (never/active/expired) |
| `aliados` | Partner organizations — name, NIT, email, API URL/key |
| `discount_rules` | Discount engine — trigger type + applies_to + aliado_id FK |
| `enrollments` | Payment records — user → course/pass, MP lifecycle |
| `academia_content` | Videos/docs/quizzes per course (published after enrollment) |
| `social_links` | Footer social icons — platform, url, is_active, sort_order |
| `site_content` | Site-level images — key (PK), image_url (equipment_highlight, learning_path) |
| `admin_users` | DB-stored admins (env var admins always override) |
| `bank_accounts` | OTC payment destinations — shown in the BUY modal; admin-managed (bank name, type, account number, holder, instructions) |
| `token_purchase_orders` | OTC $1UP purchases — user submits COP amount + comprobante; admin approves/rejects and sends tokens manually. Rate: 1 $1UP = 1,000 COP |
| `pass_config` | Single-row config for 1UP Pass: price in $1UP (`price_token`), `recipient_address`, `duration_days`, `is_active` — admin-editable |
| `pass_orders` | Pass purchases — `payment_method` (token/bank), `tx_hash` (nullable — only for token path), `bank_account_id` FK, `comprobante_url`, `status` (confirmed/failed/pending_bank/…), `expires_at` (stacks on renewal), `rejection_reason` |
| `referral_codes` | Codes optional at onboarding (can be added later on `/app/identidad`): `code` (unique), `description`, `is_active`, `max_uses`, `used_count` — admin-managed |
| `brand_logos` | Home marquee banner — name, `logo_url`, `website_url` (optional, makes logo clickable), `sort_order`, `is_active` |
| `tournaments` | Esports tournaments — game FK, date, image, max_participants, status (upcoming/live/completed), location_type (presencial/online/mixto), is_registration_open, sort_order |
| `tournament_prizes` | Prize structure per tournament — position (1–3 unique per tournament), prize_type (tokens/cop/both), amount_tokens, amount_cop. DB CHECK enforces type/amount consistency |
| `tournament_registrations` | User registrations — tournament FK, user_profile FK, privy_user_id, status (registered/cancelled/attended/no_show), registered_at, cancelled_at. RPC `register_for_tournament` enforces capacity + uniqueness atomically |
| `international_tournaments` | International tournaments — organizer, country, city, game FK, registration_link (external). No prizes/registrations/capacity lifecycle |
| `tournament_results` | Podium results — tournament FK, user_profile FK, position (1–3), points, awarded_by, prize_status (`no_prize`/`pending`/`sent`), prize_tx_hash, prize_sent_at, prize_sent_by, prize_comprobante_url. UNIQUE per tournament+position and per tournament+user |
| `hall_of_fame` | PostgreSQL VIEW — aggregates gold/silver/bronze counts + total_points per player, ordered by points DESC then golds DESC |

---

## Image Storage

All uploaded images go to the **Supabase Storage `images` bucket** (public, 5MB, jpg/png/webp/gif/avif).

Entity uploads use `{folder}/{entityId}/cover` (no extension — MIME stored in metadata). Re-uploading always overwrites the same key via `upsert: true`, so no orphaned files accumulate. New entities without an ID yet land at `{folder}/pending/{timestamp}.{ext}`.

| Path | Used by |
|------|---------|
| `images/players/{id}/cover` | Player photos |
| `images/courses/{id}/cover` | Course cover images |
| `images/games/{id}/cover` | Game cover images |
| `images/categories/{id}/cover` | Game category images |
| `images/floors/{id}/cover` | Floor images (Gaming Tower) |
| `images/masters/{id}/cover` | Master photos |
| `images/aliados/{id}/cover` | Partner logos |
| `images/brand-logos/{id}/cover` | Home marquee brand/sponsor logos |
| `images/tournaments/{id}/cover` | Tournament cover images |
| `images/tournament-prizes/{resultId}/cover` | COP prize comprobantes (jpg/png/webp/pdf, 5MB) |
| `images/site/{key}/cover` | Site-level images (equipment-highlight, learning-path) |

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

## Planned Integration — Cloudflare Stream (Academia Video)

Status: **planned** — architecture documented in `.claude/skills/cloudflare-stream.md`.

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
    → Browser PUT file directly to uploadURL (never exposes API token)
    → Store uid in academia_content.stream_uid

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
