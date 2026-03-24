# CLAUDE.md — 1UP Gaming Tower Website

## Project Overview
Production website for **1UP Gaming Tower** (`1upesports.org`), Colombia's first professional esports hub.
Built and maintained by **Ekinoxis** for the 1UP team.

- **Stack**: Next.js 16 (App Router, TypeScript), Tailwind CSS v3, Privy auth, Supabase JS + Drizzle ORM, Vercel Blob
- **Admin email**: `ekinoxis.evm@gmail.com`
- **Domain**: `1upesports.org`
- **Node version**: 24 LTS

---

## Architecture

```
src/
  app/
    (main)/          ← Home (/) + Recreativo — no SideNavBar
    (sidebar)/       ← Gaming Tower, Team, Academia — with SideNavBar
    admin/           ← Protected admin panel (Privy + ADMIN_EMAILS check)
    api/
      recruitment/   ← Public form submission endpoint
      admin/         ← Protected CRUD endpoints (verify token on every request)
  components/
    layout/          ← TopAppBar, SideNavBar, MobileBottomNav, Footer
    home/            ← HeroHome, TalentPipeline, GamesGallery, RecruitmentForm
    tower/           ← HeroTower, EquipmentHighlight, FloorBreakdown, LocationMap, PassSection
    team/            ← HeroTeam, PlayerGrid, PlayerCard, HallOfFame
    academia/        ← HeroAcademia, CourseCatalog, LearningPath
    recreativo/      ← Recreativo page components
    admin/           ← AdminSidebar, AdminPlayersClient, AdminGamesClient,
                        AdminCompetitionsClient, AdminCoursesClient,
                        AdminFloorsClient, AdminPassBenefitsClient
    providers/       ← PrivyClientProvider
    shared/          ← SkewButton, SectionHeading
  db/
    schema.ts        ← Drizzle ORM table definitions (single source of truth for schema)
    index.ts         ← Drizzle client (uses DATABASE_URL)
    seed.ts          ← Initial data population
  lib/
    supabase.ts      ← Dual Supabase clients (anon + service role)
    privy.ts         ← verifyToken(), verifyCookieToken(), isAdmin() helper
    admin.ts         ← isAdmin(email) — checks ADMIN_EMAILS env var
    blob.ts          ← uploadImage() for Vercel Blob storage
    utils.ts         ← cn() (clsx + tailwind-merge), formatCop()
  types/
    database.types.ts ← Auto-generated Supabase types (Row/Insert/Update)
  styles/
    globals.css      ← Tailwind directives + custom utility classes
```

### Data layer: two clients, two purposes
| Client | File | Purpose |
|--------|------|---------|
| `supabase` (anon key) | `src/lib/supabase.ts` | Server Component reads — never mutates |
| `supabaseAdmin` (service role) | `src/lib/supabase.ts` | API route mutations only |
| Drizzle `db` | `src/db/index.ts` | Schema management + seeding (uses `DATABASE_URL`) |

### Data flow
- **Public pages**: Server Components fetch via `supabase` (anon key) — rendered server-side, no loading spinners
- **Admin mutations**: Client → `/api/admin/*` → verifyToken + isAdmin → `supabaseAdmin` (service role) → `revalidatePath()`
- **Images**: `uploadImage()` in `src/lib/blob.ts` → Vercel Blob, URL stored in DB column

---

## Design System: Neo-Brutalist Competitive

> Source of truth: `designs/cyber_edge_brutalist/DESIGN.md`
> Full site spec: `designs/webiste.md`

### CRITICAL RULES — never break these:
1. **0px border-radius everywhere.** No exceptions. `rounded-*` is banned except `rounded-full` (pills only).
2. **No 1px dividers.** Separate sections with background color shifts, never `<hr>` or `border-b`.
3. **Public pages use ONLY custom Tailwind classes.** No shadcn imports in `src/components/{home,tower,team,academia,recreativo}/`.
4. **Skewed elements**: outer container gets `skew-fix` (skewX -10°), inner text gets `skew-content` (counter-rotates +10°).
5. **Nav**: always glassmorphism — `glass-panel` class (`rgba(11,19,38,0.6)` + `backdrop-blur-20px`).

