# CHANGELOG — 1UP Gaming Tower Website

All deliveries are documented here. Newest version on top.
Format follows `.claude/skills/release-management.md`.

---

## [1.3.2] — 2026-04-07

### Fixed
- **Proxy double-prefix loop** — sidebar links like `/app/identidad` on `app.` subdomain were being rewritten to `/app/app/identidad`. Proxy now strips the existing prefix before adding it back.
- **Admin saves not appearing on public pages** — 9 admin client components had no error handling on `fetch()` calls; silent `4xx` failures looked like success. All clients now check `res.ok` and display an inline error message.
- **Admin `is_active` filter missing** — `/academia` page was fetching all courses regardless of `is_active`; teams page fetched all players. Both now filter `.eq("is_active", true)`.
- **`revalidatePath` gaps** — DELETE on games, and all mutations on `academia_content`, `masters`, and `discounts` were missing `revalidatePath` for the affected public pages. All fixed.
- **Floors `image_url` not saved** — POST/PUT on `/api/admin/floors` omitted `image_url`; floor images silently discarded. Fixed.
- **Courses `is_active` not written** — POST/PUT on `/api/admin/courses` omitted `is_active` column. Fixed.
- **`masters` RLS blocking anon reads** — table had RLS enabled with zero policies; Supabase anon key returned empty array silently. Applied `public_read_active_masters` policy directly via Supabase.

### Added
- **Juegos hero section** — `/juegos` now has a full-width hero matching the design system (pink accent, grid background, page title + subtitle), consistent with all other public pages.
- **Admin inline error display** — all 9 admin CRUD clients show a red error banner when a save/delete API call fails, so failures are never silent.

### Changed
- **SideNavBar removed** — left sidebar eliminated from all public pages. All routes (`/gaming-tower`, `/team`, `/masters`, `/academia`, `/juegos`) consolidated into the `(main)` layout group (TopAppBar + MobileBottomNav only).
- **AdminSidebar regrouped** — sidebar reorganized into 3 labeled sections: *Sitio Web* (Dashboard, Juegos, Gaming Tower, Jugadores, Competiciones, Masters), *Academia & App* (Cursos, Contenido, 1UP Pass, Pass Benefits, Descuentos, Inscripciones), *Sistema* (Usuarios, Aliados, Solicitudes, Admins). Active link shows pink left border + filled icon.

---

## [1.3.1] — 2026-04-07

### Fixed
- **Proxy API passthrough** — `/api/*` calls from `app.` and `admin.` subdomains no longer get prefixed with `/app` or `/admin`; fixes all API-dependent pages (identidad, settings, etc.)
- **Admin subdomain routing** — `admin.1upesports.org` now redirects to its own login page instead of the main site when unauthenticated
- **Masters missing from nav** — added `/masters` to TopAppBar, SideNavBar, and MobileBottomNav
- **JOIN NOW flow** — button now navigates to `app.1upesports.org/login` instead of triggering inline Privy modal on public site

### Changed
- **`app/` route group** — auth-gated routes moved to `app/(protected)/`; `app/login/` is public (no auth guard)
- **`admin/` route group** — all admin pages moved to `admin/(protected)/`; `admin/login/` is public
- **Auth redirects** — unauthenticated → own subdomain's `/login`; non-admin → main site
- **New env vars** — `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ADMIN_URL` (both with production fallbacks)

### Added
- `src/app/admin/login/page.tsx` — branded admin login page

### Production note
Enable **HttpOnly cookies** in Privy Dashboard (Configuration → App settings → Domains → set domain to `1upesports.org`). Once active, a single login on any subdomain works across all three — `1upesports.org`, `app.`, and `admin.`.

---

## [1.3.0] — 2026-04-07

### Added
- **Subdomain routing** — `proxy.ts` (Next.js 16) routes `app.1upesports.org → /app/*` and `admin.1upesports.org → /admin/*`
- **`/app` shell** — auth-gated layout for `app.1upesports.org` with `AppSidebar`; routes: `/app` (wallet), `/app/identidad`, `/app/pass`, `/app/academia`, `/app/settings`
- **`/masters` public page** — Masters showcase with `HeroMasters`, `MasterCard` (photo, specialty, social links, topics), `MasterGrid`
- **`/admin/masters`** — full CRUD with image upload, social links, topics (comma-separated)
- **`/admin/aliados`** — partner CRUD (name, NIT, email, API URL/key with masked toggle)
- **`/admin/academia-content`** — video/document/quiz content per course, published toggle, filter by course
- **`/admin/user-profiles`** — read-only list of all registered users with Comfenalco status
- **`/admin/1pass`** — pass dashboard aggregating benefits, pass-specific discounts, and purchase history
- **Send $1UP modal** — ERC-20 transfer via Privy embedded wallet + viem `writeContract`; shows tx hash + Basescan link on success
- **Receive $1UP modal** — displays wallet address with one-click copy
- **Generic aliado verify endpoint** — `POST /api/user/aliado/verify` checks partner API and stores `verified_aliados[]` on user profile
- **Courses → Masters link** — `master_id` FK on `courses`; selector in admin course form
- **Discounts → Aliados link** — `aliado_id` FK on `discount_rules`; aliado selector in admin discount form
- `ERC20_TRANSFER_ABI` added to `src/lib/viem.ts`

### DB Migrations (applied)
- `comfenalco_mercadopago_enrollments` — `user_profiles`, `discount_rules`, `enrollments`, drop `courses.payment_link`
- `masters_aliados_academia_content` — `masters`, `aliados`, `academia_content` tables
- `courses_master_discounts_aliado_user_verified` — `courses.master_id`, `discount_rules.aliado_id`, `user_profiles.verified_aliados`

