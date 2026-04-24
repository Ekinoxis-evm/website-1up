# CHANGELOG — 1UP Gaming Tower Website

All deliveries are documented here. Newest version on top.
Format follows `.claude/skills/release-management.md`.

---

## [1.5.0] — 2026-04-23

### Added
- **Admin-editable site images** — new `site_content` DB table (key/image_url) with two seeded rows: `equipment_highlight` and `learning_path`. New `/admin/site-images` page (sidebar: "Imágenes Sitio") lets the admin upload images for both sections; saves automatically on upload — no extra button needed.
- **Equipment Highlight image live** — `EquipmentHighlight` component on `/gaming-tower` now shows the uploaded image when set; falls back to the `videogame_asset` icon placeholder when empty.
- **Learning Path image live** — `LearningPath` component on `/academia` now shows the uploaded image when set; falls back to the grid + trophy placeholder when empty.
- **`site/` storage folder** — `ImageFolder` type and upload route now include `"site"` as a valid folder. Entity keys are kept as strings (e.g. `site/equipment-highlight/cover`) — not cast to Number.

### DB Migration (applied via Supabase MCP)
- Table created: `site_content` — `key text PRIMARY KEY`, `image_url text`, `updated_at timestamptz`
- Seeded: `equipment_highlight`, `learning_path`

---

## [1.4.0] — 2026-04-23

### Added
- **Floor images in Gaming Tower** — `FloorBreakdown` now displays a per-floor image when one is set: desktop shows it as a `w-80` panel on the right with a gradient blend edge; mobile shows it full-width above the content. Hover removes grayscale with a 700ms transition.
- **ImageUpload in Admin Floors modal** — `AdminFloorsClient` now includes `ImageUpload` (folder `floors`, entity ID passed for upsert path); the floor list also shows a thumbnail preview for floors with images. Save button is disabled while upload is in progress ("SUBIENDO...").
- **Real Google Maps embed** — `LocationMap` component replaced placeholder with a real Google Maps iframe centered on Cra. 34 # 5A-19, Barrio 3 de Julio, Cali (beside Estadio Pascual Guerrero). Includes address block, schedule, landmark reference, and GET DIRECTIONS link.

---

## [1.3.10] — 2026-04-23

### Fixed
- **Image upload race condition (all admin clients)** — `ImageUpload` component now exposes an `onUploadingChange` prop; all 5 CRUD clients (`AdminGamesClient`, `AdminPlayersClient`, `AdminCoursesClient`, `AdminMastersClient`, `AdminFloorsClient`) pass `imgUploading` state that disables the GUARDAR button with "SUBIENDO..." label while the upload is in progress. Prevents saving records with `null` image URLs.
- **Entity ID passed to upload route** — `ImageUpload` now appends `entityId` to the FormData it sends; `AdminGamesClient` passes `entityId={editing?.id}` for game images and `entityId={cat.id}` for category images. Ensures uploads land at the correct entity-ID path from the first save.

### Changed
- **Storage path structure — entity-ID folders** — `src/lib/blob.ts` rewritten: entity uploads now use `{folder}/{entityId}/cover` (extension-free); pending (new entity, no ID yet) uses `{folder}/pending/{timestamp}.{ext}`. Extension-free paths mean upsert always replaces the same key regardless of file format changes — no orphaned files.
- **`categories/` added as valid image folder** — `ImageFolder` type and `ALLOWED_FOLDERS` in the upload route now include `"categories"`. `AdminGamesClient` uses `folder="categories"` + `entityId={cat.id}` for category images (was incorrectly using `"games"`).

---

## [1.3.9] — 2026-04-23

### Fixed
- **Admin dashboard counts** — dashboard was using the anon Supabase client to count `discount_rules` and `enrollments`; both tables have RLS with no anon SELECT policy so the counts always showed 0. Now uses `supabaseAdmin` (service role).

### Removed
- **Drizzle ORM** — `drizzle-orm`, `postgres`, and `drizzle-kit` packages removed; `src/db/` folder and `drizzle.config.ts` deleted. Nothing in the app imported from `src/db/` — all pages and API routes use the Supabase JS client directly. `DATABASE_URL` env var is no longer needed.

---

## [1.3.8] — 2026-04-08

### Changed
- **Masters page — layout aligned with site standard** — `HeroMasters` rebuilt to match `HeroTeam` / `HeroAcademia` pattern: `min-h-[60vh]` gradient hero, `border-b-[12px]` bottom accent, label pill with skew, `px-8 md:px-16` padding, `max-w-3xl` content width. Removed Rule-2-violating `h-1` divider line.
- **MasterGrid padding aligned** — section now uses `py-20 px-8 md:px-16 bg-surface-container-lowest`, matching `PlayerGrid` and `CourseCatalog`. Removed inner `max-w-5xl mx-auto` wrapper — consistent with all other grid sections.

