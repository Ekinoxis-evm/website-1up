# CLAUDE.md — 1UP Gaming Tower Website

Production website for **1UP Gaming Tower** (`1upesports.org`), Colombia's first professional esports hub.
Built and maintained by **Ekinoxis** — stack: Next.js 16 App Router, TypeScript, Tailwind CSS v3, Privy auth, Supabase JS + Drizzle ORM, Vercel Blob. Node 24 LTS.

---

## 7 Non-Negotiable Rules

1. **0px border-radius.** `rounded-*` is banned except `rounded-full`. Sharp corners everywhere.
2. **No 1px dividers.** Never `<hr>`, `border-b`, or `border-t` for section separation — use background color shifts.
3. **Public pages = pure Tailwind.** No shadcn imports in `src/components/{home,tower,team,academia,recreativo,juegos}/`.
4. **Skew pattern.** Outer element: `className="skew-fix"`. Inner text: `className="block skew-content"`.
5. **Glass nav.** TopAppBar always uses `glass-panel` class — never opaque.
6. **Auth on every admin API route.** `verifyToken` + `isAdmin` before any DB operation. No exceptions.
7. **`revalidatePath()` after every mutation.** Call it for both the public page AND the admin page.

---

## Route Map

| URL | Layout group | Purpose |
|-----|-------------|---------|
| `/` | `(main)` | Home — Hero, Games Gallery, Recruitment |
| `/recreativo` | `(main)` | Casual gaming |
| `/gaming-tower` | `(sidebar)` | 6-floor breakdown, Pass, Map |
| `/juegos` | `(sidebar)` | Games showcase by category |
| `/team` | `(sidebar)` | Pro roster + Hall of Fame |
| `/academia` | `(sidebar)` | Course catalog |
| `/perfil` | `(main)` | Wallet + settings (auth-gated client) |
| `/admin/*` | `admin/` | Protected admin panel |

**API routes** — all `/api/admin/*` require Privy Bearer token + isAdmin check.
New endpoints added: `/api/admin/upload` (Blob), `/api/admin/game-categories` (PUT), `/api/admin/users` (GET/POST/DELETE).

---

## Skills — deeper context auto-injects when you edit these areas

| Skill file | Activates when editing |
|-----------|----------------------|
| `.claude/skills/design-system.md` | `src/components/**` |
| `.claude/skills/admin-crud.md` | `src/app/admin/**`, `src/components/admin/**` |
| `.claude/skills/database.md` | `src/db/**`, `src/lib/supabase.ts`, `src/app/api/**` |
| `.claude/skills/auth.md` | `src/lib/privy.ts`, `src/lib/admin.ts`, `src/app/admin/layout.tsx` |

---

## Dev Commands

```bash
npm run dev        # Turbopack dev server → http://localhost:3000
npm run build      # Production build (run to verify types before shipping)
npm run lint       # ESLint
npm run db:seed    # Seed initial data (run once after first migration)
```

---

## Environment Variables

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `DATABASE_URL` | Supabase → Settings → Database → Connection string (Transaction pooler) |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy dashboard |
| `PRIVY_APP_SECRET` | Privy dashboard |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob settings |
| `ADMIN_EMAILS` | Manual — comma-separated root admin emails |
| `NEXT_PUBLIC_BASE_RPC_URL` | Optional — Base L2 RPC (defaults to mainnet.base.org) |
