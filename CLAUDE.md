# CLAUDE.md — 1UP Gaming Tower Website

Production website for **1UP Gaming Tower** (`1upesports.org`), Colombia's first professional esports hub.
Built and maintained by **Ekinoxis** — stack: Next.js 16 App Router, TypeScript, Tailwind CSS v3, Privy auth, Supabase JS, Supabase Storage, MercadoPago. Node 24 LTS.

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
| `app/(protected)/*` | `app/` | Auth-gated user shell (wallet, identidad, beneficios, pass, academia, settings) — AppSidebar on desktop, AppBottomNav on mobile |
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
| `POST /api/user/upload-comprobante` | Privy user | Upload payment receipt → Supabase Storage (`comprobantes/`) |
| `GET\|POST /api/user/token-orders` | Privy user | List own purchase orders / create new order |
| `POST /api/user/token-orders/cancel` | Privy user | Cancel own pending order |
| `GET /api/bank-accounts` | Privy user | List active bank accounts (shown in BUY modal) |
| `POST\|PUT\|DELETE /api/admin/courses` | isAdmin | Course CRUD |
| `POST\|PUT\|DELETE /api/admin/discounts` | isAdmin | Discount rule CRUD |
| `POST\|PUT\|DELETE /api/admin/masters` | isAdmin | Masters CRUD |
| `POST\|PUT\|DELETE /api/admin/aliados` | isAdmin | Aliados CRUD |
| `POST\|PUT\|DELETE /api/admin/academia-content` | isAdmin | Academia content CRUD |
| `PUT /api/admin/social-links` | isAdmin | Footer social links update |
| `GET /api/admin/enrollments` | isAdmin | Enrollment list |
| `GET\|POST\|DELETE /api/admin/users` | isAdmin | Admin user management |
| `POST /api/admin/upload` | isAdmin | Image upload → Supabase Storage |
| `GET\|PATCH /api/admin/token-orders` | isAdmin | List OTC orders / approve or reject |
| `POST\|PUT\|DELETE /api/admin/bank-accounts` | isAdmin | Bank account CRUD |
| `GET /api/user/pass-config` | Public | Pass price, recipient address, duration |
| `GET\|POST /api/user/pass-orders` | Privy user | List own pass orders / submit after confirmed tx |
| `GET\|PUT /api/admin/pass-config` | isAdmin | Read/update pass price, recipient wallet, duration, active flag |
| `GET\|PATCH /api/admin/pass-orders` | isAdmin | List all pass orders / update admin notes |

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
| `user_profiles` | privy_user_id, nombre, apellidos, username (unique nullable), phone_country, phone_number, game_ids[], tipo_documento, numero_documento, comfenalco_afiliado, verified_aliados[] |
| `aliados` | name, nit, email, api_url, api_key, logo_url, is_active |
| `discount_rules` | trigger_type, discount_pct, applies_to, aliado_id FK, is_active, valid_from/until |
| `enrollments` | user_profile_id, course_id, final_price_cop, payment_status, mp_payment_id |
| `academia_content` | course_id FK, content_type, title, url, is_published |
| `social_links` | platform, url, is_active, sort_order — footer social icons |
| `site_content` | key (PK), image_url — site-level images (equipment_highlight, learning_path) |
| `admin_users` | email, added_by |
| `bank_accounts` | bank_name, account_type (ahorros/corriente), account_number, holder_name, holder_document, instructions, is_active, sort_order — OTC payment destinations shown in BUY modal |
| `token_purchase_orders` | user_profile_id FK, privy_user_id, email, nombre, celular_contacto, wallet_address, cop_amount, token_amount, exchange_rate_cop (frozen 1000), bank_account_id FK, comprobante_url, status (pending/approved/rejected/cancelled), admin_notes, rejection_reason, approved_tx_hash, reviewed_by, reviewed_at |
| `pass_config` | Single-row (id=1): price_token, recipient_address, duration_days, is_active, updated_by — admin-editable via `/admin/1pass` |
| `pass_orders` | user_profile_id FK, privy_user_id, wallet_address, tx_hash (unique), status (confirmed/failed/…), token_amount_paid, token_price_at_purchase, recipient_address, duration_days, block_number, paid_at, expires_at — stacks on renewal |

**Schema source of truth:** `src/types/database.types.ts` — keep this in sync with the live Supabase schema after any migration.

> **Admin Server Components must use `supabaseAdmin`** (service role key), never `supabase` (anon). RLS policies on tables like `masters` silently filter inactive records from the anon client — admin panels need to see everything. Import: `import { supabaseAdmin } from "@/lib/supabase"`.