---

## [1.3.7] — 2026-04-08

### Added
- **Masters — 8 social networks** — `kick_url`, `twitch_url`, `github_url` columns added to `masters` table; admin form now shows all 8 platforms (instagram, tiktok, youtube, x, kick, twitch, github, linkedin); public MasterCard renders all active icons
- **Masters — category selection** — new `categories text[]` column replaces free-text specialty concept; admin form has checkbox buttons for Gaming / Performance / Technology / Marketing / Legal; public MasterCard shows categories as colored badges (pink/blue/teal/red/gray)
- **Masters admin card — always-visible course count** — every master card in the admin list shows assigned courses with category badges and a count; shows "Sin cursos" when none instead of hiding the section
- **Masters edit modal — course panel always visible** — when editing a master the assigned courses section always renders (was previously hidden if empty)

### DB Migration
- SQL file: `src/db/migrations/incremental_masters_social_categories.sql`
- **Run in Supabase SQL Editor before deploying**
- Table modified: `masters` — added `kick_url`, `twitch_url`, `github_url` (text nullable), `categories` (text[] default '{}')

---

## [1.3.6] — 2026-04-08

### Fixed
- **Masters admin shows all records** — page now uses `supabaseAdmin` (service role) instead of the anon client; inactive masters were silently filtered by RLS and invisible in the admin panel
- **Active/inactive badge on master cards** — each card now shows an Activo/Inactivo status indicator; all topics shown (previously capped at 3)
- **Social links revalidation** — `revalidatePath("/", "layout")` now invalidates the footer on all public pages, not just `/`; changes were visible on home but not on `/masters`, `/team`, etc.
- **Aliados admin uses service role** — `supabaseAdmin` used for reads so `api_key` is always visible regardless of future RLS changes
- **`next.config.ts` image domain** — replaced stale `*.public.blob.vercel-storage.com` (Vercel Blob, removed) with `*.supabase.co` (Supabase Storage, current)
- **`SocialLink` type export added** — `src/db/schema.ts` was missing `export type SocialLink` despite the table being defined; added to match all other tables

### Removed
- **`@vercel/blob` dependency** — package was still in `package.json` after storage migration to Supabase; removed (no code was importing it)

### Security
- **`drizzle-orm` updated to 0.45.2** — fixes CVE: SQL injection via improperly escaped identifiers (GHSA-gpj5-g38j-94v9); was on 0.45.1

---

## [1.3.5] — 2026-04-07

### Added
- **Social media icons on player/master cards** — `/public/socialmedia/` PNG icons (instagram, tiktok, kick, youtube, x, twitch, github, linkedin) replace material-symbols on `PlayerCard` hover overlay and `MasterCard` social row
- **Editable footer social links** — `social_links` table stores per-platform URLs; Footer is now a Server Component reading active links from DB
- **`/admin/social-links`** — admin page to set URL + active toggle per platform (instagram, tiktok, kick, youtube, x, twitch); seeded on deploy
- **`src/lib/socialIcons.ts`** — shared platform → icon path + label mapping used across player cards, master cards, and footer

### DB Migration
- `create_social_links` — `social_links` table with 6 rows pre-seeded (instagram, tiktok, kick, youtube, x, twitch)

---

## [1.3.4] — 2026-04-07

### Added
- **Master → Courses relation in admin** — master list cards and edit modal now show all courses assigned to that master (name + category badge). Assignment still happens from the Courses form via the master selector dropdown.
- **QR code on Receive modal** — wallet address is now displayed as a scannable QR code (white background, 180px, via `qrcode.react`)
- **QR scanner on Send modal** — scan button opens camera using `BarcodeDetector` (native browser API, no extra runtime); scans QR code and fills the recipient address field automatically. Graceful error shown on unsupported browsers.

---

## [1.3.3] — 2026-04-07

### Added
- **Course badges on MasterCard** — `/masters` now shows each master's assigned courses with category color-coding (Gaming → pink, Performance → blue, Technology → green)

### Changed
- **Image storage migrated to Supabase Storage** — `images` bucket created in Supabase (public, 5MB limit, jpg/png/webp/gif/avif). Replaces Vercel Blob. `BLOB_READ_WRITE_TOKEN` is no longer needed.
- `src/lib/blob.ts` — rewritten to use `supabaseAdmin.storage`; folder types extended to include `masters` and `aliados`

### Fixed
- **Build failure** — TypeScript rejected `uploadImage("masters")` because `blob.ts` type union didn't include `"masters"` or `"aliados"` — fixed in both the route and the lib
- **Masters `saveError` not shown** — error state was set but never rendered in the modal JSX

### Removed
- Vercel Blob dependency (`@vercel/blob`) — no longer used

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
