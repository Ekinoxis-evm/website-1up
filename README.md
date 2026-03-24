# 1UP Gaming Tower — Website

Production website for **1UP Gaming Tower** (`1up.ekinoxis.xyz`), Colombia's first professional esports hub.
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
| Runtime | Node.js 24 |

---

## Project Structure

```
src/
  app/
    (main)/          # Home (/) + Recreativo + Perfil — no SideNavBar
    (sidebar)/       # Gaming Tower, Team, Academia — with SideNavBar
    admin/           # Protected admin panel (Privy + ADMIN_EMAILS check)
    api/
      recruitment/   # Public form submission endpoint
      admin/         # Protected CRUD endpoints
  components/
    home/            # Home page components (HeroHome, TalentPipeline, RecruitmentForm…)
    tower/           # Gaming Tower components
    team/            # Team page components
    academia/        # Academia components
    perfil/          # Profile page (WalletTab, SettingsTab — requires Privy auth)
    admin/           # Admin panel components
    providers/       # PrivyClientProvider
  db/                # Drizzle schema + seed scripts
  lib/               # supabase.ts client(s)
  types/             # database.types.ts (generated from Supabase)
  styles/            # Global styles
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
NEXT_PUBLIC_SUPABASE_URL=       # Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase Dashboard → Settings → API
SUPABASE_SERVICE_ROLE_KEY=      # Supabase Dashboard → Settings → API
NEXT_PUBLIC_PRIVY_APP_ID=       # Privy dashboard
PRIVY_APP_SECRET=               # Privy dashboard
BLOB_READ_WRITE_TOKEN=          # Vercel Blob storage settings
ADMIN_EMAILS=ekinoxis.evm@gmail.com
```

### 3. Seed the database

```bash
npm run db:seed
```

> Tables are already created via Supabase migration. Run this once to populate initial data.

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
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint check |
| `npm run db:seed` | Seed initial database data |

---

## Pages

| Route | Layout | Description |
|-------|--------|-------------|
| `/` | No sidebar | Home page — Hero, Talent Pipeline, Games, Recruitment |
| `/gaming-tower` | SideNavBar | 6-floor breakdown |
| `/team` | SideNavBar | Pro roster + Hall of Fame + Recruitment |
| `/academia` | SideNavBar | Course catalog |
| `/recreativo` | No sidebar | Recreativo section |
| `/perfil` | No sidebar | User profile — wallet + settings (Privy auth required) |
| `/admin/*` | Admin sidebar | Protected admin panel |

---

## Auth & Admin

- **Login methods**: email, Google, Discord (via Privy)
- **Admin guard**: `src/app/admin/layout.tsx` — verifies Privy token and checks `ADMIN_EMAILS`
- **API protection**: every `/api/admin/*` route calls `verifyToken` + `isAdmin` before any DB operation
- **Client token**: `const token = await getAccessToken()` from `usePrivy()` — attach as `Authorization: Bearer <token>`

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `game_categories` | Fighting, FPS, Dancing, TCG |
| `games` | Individual games per category |
| `players` | Pro roster |
| `competitions` | Hall of Fame entries |
| `courses` | Academia catalog |
| `pass_benefits` | 1UP Pass perks |
| `floor_info` | Gaming Tower 6-floor breakdown |
| `recruitment_submissions` | Form submissions from Home + Team pages |

### Recruitment form fields

`name` · `email` · `phone` (E.164 international format) · `category_id` · `game_id` · `gamertag` · `message` · `source` (`"home"` | `"team"`)

---

## Design System

Neo-Brutalist Competitive — full spec in `designs/cyber_edge_brutalist/DESIGN.md`.

Key rules:
- **0px border-radius** everywhere (`rounded-*` banned except `rounded-full` for pills)
- **No 1px dividers** — use background color shifts instead
- **Public pages** use only custom Tailwind classes — no shadcn in public-facing components
- **Nav** always glassmorphism (`glass-panel` class)