### Color tokens
| Purpose | Token | Hex |
|---------|-------|-----|
| Page bg | `bg-background` / `bg-surface` | `#0b1326` |
| Cards low | `bg-surface-container-low` | — |
| Cards mid | `bg-surface-container` | — |
| Cards high | `bg-surface-container-high` | — |
| Neon Pink | `text-primary` / `bg-primary` | `#ffb2bf` |
| Pink CTA | `bg-primary-container` | — |
| Electric Blue | `text-secondary` / `bg-secondary-container` | `#a1c9ff` |
| Acid Green | `text-tertiary` / `bg-tertiary` | `#abd600` |
| Error | `text-error` | `#ffb4ab` |

### CSS utilities (globals.css)
| Class | Effect |
|-------|--------|
| `.skew-fix` | `skewX(-10deg)` outer wrapper |
| `.skew-content` | `skewX(10deg)` inner counter-rotate |
| `.neo-shadow-pink/blue/green` | 8px offset solid shadow, no blur |
| `.glass-panel` | `rgba(11,19,38,0.6)` + `backdrop-blur-20px` |
| `.glitch-border` | Pink/blue double-line border accent |
| `.text-glow-pink/blue` | Text shadow glow |
| `.streak-segment` | Angled progress bar segment |

### Typography
- Headlines/labels: `font-headline` = Space Grotesk (`var(--font-space-grotesk)`)
- Body copy: `font-body` = Inter (`var(--font-inter)`)
- Material Symbols: loaded globally via Google Fonts link in `layout.tsx`

---

## Database

### Drizzle Schema (`src/db/schema.ts`)
| Table | Key Fields |
|-------|-----------|
| `game_categories` | `id`, `name`, `slug`, `sort_order` |
| `games` | `id`, `name`, `category_id` (FK → game_categories), `image_url`, `sort_order` |
| `players` | `id`, `gamertag`, `real_name`, `role`, `photo_url`, `instagram_url`, `tiktok_url`, `kick_url`, `youtube_url`, `sort_order`, `is_active` |
| `competitions` | `id`, `tournament_name`, `country`, `city`, `year`, `result`, `player_id` (FK → players, SET NULL) |
| `courses` | `id`, `name`, `category` ("Performance"\|"Technology"\|"Gaming"), `description`, `price_cop`, `duration_hours`, `payment_link`, `image_url`, `sort_order`, `is_active` |
| `pass_benefits` | `id`, `title`, `description`, `sort_order` |
| `floor_info` | `id`, `floor_label` ("01"\|"02-03"\|"04-05"\|"06"), `title`, `description`, `accent_color` (tailwind fragment), `image_url`, `sort_order` |
| `recruitment_submissions` | `id`, `name`, `email`, `phone`, `category_id` (FK), `game_id` (FK), `gamertag`, `portfolio_url`, `message`, `source` ("home"\|"team") |

All tables have `created_at` auto-timestamp. Drizzle type exports: `GameCategory`, `Game`, `Player`, `Competition`, `Course`, `PassBenefit`, `FloorInfo`, `Submission`.

**Important**: RLS is disabled on all tables — auth is handled at the API route level via Privy.

### Supabase types
`src/types/database.types.ts` — auto-generated via Supabase MCP. Re-generate when schema changes:
use the Supabase MCP tool `generate_typescript_types` for the active project.

### DB Commands
```bash
npm run db:seed      # Populate initial data (run once after migrations)
```

### Column naming
DB columns use `snake_case`. API route handlers map camelCase request bodies to snake_case on insert/update.

---

## Auth — Privy

- **Provider**: `src/components/providers/PrivyClientProvider.tsx` — wraps root layout, dark theme, login methods: email + Google + Discord
- **Admin guard**: `src/app/admin/layout.tsx` — reads `privy-token` cookie → `verifyCookieToken()` → `getUser().email` → `isAdmin(email)` → redirect to `/` if unauthorized
- **API protection**: every `/api/admin/*` route calls `verifyToken(authHeader)` + `isAdmin(email)` before any DB operation
- **Client token**: `const token = await getAccessToken()` from `usePrivy()` — attach as `Authorization: Bearer <token>`
- **isAdmin()**: `src/lib/admin.ts` — splits `ADMIN_EMAILS` env var by comma, checks inclusion

---

## Routing Map