---

## Database Migrations

**Always run migrations via the Supabase MCP tool — never ask the user to run SQL manually.**

```
1. mcp__plugin_supabase_supabase__list_projects  → confirm project ID (1uptower = kwqfpkvalspuvyiszrfh)
2. mcp__plugin_supabase_supabase__apply_migration → for DDL (CREATE TABLE, ALTER TABLE, etc.)
3. mcp__plugin_supabase_supabase__execute_sql     → for DML checks (SELECT) or seed data
```

After applying, confirm `success: true` before moving on.

---

## Image Storage

All images use **Supabase Storage** — `images` bucket (public, 5MB limit).
Upload via `/api/admin/upload` → `src/lib/blob.ts` → `supabaseAdmin.storage`.

**Path structure** — entity uploads use `{folder}/{entityId}/cover` (no extension — Supabase stores MIME in metadata). New entities without an ID yet use `{folder}/pending/{timestamp}.{ext}`. Upsert always overwrites the same key so re-uploads never leave orphaned files.

| Folder | Used by |
|--------|---------|
| `players/{id}/cover` | Player photos |
| `courses/{id}/cover` | Course cover images |
| `games/{id}/cover` | Game cover images |
| `categories/{id}/cover` | Game category images |
| `floors/{id}/cover` | Floor images (Gaming Tower) |
| `masters/{id}/cover` | Master photos |
| `aliados/{id}/cover` | Partner logos |
| `site/{key}/cover` | Site-level images (equipment-highlight, learning-path) |
| `comprobantes/pending/{privyUserIdHash}-{timestamp}.{ext}` | Payment receipt — temporary path before order ID exists |
| `comprobantes/{orderId}/receipt.{ext}` | Payment receipt — moved here after order is created (jpg/png/webp/pdf) |

**Comprobante uploads** go through `/api/user/upload-comprobante` (Privy user auth, NOT admin-only). The file is uploaded to the pending path first, then `move()`d to the final order path by `/api/user/token-orders`. Accepts jpg/png/webp/pdf only, 5MB max.

Social media brand icons live in `/public/socialmedia/` as static PNGs — not uploaded, shipped with the app.

---

## Skills — deeper context auto-injects when you edit these areas

| Skill file | Activates when editing |
|-----------|----------------------|
| `.claude/skills/design-system.md` | `src/components/**` |
| `.claude/skills/admin-crud.md` | `src/app/admin/**`, `src/components/admin/**` |
| `.claude/skills/database.md` | `src/lib/supabase.ts`, `src/lib/blob.ts`, `src/app/api/**` |
| `.claude/skills/auth.md` | `src/lib/privy.ts`, `src/lib/admin.ts`, `src/app/admin/(protected)/layout.tsx`, `src/app/app/(protected)/layout.tsx` |
| `.claude/skills/release-management.md` | `CHANGELOG.md`, `README.md`, any version/delivery task |
| `.claude/skills/cloudflare-stream.md` | `src/lib/stream.ts`, `src/app/api/user/stream-token/**`, `src/app/api/admin/stream-upload-url/**`, academia content work |
| `.claude/skills/otc-purchase-flow.md` | `src/components/perfil/BuyTokensWizard.tsx`, `src/components/perfil/MisOrdenes.tsx`, `src/app/api/user/token-orders/**`, `src/app/api/user/upload-comprobante/**`, `src/app/api/bank-accounts/**`, `src/app/api/admin/token-orders/**`, `src/app/api/admin/bank-accounts/**`, `src/app/admin/(protected)/token-orders/**`, `src/app/admin/(protected)/bank-accounts/**` |
| `.claude/skills/pass-purchase-flow.md` | `src/components/perfil/BuyPassWizard.tsx`, `src/components/perfil/MisPassOrders.tsx`, `src/components/perfil/PassPurchasePanel.tsx`, `src/lib/passVerifier.ts`, `src/app/api/user/pass-orders/**`, `src/app/api/user/pass-config/**`, `src/app/api/admin/pass-orders/**`, `src/app/api/admin/pass-config/**`, `src/app/admin/(protected)/pass-orders/**`, `src/app/app/(protected)/pass/**` |

---

## Dev Commands

```bash
npm run dev        # Turbopack dev server → http://localhost:3000
npm run build      # Production build (run to verify types before shipping)
npm run lint       # ESLint
```

---

## Environment Variables

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (also used for Supabase Storage uploads) |
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
