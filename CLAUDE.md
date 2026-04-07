# CLAUDE.md — 1UP Gaming Tower Website

Production website for **1UP Gaming Tower** (`1upesports.org`), Colombia's first professional esports hub.
Built and maintained by **Ekinoxis** — stack: Next.js 16 App Router, TypeScript, Tailwind CSS v3, Privy auth, Supabase JS + Drizzle ORM, Vercel Blob, MercadoPago. Node 24 LTS.

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

All public routes use the single `(main)` layout group — TopAppBar + MobileBottomNav + Footer. No sidebar.

| URL | Layout group | Purpose |
|-----|-------------|---------|
| `/` | `(main)` | Home — Hero, Games Gallery, Recruitment |
| `/gaming-tower` | `(main)` | 6-floor breakdown, Pass, Map |
| `/juegos` | `(main)` | Games showcase by category |
| `/team` | `(main)` | Pro roster + Hall of Fame |
| `/masters` | `(main)` | Masters showcase |
| `/academia` | `(main)` | Course catalog + MercadoPago checkout |
| `/recreativo` | `(main)` | Casual gaming |
| `/perfil` | `(main)` | Legacy — redirects to app subdomain |
| `app/login` | `app/` | Public login page for app subdomain |
| `app/(protected)/*` | `app/` | Auth-gated user shell (wallet, identidad, pass, academia, settings) |
| `admin/login` | `admin/` | Public login page for admin subdomain |
| `admin/(protected)/*` | `admin/` | Auth-gated admin panel (requires isAdmin) |

**API routes** — all `/api/admin/*` require Privy Bearer token + isAdmin check.

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/recruitment` | Public | Recruitment form submission |
| `GET\|PUT /api/user/profile` | Privy user | Own profile CRUD |
| `POST /api/user/comfenalco/verify` | Privy user | Comfenalco affiliation check |
| `POST /api/checkout` | Privy user | Creates MP preference + pending enrollment |
| `POST /api/webhooks/mercadopago` | HMAC signature | Payment confirmation |
| `POST\|PUT\|DELETE /api/admin/courses` | isAdmin | Course CRUD |
| `POST\|PUT\|DELETE /api/admin/discounts` | isAdmin | Discount rule CRUD |
| `GET /api/admin/enrollments` | isAdmin | Enrollment list |
| `GET\|POST\|DELETE /api/admin/users` | isAdmin | Admin user management |
| `POST /api/admin/upload` | isAdmin | Blob image upload |

---

## Database Tables

| Table | Key fields |
|-------|-----------|
| `game_categories` | name, slug, image_url |
| `games` | name, category_id, image_url |
| `players` | gamertag, real_name, role, is_active |
| `competitions` | tournament_name, year, result, player_id |
| `courses` | name, category, price_cop, duration_hours, image_url, is_active |
| `pass_benefits` | title, description |
| `floor_info` | floor_label, title, description, accent_color |
| `recruitment_submissions` | name, email, phone, source |
| `user_profiles` | privy_user_id, tipo_documento, numero_documento, comfenalco_afiliado, verified_aliados[] |
| `aliados` | name, nit, email, api_url, api_key |
| `discount_rules` | trigger_type, discount_pct, applies_to, aliado_id FK, is_active, valid_from/until |
| `enrollments` | user_profile_id, course_id, final_price_cop, payment_status, mp_payment_id |
| `masters` | name, specialty, photo_url, topics, instagram, tiktok, twitter, youtube, linkedin |
| `academia_content` | course_id FK, type, title, url, is_published |
| `admin_users` | email, added_by |

**Schema changes:** `courses.payment_link` removed (MercadoPago checkout); `courses.master_id` FK added; `discount_rules.aliado_id` FK added.
**Schema source of truth:** `src/db/schema.ts` — always update this + `src/types/database.types.ts` together.

---

## Skills — deeper context auto-injects when you edit these areas

| Skill file | Activates when editing |
|-----------|----------------------|
| `.claude/skills/design-system.md` | `src/components/**` |
| `.claude/skills/admin-crud.md` | `src/app/admin/**`, `src/components/admin/**` |
| `.claude/skills/database.md` | `src/db/**`, `src/lib/supabase.ts`, `src/app/api/**` |
| `.claude/skills/auth.md` | `src/lib/privy.ts`, `src/lib/admin.ts`, `src/app/admin/(protected)/layout.tsx`, `src/app/app/(protected)/layout.tsx` |
| `.claude/skills/release-management.md` | `CHANGELOG.md`, `README.md`, any version/delivery task |

---

## Dev Commands

```bash
npm run dev        # Turbopack dev server → http://localhost:3000
npm run build      # Production build (run to verify types before shipping)
npm run lint       # ESLint
npm run db:seed    # Seed initial data (run once after first migration)
npx drizzle-kit generate --name=<migration_name>   # Generate SQL migration
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
| `MERCADOPAGO_ACCESS_TOKEN` | MercadoPago dashboard → Credentials |
| `MERCADOPAGO_WEBHOOK_SECRET` | MercadoPago dashboard → Webhooks |
| `NEXT_PUBLIC_BASE_URL` | Production URL (`https://1upesports.org`) |
| `NEXT_PUBLIC_APP_URL` | App subdomain (`https://app.1upesports.org`) |
| `NEXT_PUBLIC_ADMIN_URL` | Admin subdomain (`https://admin.1upesports.org`) |
| `COMFENALCO_API_URL` | Pending — Comfenalco API endpoint |
| `COMFENALCO_API_KEY` | Pending — Comfenalco API key |
| `NEXT_PUBLIC_BASE_RPC_URL` | Optional — Base L2 RPC (defaults to mainnet.base.org) |

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