### Changed
- `AdminCoursesClient` — added master selector dropdown
- `AdminDiscountsClient` — added aliado selector dropdown
- `AdminSidebar` — added Masters, Aliados, Contenido, Usuarios, 1UP Pass links
- `ImageUpload` — added `"masters"` and `"aliados"` to allowed folder types

---

## [1.2.0] — 2026-03-30

### Added
- **MercadoPago checkout** — course enrollment flow with preference creation, webhook handler, and payment status tracking
- **Comfenalco affiliation system** — `user_profiles` table with `tipo_documento`, `numero_documento`, `comfenalco_afiliado` flag; stub client ready to activate when API docs arrive
- **Discount engine** — `discount_rules` table with trigger types (Comfenalco, promo code, manual, auto), validity windows, and applies-to scope (courses / pass / all). Best discount auto-selected at checkout
- **Enrollments log** — `enrollments` table tracking full payment lifecycle (pending → approved/rejected/cancelled) with MercadoPago payment IDs
- **Admin → Descuentos** — CRUD for discount rules with active/inactive toggle, trigger type, validity dates
- **Admin → Inscripciones** — Read-only payment log with status filter and total revenue display
- **`/perfil` → IDENTIDAD tab** — document type/number form + Comfenalco verification button with live status badge
- **Payment feedback toast** — `/academia?payment=success|failure|pending` shows contextual result banner after checkout redirect

### Changed
- `CourseCatalog` — "PAY" button replaced with full MercadoPago checkout flow; affiliate discount banner shown to verified users
- `AdminCoursesClient` — removed `paymentLink` field from course form
- Admin dashboard — 4 cards → 6 cards (added Descuentos + Inscripciones); quick links updated
- Admin sidebar — 2 new items: Descuentos, Inscripciones

### Removed
- `courses.payment_link` column — checkout now handled via `/api/checkout` + MercadoPago

### DB Migration
- SQL file: `src/db/migrations/incremental_comfenalco_mp.sql`
- **Run in Supabase SQL Editor before deploying**
- Tables created: `user_profiles`, `discount_rules`, `enrollments`
- Enums created: `tipo_documento`, `discount_trigger`, `discount_applies_to`, `product_type`, `payment_status`
- Table modified: `courses` — `payment_link` column dropped

### Environment Variables
New variables required:
| Variable | Source |
|----------|--------|
| `MERCADOPAGO_ACCESS_TOKEN` | MercadoPago Dashboard → Credentials |
| `MERCADOPAGO_WEBHOOK_SECRET` | MercadoPago Dashboard → Webhooks (copy after registering URL) |
| `NEXT_PUBLIC_BASE_URL` | Set to `https://1upesports.org` |
| `COMFENALCO_API_URL` | Pending — add when Comfenalco shares API docs |
| `COMFENALCO_API_KEY` | Pending — add when Comfenalco shares API docs |

### Pending (v1.3.0)
- Activate Comfenalco API client once credentials and documentation are received
- Register MercadoPago webhook URL in MP dashboard
- Add `MERCADOPAGO_ACCESS_TOKEN` + `MERCADOPAGO_WEBHOOK_SECRET` to Vercel environment variables

### Delivered by
Ekinoxis

### Client notes
- Los usuarios ahora pueden inscribirse a cursos directamente desde la web y pagar con MercadoPago
- Los afiliados de Comfenalco verán su descuento aplicado automáticamente al pagar (requiere activación del API de Comfenalco)
- El panel de administración tiene dos nuevas secciones: Descuentos (para configurar descuentos) e Inscripciones (para ver todos los pagos)
- Los usuarios pueden verificar su cédula y estado de afiliación Comfenalco desde su perfil (`/perfil` → pestaña IDENTIDAD)

---

## [1.1.0] — 2026-03-24

### Added
- Admin user management (`/admin/users`) — add/remove DB admins, env-var admins shown read-only
- Game image uploads via Vercel Blob (`/api/admin/upload`)
- Game categories admin (`/api/admin/game-categories`)

### Changed
- Admin email resolution extended to support Google OAuth and Discord OAuth login methods

### Delivered by
Ekinoxis

---

## [1.0.0] — 2026-03-24

### Added
- Initial production release
- Public pages: Home (`/`), Gaming Tower (`/gaming-tower`), Team (`/team`), Academia (`/academia`), Juegos (`/juegos`), Recreativo (`/recreativo`)
- User profile page (`/perfil`) — wallet + settings, Privy auth required
- Admin panel (`/admin/*`) — courses, players, competitions, games, pass benefits, floors, submissions
- Recruitment form (Home + Team pages) — stored to `recruitment_submissions`
- Neo-Brutalist design system — zero border-radius, no dividers, skew pattern, glass nav
- Privy authentication — email, Google, Discord; embedded Ethereum wallets
- Supabase database with 8 tables
- Drizzle ORM schema
- Vercel Blob image uploads

### DB Migration
- Initial schema: all 8 tables created via Supabase dashboard
- See `src/db/schema.ts` for full definitions

### Environment Variables
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `BLOB_READ_WRITE_TOKEN`, `ADMIN_EMAILS`

### Delivered by
Ekinoxis

### Client notes
- Sitio web completo de 1UP Gaming Tower con panel de administración
- Autenticación con Privy (email, Google, Discord)
- Gestión completa de contenido desde el admin
