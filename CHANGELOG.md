# CHANGELOG — 1UP Gaming Tower Website

All deliveries are documented here. Newest version on top.
Format follows `.claude/skills/release-management.md`.

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