| Route | Layout | Description |
|-------|--------|-------------|
| `/` | (main) no sidebar | Home: Hero, Talent Pipeline, Games Gallery, Recruitment |
| `/recreativo` | (main) no sidebar | Casual gaming for families/companies |
| `/gaming-tower` | (sidebar) | 6-floor breakdown, Equipment, Pass benefits, Map |
| `/team` | (sidebar) | Pro roster (PlayerGrid, HallOfFame) |
| `/academia` | (sidebar) | Course catalog by category + Learning Path |
| `/admin` | admin sidebar | Dashboard with stats counts |
| `/admin/games` | admin sidebar | CRUD game categories + games |
| `/admin/players` | admin sidebar | CRUD team members |
| `/admin/competitions` | admin sidebar | CRUD Hall of Fame |
| `/admin/courses` | admin sidebar | CRUD academia courses |
| `/admin/floors` | admin sidebar | CRUD tower floor info |
| `/admin/pass-benefits` | admin sidebar | CRUD 1UP Pass perks |
| `/admin/submissions` | admin sidebar | View recruitment submissions (read-only) |

### API Routes
| Endpoint | Auth | Methods |
|----------|------|---------|
| `/api/recruitment` | Public | POST |
| `/api/admin/players` | Privy + isAdmin | POST, PUT, DELETE |
| `/api/admin/games` | Privy + isAdmin | POST, PUT, DELETE |
| `/api/admin/competitions` | Privy + isAdmin | POST, PUT, DELETE |
| `/api/admin/courses` | Privy + isAdmin | POST, PUT, DELETE |
| `/api/admin/floors` | Privy + isAdmin | POST, PUT, DELETE |
| `/api/admin/pass-benefits` | Privy + isAdmin | POST, PUT, DELETE |

---

## Key Patterns

### Admin CRUD pattern
All admin pages follow the same structure:
1. Server Component fetches data via `supabase` (anon), passes as props
2. `AdminXxxClient.tsx` receives props, manages `useState` for list + modal
3. Modal opens for create/edit, submits to `/api/admin/xxx`
4. API route: verify token → isAdmin → supabaseAdmin mutation → `revalidatePath()`
5. Client refreshes via `router.refresh()` after success

### Recruitment form (two variants)
Both POST to `/api/recruitment` with a `source` field:
- `Home` → `source: "home"` — basic fields (name, email, phone, category, game)
- `Team 1UP` → `source: "team"` — adds gamertag + portfolio_url + message (`extended={true}` prop)

### Category → Game dynamic filter
`RecruitmentForm` and `CourseCatalog` both filter `games` array client-side by `categoryId`.
All data passed as props from Server Components — no extra API call needed.

### Image uploads
`src/lib/blob.ts` → `uploadImage(file, folder)` → returns public URL → stored in DB column.
Blob folders: `players/`, `courses/`, `games/`, `floors/`

### Cache revalidation
After every admin mutation, call `revalidatePath()` for the affected public page:
- Players/Competitions → `/team`
- Courses → `/academia`
- Floors/Pass Benefits → `/gaming-tower`
- Games → `/` (home) + `/gaming-tower`

---

## Environment Variables

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API |
| `DATABASE_URL` | Supabase Dashboard → Settings → Database → Connection string |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy dashboard |
| `PRIVY_APP_SECRET` | Privy dashboard |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage settings |
| `ADMIN_EMAILS` | Set manually — `ekinoxis.evm@gmail.com` |

---

## Development

```bash
npm install          # Install deps
npm run dev          # Start dev server (Turbopack, http://localhost:3000)
npm run build        # Production build
npm run start        # Run production build locally
npm run lint         # ESLint check
npm run db:seed      # Seed initial data (run once)
```

**First-time setup:**
1. Copy `.env.local` with all 8 variables above
2. Tables already exist via Supabase MCP migration
3. `npm run db:seed` — populate initial data
4. Enable Google + Discord login in Privy Dashboard → Authentication → Login Methods
5. `npm run dev`

---

## File Conventions
- Components: `PascalCase.tsx`
- Routes: kebab-case directories
- DB/lib files: camelCase
- All new public-page components → `src/components/{page-name}/`
- All new admin components → `src/components/admin/`
- `'use client'` only when strictly needed (interactivity or browser APIs)
- Push `'use client'` as far down the component tree as possible

---

## When Making Changes — Checklist

- [ ] Schema change? Update `src/db/schema.ts` → run migration via Supabase MCP → regenerate `database.types.ts`
- [ ] New admin CRUD? Follow the Server Component → Client Component → API Route pattern
- [ ] New public page? Decide (main) vs (sidebar) layout group, add to routing map above
- [ ] Image field? Use `uploadImage()` from `src/lib/blob.ts`, store URL in DB
- [ ] Style change? Use semantic color tokens, never hex in component code; respect 0px radius rule
- [ ] Mutation? Always call `revalidatePath()` for affected public pages after DB write
- [ ] Auth check? All `/api/admin/*` routes must call `verifyToken` + `isAdmin` first
