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
| ORM | Drizzle ORM (`drizzle-orm` + `postgres`) |
| File Storage | Vercel Blob |
| Payments | MercadoPago (`mercadopago` SDK v2) |
| Runtime | Node.js 24 |

---

## Project Structure

```
src/
  proxy.ts            # Subdomain routing (Next.js 16) — app.* → /app, admin.* → /admin
  app/
    (main)/           # 1upesports.org — Home, Recreativo, Perfil (no sidebar)
    (sidebar)/        # 1upesports.org — Gaming Tower, Team, Masters, Academia (with sidebar)
    app/              # app.1upesports.org — user shell
      login/          #   Public login page (Privy, redirects to dashboard)
      (protected)/    #   Auth-gated group — requires privy-token cookie
        layout.tsx    #     Auth guard + AppSidebar
        page.tsx      #     Wallet ($1UP balance, send, receive)
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
    team/             # Team + Hall of Fame
    masters/          # Masters page (HeroMasters, MasterCard, MasterGrid)
    academia/         # Course catalog + PaymentFeedback
    perfil/           # WalletTab (send/receive), SettingsTab, IdentidadTab
    app/              # App shell (AppSidebar)
    admin/            # Admin panel components
    providers/        # PrivyClientProvider
  db/
    schema.ts         # Drizzle table definitions (source of truth)
    migrations/       # SQL migration files
  lib/
    supabase.ts       # Public + admin Supabase clients
    privy.ts          # Token verification + email resolution
    admin.ts          # isAdmin check (env + DB)
    viem.ts           # Public client + ERC-20 ABIs ($1UP token)
    comfenalco.ts     # Comfenalco API client (stub — awaiting credentials)
    mercadopago.ts    # MP preference creation + webhook signature
  types/
    database.types.ts # Full Supabase type definitions (manually maintained)
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
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=              # Transaction pooler connection string

# Privy
NEXT_PUBLIC_PRIVY_APP_ID=
PRIVY_APP_SECRET=

# Vercel Blob
BLOB_READ_WRITE_TOKEN=

# Admin access
ADMIN_EMAILS=              # Comma-separated root admin emails

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=

# App URL (used in MP back_urls and webhook notification_url)
NEXT_PUBLIC_BASE_URL=https://1upesports.org
NEXT_PUBLIC_APP_URL=https://app.1upesports.org
NEXT_PUBLIC_ADMIN_URL=https://admin.1upesports.org

# Comfenalco (activate when API docs are available)
# COMFENALCO_API_URL=
# COMFENALCO_API_KEY=

# Optional — Base L2 RPC
# NEXT_PUBLIC_BASE_RPC_URL=
```

### 3. Apply database migrations

All migrations have been applied to the live Supabase project. For a fresh database, run these in order in Supabase SQL Editor:

1. `src/db/migrations/0000_comfenalco_mercadopago.sql` — base schema
2. `src/db/migrations/incremental_comfenalco_mp.sql` — user_profiles, discount_rules, enrollments
3. Apply the `masters_aliados_academia_content` migration (masters, aliados, academia_content tables)
4. Apply the `courses_master_discounts_aliado_user_verified` migration (FK columns)

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
| `npx drizzle-kit push` | Push schema directly to DB (dev only) |

---

## Pages

**1upesports.org (public)**

| Route | Layout | Description |
|-------|--------|-------------|
| `/` | No sidebar | Home — Hero, Games Gallery, Recruitment |
| `/gaming-tower` | SideNavBar | 6-floor breakdown, 1UP Pass, Map |
| `/team` | SideNavBar | Pro roster + Hall of Fame + Recruitment |
| `/masters` | SideNavBar | Masters showcase — coaches and specialists |
| `/academia` | SideNavBar | Course catalog + MercadoPago checkout |
| `/juegos` | SideNavBar | Games showcase by category |
| `/recreativo` | No sidebar | Casual gaming section |
| `/perfil` | No sidebar | Legacy profile page (redirects to app subdomain) |

**app.1upesports.org (user app)**

