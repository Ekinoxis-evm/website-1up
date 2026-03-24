# CLAUDE.md — 1UP Gaming Tower Website

## Project Overview
Production website for **1UP Gaming Tower** (`1upesports.org`), Colombia's first professional esports hub.
Built and maintained by **Ekinoxis** for the 1UP team.

- **Stack**: Next.js 16 (App Router, TypeScript), Tailwind CSS v3, Privy auth, Supabase Postgres + Drizzle ORM (`postgres` driver), Vercel Blob
- **Admin email**: `ekinoxis.evm@gmail.com`
- **Domain**: `1upesports.org`

---

## Architecture

```
src/app/
  (main)/          ← Home (/) + Recreativo — no SideNavBar
  (sidebar)/       ← Gaming Tower, Team, Academia — with SideNavBar
  admin/           ← Protected admin panel (Privy + ADMIN_EMAILS check)
  api/
    recruitment/   ← Public form submission endpoint
    admin/         ← Protected CRUD endpoints (verify token on every request)
```

### Data flow
- **Public pages**: Server Components fetch directly from Neon via Drizzle — no loading spinners
- **Admin mutations**: Client → `/api/admin/*` → verifyToken + isAdmin → Drizzle → `revalidatePath()`
- **Images**: Upload to Vercel Blob via `/api/admin/upload`, URL stored in DB

---

## Design System: Neo-Brutalist Competitive

> Source of truth: `../cyber_edge_brutalist/DESIGN.md`

### CRITICAL RULES — never break these:
1. **0px border-radius everywhere.** No exceptions. `rounded-*` is banned except `rounded-full` (pills only).
2. **No 1px dividers.** Separate sections with background color shifts, never `<hr>` or `border-b`.
3. **Public pages use ONLY custom Tailwind classes.** No shadcn imports in `src/components/{home,tower,team,academia,recreativo}/`.
4. **Skewed elements**: outer container gets `skew-fix` (skewX -10°), inner text gets `skew-content` (counter-rotates +10°).
5. **Nav**: always glassmorphism — `glass-panel` class (`rgba(11,19,38,0.6)` + `backdrop-blur-20px`).

### Color tokens (use semantic names, not hex in component code)
| Purpose | Token |
|---------|-------|
| Page bg | `bg-background` / `bg-surface` |
| Cards low | `bg-surface-container-low` |
| Cards mid | `bg-surface-container` |
| Cards high | `bg-surface-container-high` |
| Neon Pink | `text-primary` / `bg-primary` |
| Pink CTA | `bg-primary-container` |
| Electric Blue | `text-secondary` / `bg-secondary-container` |
| Acid Green | `text-tertiary` / `bg-tertiary` |

### Typography
- Headlines/labels: `font-headline` = Space Grotesk (`var(--font-space-grotesk)`)
- Body copy: `font-body` = Inter (`var(--font-inter)`)
- Material Symbols: loaded globally via Google Fonts link in `layout.tsx`

---

## Database

**Schema**: `src/db/schema.ts`
**Client**: `src/db/index.ts` (Drizzle + `postgres` driver — works with Supabase transaction pooler URL)

### Tables
| Table | Purpose |
|-------|---------|
| `game_categories` | Fighting, FPS, Dancing, TCG |
| `games` | Individual games per category |
| `players` | Pro roster (Mado Kula, Misterio, Misili, Maxi) |
| `competitions` | Hall of Fame — EVO, Black Spawn, SNK... |
| `courses` | Academia catalog (Performance / Technology / Gaming) |
| `pass_benefits` | 1UP Pass perks list |
| `floor_info` | Gaming Tower 6-floor breakdown |
| `recruitment_submissions` | Form submissions (source: "home" | "team") |

### Commands
```bash
npm run db:push      # Apply schema changes (dev/staging)
npm run db:generate  # Generate migration files
npm run db:migrate   # Run migrations (production)
npm run db:studio    # Open Drizzle Studio
npm run db:seed      # Seed initial data (run once)
```

---

## Auth — Privy

- **Provider**: `src/components/providers/PrivyClientProvider.tsx` (wraps all pages in root layout)
- **Login methods**: email, Google, Discord
- **Admin guard**: `src/app/admin/layout.tsx` — reads `privy-token` cookie → `verifyAuthToken` → `getUser().email` → `isAdmin(email)`
- **API protection**: every `/api/admin/*` route calls `verifyToken(authHeader)` + `isAdmin(email)` before any DB operation
- **Client token**: `const token = await getAccessToken()` from `usePrivy()` — attach as `Authorization: Bearer <token>`

---

## Key Patterns

### Recruitment form
Appears in two places — both POST to `/api/recruitment` with a `source` field:
- `Home` → `source: "home"` — basic fields
- `Team 1UP` → `source: "team"` — includes gamertag + message fields (pass `extended={true}` to `<RecruitmentForm />`)

### Category → Game dynamic filter
`RecruitmentForm` and `CourseCatalog` both filter `games` array client-side by `categoryId`. No extra API call needed — all data is passed as props from Server Components.

### SideNavBar presence
| Page | Has SideNavBar |
|------|---------------|
| Home `/` | ✗ |
| Gaming Tower `/gaming-tower` | ✓ |
| Team `/team` | ✓ |
| Academia `/academia` | ✓ |
| Recreativo `/recreativo` | ✗ |
| Admin `/admin/*` | Admin sidebar (different component) |

---

## Environment Variables

| Variable | Where to get it |
|----------|----------------|
| `DATABASE_URL` | Supabase Dashboard → Settings → Database → **Transaction pooler** URI |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy dashboard |
| `PRIVY_APP_SECRET` | Privy dashboard |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage settings |
| `ADMIN_EMAILS` | Set manually — `ekinoxis.evm@gmail.com` |

> **Note**: Only `DATABASE_URL` is used by Drizzle. The three `SUPABASE_*` vars are provisioned by the Supabase MCP for future use (real-time, storage, etc.).

---

## Development

```bash
npm install          # Install deps
npm run dev          # Start dev server (Turbopack, http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check
```

**First-time setup:**
1. Add Supabase MCP: `claude mcp add --transport http supabase https://mcp.supabase.com`
2. Fill in `.env.local` — especially `DATABASE_URL` (Supabase transaction pooler URI)
3. `npm run db:push` — create tables in Supabase
4. `npm run db:seed` — populate initial data
5. Enable Google login in Privy Dashboard → Authentication → Login Methods
6. `npm run dev`

---

## File Conventions
- Components: `PascalCase.tsx`
- Routes: kebab-case directories
- DB files: camelCase
- All new public-page components go in `src/components/{page-name}/`
- All new admin components go in `src/components/admin/`
