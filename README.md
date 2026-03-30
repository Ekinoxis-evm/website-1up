# 1UP Gaming Tower — Website

Production website for **1UP Gaming Tower** (`1upesports.org`), Colombia's first professional esports hub.
Built and maintained by **Ekinoxis**.

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
  app/
    (main)/           # Home (/) + Recreativo + Perfil — no SideNavBar
    (sidebar)/        # Gaming Tower, Team, Academia — with SideNavBar
    admin/            # Protected admin panel (Privy + ADMIN_EMAILS check)
    api/
      recruitment/    # Public form submission endpoint
      checkout/       # MercadoPago preference creation
      webhooks/
        mercadopago/  # Payment webhook handler (signature-verified)
      user/
        profile/      # GET/PUT own user profile
        comfenalco/
          verify/     # POST Comfenalco affiliation check
      admin/          # Protected CRUD endpoints (all require isAdmin)
  components/
    home/             # Home page components
    tower/            # Gaming Tower components
    team/             # Team page + Hall of Fame
    academia/         # Course catalog + PaymentFeedback toast
    perfil/           # Profile page — WalletTab, SettingsTab, IdentidadTab
    admin/            # Admin panel components
    providers/        # PrivyClientProvider
  db/
    schema.ts         # Drizzle table definitions (source of truth)
    migrations/       # SQL migration files
  lib/
    supabase.ts       # Public + admin Supabase clients
    privy.ts          # Token verification + email resolution
    admin.ts          # isAdmin check (env + DB)
    comfenalco.ts     # Comfenalco API client (stub — awaiting API docs)
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

# Comfenalco (activate when API docs are available)
# COMFENALCO_API_URL=
# COMFENALCO_API_KEY=

# Optional — Base L2 RPC
# NEXT_PUBLIC_BASE_RPC_URL=
```

### 3. Apply the database migration

Run `src/db/migrations/incremental_comfenalco_mp.sql` in Supabase SQL Editor.
This creates `user_profiles`, `discount_rules`, `enrollments`, and drops `courses.payment_link`.

> For a fresh database, use the full snapshot in `src/db/migrations/0000_comfenalco_mercadopago.sql`.

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

| Route | Layout | Description |
|-------|--------|-------------|
| `/` | No sidebar | Home — Hero, Games Gallery, Recruitment |
| `/gaming-tower` | SideNavBar | 6-floor breakdown, 1UP Pass, Map |
| `/team` | SideNavBar | Pro roster + Hall of Fame + Recruitment |
| `/academia` | SideNavBar | Course catalog + MercadoPago checkout |
| `/juegos` | SideNavBar | Games showcase by category |
| `/recreativo` | No sidebar | Casual gaming section |
| `/perfil` | No sidebar | User profile — Wallet, Identidad (Comfenalco), Settings |
| `/admin/*` | Admin sidebar | Protected admin panel |

---

## Admin Panel

| Route | Description |
|-------|-------------|
| `/admin` | Dashboard — stat cards + quick links |
| `/admin/courses` | Academia course CRUD |
| `/admin/discounts` | Discount rule CRUD (Comfenalco, promo, manual, auto) |
| `/admin/enrollments` | Read-only payment log with revenue total |
| `/admin/players` | Team roster CRUD |
| `/admin/competitions` | Hall of Fame CRUD |
| `/admin/games` | Games + categories CRUD |
| `/admin/pass-benefits` | 1UP Pass benefits CRUD |
| `/admin/floors` | Gaming Tower floor info CRUD |
| `/admin/submissions` | Recruitment form submissions (read-only) |
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
| `courses` | Academia catalog (price managed here, checkout via MP) |
| `pass_benefits` | 1UP Pass perks |
| `floor_info` | Gaming Tower 6-floor breakdown |
| `recruitment_submissions` | Form submissions from Home + Team pages |
| `user_profiles` | Extended user data — document + Comfenalco status |
| `discount_rules` | Flexible discount engine (trigger type + applies_to + validity) |
| `enrollments` | Payment records — links user → course, tracks MP payment lifecycle |
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