| Route | Description |
|-------|-------------|
| `/app` | Wallet — $1UP balance, send, receive |
| `/app/identidad` | Document + Comfenalco + aliado verification |
| `/app/pass` | 1UP Pass status + purchase |
| `/app/academia` | My enrolled courses + content access |
| `/app/settings` | Linked accounts management |

---

## Admin Panel

| Route | Description |
|-------|-------------|
| `/admin` | Dashboard — stat cards + quick links |
| `/admin/courses` | Academia course CRUD (+ master assignment) |
| `/admin/discounts` | Discount rule CRUD (trigger: Comfenalco/promo/manual/auto + aliado link) |
| `/admin/enrollments` | Read-only payment log with revenue total |
| `/admin/1pass` | 1UP Pass overview — benefits, discounts, purchase history |
| `/admin/pass-benefits` | 1UP Pass benefits CRUD |
| `/admin/players` | Team roster CRUD |
| `/admin/competitions` | Hall of Fame CRUD |
| `/admin/games` | Games + categories CRUD |
| `/admin/masters` | Masters CRUD (photo, social links, topics) |
| `/admin/aliados` | Partner CRUD (name, NIT, email, API URL/key) |
| `/admin/academia-content` | Video/doc/quiz content per course (published toggle) |
| `/admin/floors` | Gaming Tower floor info CRUD |
| `/admin/submissions` | Recruitment form submissions (read-only) |
| `/admin/user-profiles` | All registered users (read-only, Comfenalco status) |
| `/admin/users` | Admin user management |

---

## Auth & Admin

- **Login methods**: email, Google, Discord (via Privy)
- **Admin guard**: `src/app/admin/layout.tsx` — verifies Privy cookie token + `isAdmin`
- **API protection**: every `/api/admin/*` calls `verifyToken` + `isAdmin` — no exceptions
- **User APIs**: `/api/user/*` require Privy Bearer token (not admin)
- **Client token**: `const token = await getAccessToken()` from `usePrivy()` → `Authorization: Bearer <token>`

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `game_categories` | Fighting, FPS, Dancing, TCG |
| `games` | Individual games per category |
| `players` | Pro roster |
| `competitions` | Hall of Fame entries |
| `courses` | Academia catalog (price, master_id FK, checkout via MP) |
| `masters` | Masters/coaches — photo, specialty, topics, social links |
| `pass_benefits` | 1UP Pass perks |
| `floor_info` | Gaming Tower 6-floor breakdown |
| `recruitment_submissions` | Form submissions from Home + Team pages |
| `user_profiles` | Extended user data — document, Comfenalco status, verified_aliados[] |
| `aliados` | Partner organizations — name, NIT, email, API URL/key |
| `discount_rules` | Discount engine — trigger type + applies_to + aliado_id FK |
| `enrollments` | Payment records — user → course/pass, MP lifecycle |
| `academia_content` | Videos/docs/quizzes per course (published after enrollment) |
| `admin_users` | DB-stored admins (env var admins always override) |

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

Flow once activated:
```
/perfil → IDENTIDAD tab
  → user enters tipo_documento + numero_documento
  → clicks "VERIFICAR CON COMFENALCO"
  → POST /api/user/comfenalco/verify
    → calls COMFENALCO_API_URL/verificar-afiliado
    → UPDATE user_profiles.comfenalco_afiliado = true/false
  → badge updates instantly
```

To activate: set `COMFENALCO_API_URL` + `COMFENALCO_API_KEY` and implement the response parsing in `src/lib/comfenalco.ts` (marked with `// TODO`).

---

## Design System

Neo-Brutalist Competitive — full spec in `designs/cyber_edge_brutalist/DESIGN.md`.

Key rules enforced in code:
- **0px border-radius** — `rounded-*` banned except `rounded-full`
- **No 1px dividers** — use background color shifts
- **Public pages** use only custom Tailwind — no shadcn in `src/components/{home,tower,team,academia,recreativo,juegos}/`
- **Skew pattern** — outer: `skew-fix`, inner text: `block skew-content`
- **Nav** always glassmorphism via `glass-panel` class

---

## Versioning & Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a full delivery history.
