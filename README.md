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
| ORM | Drizzle ORM (`drizzle-orm` + `postgres`) — schema + seeding only |
| File Storage | Supabase Storage (`images` bucket — public, 5MB limit) |
| Payments | MercadoPago (`mercadopago` SDK v2) |
| Runtime | Node.js 24 |

---

## Project Structure

```
src/
  proxy.ts            # Subdomain routing (Next.js 16) — app.* → /app, admin.* → /admin
  app/
    (main)/           # 1upesports.org — all public routes (TopAppBar + Footer + MobileBottomNav)
    app/              # app.1upesports.org — user shell
      login/          #   Public login page (Privy, redirects to dashboard)
      (protected)/    #   Auth-gated group — requires privy-token cookie
        layout.tsx    #     Auth guard + AppSidebar
        page.tsx      #     Wallet ($1UP balance, send/receive + QR)
        identidad/    #     Document + Comfenalco + aliado verification
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
    masters/          # Masters page (HeroMasters, MasterCard, MasterGrid)
    academia/         # Course catalog + PaymentFeedback
    perfil/           # WalletTab (send/receive + QR scanner), SettingsTab, IdentidadTab
    app/              # App shell (AppSidebar)
    admin/            # Admin panel components
    layout/           # TopAppBar, Footer (reads social_links from DB), MobileBottomNav
    providers/        # PrivyClientProvider
  db/
    schema.ts         # Drizzle table definitions (source of truth for migrations)
    migrations/       # SQL migration files
  lib/
    supabase.ts       # Public + admin Supabase clients
    blob.ts           # uploadImage() → Supabase Storage images bucket
    privy.ts          # Token verification + email resolution
    admin.ts          # isAdmin check (env + DB)
    viem.ts           # Public client + ERC-20 ABIs ($1UP token)
    socialIcons.ts    # Platform → /public/socialmedia/ icon path mapping
    comfenalco.ts     # Comfenalco API client (stub — awaiting credentials)
    mercadopago.ts    # MP preference creation + webhook signature
  types/
    database.types.ts # Full Supabase type definitions (manually maintained)
public/
  socialmedia/        # Brand PNG icons: instagram, tiktok, kick, youtube, x, twitch, github, linkedin
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

DATABASE_URL=                 # Transaction pooler connection string

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

# Comfenalco (activate when API docs are available)
# COMFENALCO_API_URL=
# COMFENALCO_API_KEY=

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

### 4. Seed the database (fresh install only)

```bash
npm run db:seed
```

### 5. Start the dev server

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
| `npm run db:seed` | Seed initial database data |
| `npx drizzle-kit generate` | Generate a new SQL migration from schema changes |

---

## Pages

**1upesports.org (public)**

| Route | Description |
|-------|-------------|
| `/` | Home — Hero, Games Gallery, Recruitment |
| `/gaming-tower` | 6-floor breakdown, 1UP Pass, Map |
| `/team` | Pro roster + Hall of Fame + Recruitment |
| `/masters` | Masters showcase — coaches, courses, social links |
| `/academia` | Course catalog + MercadoPago checkout |
| `/juegos` | Games showcase by category |
| `/recreativo` | Casual gaming section |
| `/perfil` | Legacy profile page (redirects to app subdomain) |

**app.1upesports.org (user app)**

| Route | Description |
|-------|-------------|
| `/app` | Wallet — $1UP balance, send (QR scanner), receive (QR code) |
| `/app/identidad` | Document + Comfenalco + aliado verification |
| `/app/pass` | 1UP Pass status + purchase |
| `/app/academia` | My enrolled courses + content access |
| `/app/settings` | Linked accounts management |

---

## Admin Panel

| Route | Description |
|-------|-------------|
| `/admin` | Dashboard — stat cards + quick links |
| `/admin/games` | Games + categories CRUD (image upload per game + per category) |
| `/admin/floors` | Gaming Tower floor info CRUD |
| `/admin/players` | Team roster CRUD (photo upload, social links) |
| `/admin/competitions` | Hall of Fame CRUD |
| `/admin/masters` | Masters CRUD (photo, categories checkboxes, all 8 social links, topics, assigned courses shown) |
| `/admin/courses` | Academia course CRUD (image, master assignment, category) |
| `/admin/academia-content` | Video/doc/quiz content per course (published toggle) |
| `/admin/1pass` | 1UP Pass overview — benefits, discounts, purchase history |
| `/admin/pass-benefits` | 1UP Pass benefits CRUD |
| `/admin/discounts` | Discount rule CRUD (trigger: Comfenalco/promo/manual/auto + aliado link) |
| `/admin/enrollments` | Read-only payment log with revenue total |
| `/admin/user-profiles` | All registered users (read-only, Comfenalco status) |
| `/admin/social-links` | Footer social link URLs per platform (instagram, tiktok, kick, youtube, x, twitch) |
| `/admin/aliados` | Partner CRUD (name, NIT, email, API URL/key) |
| `/admin/submissions` | Recruitment form submissions (read-only) |
| `/admin/users` | Admin user management |

---

## Auth & Admin

- **Login methods**: email, Google, Discord (via Privy)
- **Admin guard**: `src/app/admin/(protected)/layout.tsx` — verifies Privy cookie token + `isAdmin`
- **API protection**: every `/api/admin/*` calls `verifyToken` + `isAdmin` — no exceptions
- **User APIs**: `/api/user/*` require Privy Bearer token (not admin)
- **Client token**: `const token = await getAccessToken()` from `usePrivy()` → `Authorization: Bearer <token>`
- **Privy note**: for cross-subdomain login, enable HttpOnly cookies in Privy Dashboard → set domain to `1upesports.org`

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
| `user_profiles` | Extended user data — document, Comfenalco status, verified_aliados[] |
| `aliados` | Partner organizations — name, NIT, email, API URL/key |
| `discount_rules` | Discount engine — trigger type + applies_to + aliado_id FK |
| `enrollments` | Payment records — user → course/pass, MP lifecycle |
| `academia_content` | Videos/docs/quizzes per course (published after enrollment) |
| `social_links` | Footer social icons — platform, url, is_active, sort_order |
| `admin_users` | DB-stored admins (env var admins always override) |

---

## Image Storage

All uploaded images go to the **Supabase Storage `images` bucket** (public, 5MB, jpg/png/webp/gif/avif).

| Folder | Used by |
|--------|---------|
| `images/players/` | Player photos |
| `images/courses/` | Course cover images |
| `images/games/` | Game + category images |
| `images/floors/` | Floor info images |
| `images/masters/` | Master photos |
| `images/aliados/` | Partner logos |

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
