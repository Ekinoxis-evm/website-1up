# CLAUDE.md — 1UP Gaming Tower Website

Production website for **1UP Gaming Tower** (`1upesports.org`), Colombia's first professional esports hub.
Built and maintained by **Ekinoxis** — stack: Next.js 16 App Router, TypeScript, Tailwind CSS v3, Privy auth, Supabase JS + Drizzle ORM, Supabase Storage, MercadoPago. Node 24 LTS.

---

## 8 Non-Negotiable Rules

1. **0px border-radius.** `rounded-*` is banned except `rounded-full`. Sharp corners everywhere.
2. **No 1px dividers.** Never `<hr>`, `border-b`, or `border-t` for section separation — use background color shifts.
3. **Public pages = pure Tailwind.** No shadcn imports in `src/components/{home,tower,team,academia,recreativo,juegos}/`.
4. **Skew pattern.** Outer element: `className="skew-fix"`. Inner text: `className="block skew-content"`.
5. **Glass nav.** TopAppBar always uses `glass-panel` class — never opaque.
6. **Auth on every admin API route.** `verifyToken` + `isAdmin` before any DB operation. No exceptions.
7. **`revalidatePath()` after every mutation.** Call it for both the public page AND the admin page. Footer is in the shared layout — use `revalidatePath("/", "layout")` when mutating `social_links` so all public pages refresh.
8. **Update docs after every change.** After any addition, fix, or feature: update `CHANGELOG.md` (new version entry), `README.md` (if routes/tables/stack changed), and this file (if rules/routes/env vars changed). No exception — docs drift is technical debt.

---

## Route Map

All public routes use the single `(main)` layout group — TopAppBar + MobileBottomNav + Footer. No sidebar.

| URL | Layout group | Purpose |
|-----|-------------|---------|
| `/` | `(main)` | Home — Hero, Games Gallery, Recruitment |
| `/gaming-tower` | `(main)` | 6-floor breakdown, Pass, Map |
| `/juegos` | `(main)` | Games showcase by category |
| `/team` | `(main)` | Pro roster + Hall of Fame |
| `/masters` | `(main)` | Masters showcase — coaches and specialists |
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
| `POST /api/user/aliado/verify` | Privy user | Generic aliado affiliation check |
| `POST /api/checkout` | Privy user | Creates MP preference + pending enrollment |
| `POST /api/webhooks/mercadopago` | HMAC signature | Payment confirmation |
| `POST\|PUT\|DELETE /api/admin/courses` | isAdmin | Course CRUD |
| `POST\|PUT\|DELETE /api/admin/discounts` | isAdmin | Discount rule CRUD |
| `POST\|PUT\|DELETE /api/admin/masters` | isAdmin | Masters CRUD |
| `POST\|PUT\|DELETE /api/admin/aliados` | isAdmin | Aliados CRUD |
| `POST\|PUT\|DELETE /api/admin/academia-content` | isAdmin | Academia content CRUD |
| `PUT /api/admin/social-links` | isAdmin | Footer social links update |
| `GET /api/admin/enrollments` | isAdmin | Enrollment list |
| `GET\|POST\|DELETE /api/admin/users` | isAdmin | Admin user management |
| `POST /api/admin/upload` | isAdmin | Image upload → Supabase Storage |

---

## Database Tables

| Table | Key fields |
|-------|-----------|
| `game_categories` | name, slug, image_url |
| `games` | name, category_id, image_url |
| `players` | gamertag, real_name, role, photo_url, social URLs, is_active |
| `competitions` | tournament_name, year, result, player_id |
| `courses` | name, category, price_cop, duration_hours, image_url, master_id FK, is_active |
| `masters` | name, specialty, bio, photo_url, instagram/tiktok/twitter/youtube/linkedin/kick/twitch/github URLs, categories[], topics[], is_active |
| `pass_benefits` | title, description |
| `floor_info` | floor_label, title, description, accent_color, image_url |
| `recruitment_submissions` | name, email, phone, source |
| `user_profiles` | privy_user_id, tipo_documento, numero_documento, comfenalco_afiliado, verified_aliados[] |
| `aliados` | name, nit, email, api_url, api_key, logo_url, is_active |
| `discount_rules` | trigger_type, discount_pct, applies_to, aliado_id FK, is_active, valid_from/until |
| `enrollments` | user_profile_id, course_id, final_price_cop, payment_status, mp_payment_id |
| `academia_content` | course_id FK, content_type, title, url, is_published |
| `social_links` | platform, url, is_active, sort_order — footer social icons |
| `admin_users` | email, added_by |

**Schema source of truth:** `src/db/schema.ts` — always update this + `src/types/database.types.ts` together.

> **Admin Server Components must use `supabaseAdmin`** (service role key), never `supabase` (anon). RLS policies on tables like `masters` silently filter inactive records from the anon client — admin panels need to see everything. Import: `import { supabaseAdmin } from "@/lib/supabase"`.

---

## Image Storage

All images use **Supabase Storage** — `images` bucket (public, 5MB limit).
Folders: `players/`, `courses/`, `games/`, `floors/`, `masters/`, `aliados/`.
Upload via `/api/admin/upload` → `src/lib/blob.ts` → `supabaseAdmin.storage`.
Social media brand icons live in `/public/socialmedia/` as static PNGs — not uploaded, shipped with the app.

---

## Skills — deeper context auto-injects when you edit these areas

| Skill file | Activates when editing |
|-----------|----------------------|
| `.claude/skills/design-system.md` | `src/components/**` |
| `.claude/skills/admin-crud.md` | `src/app/admin/**`, `src/components/admin/**` |
| `.claude/skills/database.md` | `src/db/**`, `src/lib/supabase.ts`, `src/lib/blob.ts`, `src/app/api/**` |
| `.claude/skills/auth.md` | `src/lib/privy.ts`, `src/lib/admin.ts`, `src/app/admin/(protected)/layout.tsx`, `src/app/app/(protected)/layout.tsx` |
| `.claude/skills/release-management.md` | `CHANGELOG.md`, `README.md`, any version/delivery task |
| `.claude/skills/cloudflare-stream.md` | `src/lib/stream.ts`, `src/app/api/user/stream-token/**`, `src/app/api/admin/stream-upload-url/**`, academia content work |

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
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (also used for Supabase Storage uploads) |
| `DATABASE_URL` | Supabase → Settings → Database → Connection string (Transaction pooler) |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy dashboard |
| `PRIVY_APP_SECRET` | Privy dashboard |
| `ADMIN_EMAILS` | Manual — comma-separated root admin emails |
| `MERCADOPAGO_ACCESS_TOKEN` | MercadoPago dashboard → Credentials |
| `MERCADOPAGO_WEBHOOK_SECRET` | MercadoPago dashboard → Webhooks |
| `NEXT_PUBLIC_BASE_URL` | Production URL (`https://1upesports.org`) |
| `NEXT_PUBLIC_APP_URL` | App subdomain (`https://app.1upesports.org`) |
| `NEXT_PUBLIC_ADMIN_URL` | Admin subdomain (`https://admin.1upesports.org`) |
| `COMFENALCO_API_URL` | Pending — Comfenalco API endpoint |
| `COMFENALCO_API_KEY` | Pending — Comfenalco API key |
| `NEXT_PUBLIC_BASE_RPC_URL` | Optional — Base L2 RPC (defaults to mainnet.base.org) |

> `BLOB_READ_WRITE_TOKEN` is **not needed** — image storage migrated to Supabase Storage.

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
