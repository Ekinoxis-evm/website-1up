# CHANGELOG — 1UP Gaming Tower Website

All deliveries are documented here. Newest version on top.
Format follows `.claude/skills/release-management.md`.

---

## [2.22.2] — 2026-05-12

### Security

- **Private `comprobantes` bucket** — payment receipts (token purchase, pass, and course enrollments) now upload to a private Supabase Storage bucket (`public: false`). Files have no permanent guessable URL; admins receive 1-hour signed URLs generated on demand via `getComprobanteSignedUrl`. The `images` bucket SELECT policy now excludes `comprobantes/*` paths, blocking API enumeration of legacy files.
- **`hall_of_fame` view hardened** — switched from `SECURITY DEFINER` to `SECURITY INVOKER`. Added a narrow `hall_of_fame_public_read` RLS policy on `user_profiles` so only profiles with a tournament podium result are readable by anon/authenticated. All other user profiles remain private.
- **Three wizard components** (`BuyTokensWizard`, `BuyPassBankWizard`, `CourseCheckoutWizard`) — removed `comprobanteUrl` state and all references. Upload response now returns `{ path }` only. Submit gates and reset logic updated to use `comprobantePath`.
- **Three admin GET routes** (`/api/admin/token-orders`, `/api/admin/pass-orders`, `/api/admin/enrollments`) — generate signed URLs for `comprobante_url` before responding. Legacy full-URL records pass through transparently.
- **Three user order routes** — removed `comprobanteUrl` from request body; path-prefix validation updated from `comprobantes/pending/` to `pending/` (private bucket path layout); DB field stores path instead of public URL.

### Delivered by
- Ekinoxis

---

## [2.22.1] — 2026-05-12

### Security

- **Full Supabase RLS audit** — enabled Row Level Security on all 27 public schema tables. Previously 16 tables had RLS disabled, exposing full INSERT/UPDATE/DELETE to anyone with the public anon key.
- **`admin_users` privilege escalation closed** — table now has RLS with no policies (service-role only). Before, any anonymous caller could insert a row via PostgREST and gain admin access on the next request.
- **`pass_orders` locked** — RLS enabled, no public policies. Wallet addresses, tx hashes, and comprobante URLs are no longer readable/writable by anon.
- **`user_profiles` policies fixed** — dropped `USING (true)` policies that let any authenticated user read all profiles (PII: phone, document ID, birth date) and update any other user's profile. All profile access now goes exclusively through service-role API routes.
- **`aliados` api_key protected** — RLS enabled with public read for active partners; `api_key` and `api_url` columns revoked at column level from anon/authenticated roles.
- **`recruitment_submissions`, `referral_codes` locked** — RLS enabled, service-role only.
- **Public content tables hardened** — `game_categories`, `games`, `players`, `competitions`, `floor_info`, `pass_benefits`, `pass_config`, `social_links`, `tournaments`, `courses`, `site_content` now have RLS with SELECT-only policies for anon/authenticated. Blocks direct INSERT/UPDATE/DELETE via PostgREST while keeping public reads intact.
- **`register_for_tournament` RPC locked** — revoked EXECUTE from PUBLIC, anon, and authenticated. Function was callable without authentication via PostgREST, allowing anyone to register arbitrary user profiles for tournaments.
- **`sync_user_pass_status` RPC locked** — revoked EXECUTE from PUBLIC, anon, and authenticated. Trigger function not meant for direct invocation.
- **Function search_path hardened** — set `search_path = public` on `register_for_tournament` and `sync_user_pass_status` to prevent search_path injection attacks.

### Delivered by
- Ekinoxis

---

## [2.22.2] — 2026-05-12

### Changed

- **`AdminEnrollmentsClient`** — rebuilt as a proper `<table>`. Single header row; rows no longer repeat column labels. Added payment method filter (MercadoPago / Banco / $1UP Token) independent from the existing status filter. Inline approve/reject panel expands as a full-width row below the selected enrollment.
- **`AdminPrivyUsersClient`** — rebuilt as a proper `<table>` (columns: Usuario / Wallet·$1UP / Cédula / Juegos / Cursos / Registrado). Games strip moved inline into the Juegos column. All search, sort, and game filters preserved.
- **`AdminUserProfilesClient`** — rebuilt as a proper `<table>` (columns: Email / Documento / Comfenalco / Privy ID / Registro).

### Delivered by
- Ekinoxis

---

## [2.22.0] — 2026-05-12

### Added

- **Vitest test suite** — `vitest` installed as dev dependency. `npm run test` (watch) and `npm run test:run` (CI) scripts added. `vitest.config.ts` configured with node environment and `@/` path alias.
- **52 automated tests across 7 test files** in `src/__tests__/lib/`:
  - `utils.test.ts` — `formatCop`, `cn`
  - `tournamentPoints.test.ts` — `pointsFor`, `POINTS_BY_POSITION`
  - `discount.test.ts` — `selectBestDiscount` (discount selection logic)
  - `admin.test.ts` — `isEnvAdmin`, `isAdmin` (env path + DB path)
  - `mercadopago.test.ts` — `verifyWebhookSignature` (HMAC-SHA256)
  - `comfenalco.test.ts` — config error, affiliated/not-affiliated, API error
  - `privy.test.ts` — `verifyToken` (null, no Bearer, valid, expired)
- **`src/lib/discount.ts`** — extracted `selectBestDiscount` from `src/app/api/checkout/route.ts` to make it independently importable and testable.

### Changed

- **`isEnvAdmin` in `src/lib/admin.ts`** — reads `process.env.ADMIN_EMAILS` inline on every call instead of caching at module load. Enables `vi.stubEnv` to work correctly in tests. Behavior in production is unchanged.

### Delivered by
- Ekinoxis

---

## [2.21.0] — 2026-05-12

### Added

- **Tournament slug URLs** — tournaments now resolve at `/torneos/[slug]` (e.g., `/torneos/copa-valorant`). Numeric ID fallback preserved for backward compatibility with existing QR codes and bookmarks. Migration backfills slugs for all existing tournaments; UNIQUE constraint enforced on the `slug` column. Dedup appends `-{id}` on collision.
- **Tournament sponsors** — each tournament now supports an optional sponsor (name, website URL, logo URL). Sponsor strip shown on tournament cards and detail page. Admin form includes a Sponsor section. API handles `sponsor_name`, `sponsor_website_url`, `sponsor_logo_url` on POST and PUT.
- **Treasury wallet on bank accounts admin page** (`/admin/bank-accounts`) — `pass_config.recipient_address` now surfaced at the top of the bank accounts admin as a prominent card, alongside COP bank accounts. Centralizes all payment destinations in one view. Includes Copy and BaseScan link actions and inline edit mode.

### Fixed

- **Aliados banner blank** — `aliados` table had Row Level Security enabled with no policies defined, causing anon client to receive zero rows. Disabled RLS on `aliados` (consistent with all other non-sensitive tables in the project). Home page marquee now shows banner sponsors correctly.

### Delivered by
- Ekinoxis

---

## [2.20.1] — 2026-05-12

### Added

- **`price_token` field on course admin form** — create/edit modal now shows the $1UP token price field alongside the COP price. Course table displays `{price_token} $1UP` when set. API (POST and PUT `/api/admin/courses`) persists the value.

### Changed

- **MercadoPago removed from `CourseCheckoutWizard`** — payment methods now limited to $1UP token (on-chain) and bank transfer (comprobante). MP option will be re-added once the integration is fully active. `Method` type is now `"token" | "bank"`.
- **Treasury wallet card moved to pass config admin** (`/admin/1pass`) — `pass_config.recipient_address` displayed prominently with explanatory copy ("receives all $1UP payments for Pass + Courses"), Copy button, and BaseScan link. Edit stays in-place. Pass-specific config (price, duration, active toggle) is a separate card below.

### Delivered by
- Ekinoxis

---

## [2.20.0] — 2026-05-12

### Added

- **Standardized purchase flows for all three products** — $1UP tokens, 1UP Pass, and course enrollments now all support token ($1UP on-chain) and bank transfer payment paths with identical lifecycle, admin review, and email notifications.
- **`CourseCheckoutWizard`** (`src/components/academia/CourseCheckoutWizard.tsx`): new 3-method checkout modal for courses. Phases: method select → MercadoPago redirect | token send → on-chain confirm → register | bank select → comprobante upload → submit → success/error. Token option auto-disabled when `course.price_token` is null.
- **`POST /api/user/course-orders`**: new endpoint for token and bank course purchases. Token path: validates txHash, calls `verifyPassTransfer` with `course.price_token`, creates enrollment `approved` immediately. Bank path: validates comprobante, creates enrollment `pending`, moves comprobante to final storage path. Discount logic applied on both paths.
- **`PATCH /api/admin/enrollments`**: new action to approve or reject pending token/bank enrollments. Guards `payment_method IN ("token","bank")` and `payment_status = "pending"`. Fires `sendCourseOrderApprovedEmail` / `sendCourseOrderRejectedEmail`.
- **8 new transactional email functions** in `src/lib/email.ts`:
  - `sendTokenOrderApprovedEmail`, `sendTokenOrderRejectedEmail` — $1UP token orders
  - `sendPassBankApprovedEmail`, `sendPassBankRejectedEmail` — 1UP Pass bank orders
  - `sendCourseOrderPlacedEmail`, `sendCourseOrderConfirmedEmail` — course placement
  - `sendCourseOrderApprovedEmail`, `sendCourseOrderRejectedEmail` — course bank review
- **Admin `PATCH /api/admin/token-orders`**: now fires `sendTokenOrderApprovedEmail` / `sendTokenOrderRejectedEmail` on every action.
- **Admin `PATCH /api/admin/pass-orders`**: now fires `sendPassBankApprovedEmail` / `sendPassBankRejectedEmail` on every action; also fixed missing `revalidatePath("/app/pass")` on rejection.
- **Combined Pass orders admin page** (`src/components/admin/AdminPassOrdersClient.tsx`): rebuilt with two tabs — "Token $1UP" and "Banco" (with pending count badge). Combined KPIs at top. Old `/admin/pass-bank-orders` redirects here.

### Changed

- **`AdminEnrollmentsClient`** (`src/components/admin/AdminEnrollmentsClient.tsx`): rebuilt — payment method badge (MercadoPago / $1UP Token / Banco), inline Aprobar/Rechazar panel for pending token/bank enrollments, comprobante link and BaseScan TX link in proof column.
- **`/admin/enrollments/page.tsx`**: switched to `supabaseAdmin` (was anon); now selects all new enrollment fields + `bank_accounts` join.
- **`CourseCatalog`**: MP checkout replaced with `CourseCheckoutWizard`; fetches `recipient_address` from `/api/user/pass-config`.
- **Skill file renamed**: `.claude/skills/otc-purchase-flow.md` → `.claude/skills/token-purchase-flow.md`. Updated content: removed OTC terminology, added course flow spec, added cross-product email trigger table.
- **Privacy policy** (`/privacidad`): "OTC (tokens o 1UP Pass)" → "tokens $1UP y 1UP Pass".
- **`CLAUDE.md`**: removed all OTC terminology; updated skill file reference.

### Delivered by
- Ekinoxis

---

## [2.19.0] — 2026-05-12

### Added

- **Admin sidebar — collapsible groups** (`src/components/admin/AdminSidebar.tsx`): flat item list replaced with 5 collapsible groups (Sitio Web, Competiciones, Academia, 1UP Pass & Tokens, Sistema). Each group has an icon + chevron. The group containing the active route auto-expands on load. Dashboard stays pinned above all groups. Sidebar changed from `min-h-screen` to `h-screen` so `overflow-y-auto` now works and all items are reachable by scrolling.
- **`show_in_banner`, `website_url`, `sort_order` columns on `aliados`** (DB migration `consolidate_brand_logos_into_aliados`): aliados that should appear in the home marquee banner are flagged with `show_in_banner = true`. `website_url` makes the logo clickable. `sort_order` controls banner position.

### Changed

- **`brand_logos` table eliminated — consolidated into `aliados`**: all existing `brand_logos` rows migrated to `aliados` with `show_in_banner = true`. The `brand_logos` table is dropped. `BrandsBanner` now reads from `aliados WHERE show_in_banner = true AND is_active = true ORDER BY sort_order`.
- **`AdminAliadosClient`** (`src/components/admin/AdminAliadosClient.tsx`): rebuilt with two tabs — **Banner** (entries with `show_in_banner = true`, visual sponsors) and **API / Verificación** (entries without, integration partners). Modal now includes logo upload via `ImageUpload`, `website_url`, `sort_order`, and a "Mostrar en banner del home" checkbox. API fields (NIT, email, api_url, api_key) remain optional.
- **`/api/admin/aliados`**: added GET endpoint (admin-auth); POST/PUT/DELETE updated with the three new fields.
- **Admin sidebar — Masters moved to Academia group**, Aliados moved from Sistema to Sitio Web.
- **`/admin/brand-logos`**: redirects to `/admin/aliados`. `/api/admin/brand-logos`: returns 410 Gone.
- **CommunitySection** (`src/components/home/CommunitySection.tsx`): removed colored brand background (`bg-[#5865F2]` / `bg-[#25D366]`) from Discord/WhatsApp icons — PNGs now render directly without a wrapper div.

### Removed

- `brand_logos` Supabase table (data migrated to `aliados`).
- `AdminBrandLogosClient` component (dead code — page now redirects).
- `"brand-logos"` from `ImageFolder` union type (`src/lib/blob.ts`), `ALLOWED_FOLDERS` in upload route, and `ImageUpload` prop type.
- `BrandLogo` type export from `database.types.ts`.

### Delivered by
- Ekinoxis

---

## [2.18.0] — 2026-05-12

### Added

- **Paginated transaction history in wallet tab** (`src/components/perfil/WalletTab.tsx`): replaces the multi-column grid with a single-column list paginated at 10 items per page. ANTERIOR / SIGUIENTE buttons with a "X / Y" counter appear only when there are more than 10 transactions. Page resets to 0 on every fresh Blockscout fetch. Transaction dates now display in `America/Bogota` timezone.

### Delivered by
- Ekinoxis

---

## [2.17.1] — 2026-05-12

### Fixed

- **MAX button balance in wallet send modal** (`src/components/perfil/WalletTab.tsx`): `use1upBalance` formats balance with `toLocaleString("en-US")` producing `"1,234.56"`. A `type=number` input rejects comma-separated strings so the field stayed blank. `parseFloat("1,234.56")` also silently returns `1` (stops at the comma), making `maxSendAmount` wrong. Both usages now strip commas before using the value programmatically; the display label still shows the friendly formatted number.

### Delivered by
- Ekinoxis

---

## [2.17.0] — 2026-05-12

### Added

- **"Únete a nuestra comunidad" section** (`src/components/home/CommunitySection.tsx`): new Server Component that reads `social_links` filtering for `platform IN ('discord', 'whatsapp')` where `is_active = true`. Renders bold community invite cards (brand PNG icons from `/public/socialmedia/`, platform accent colors) with tagline and call-to-action. Placed after `TorneosSection` on the home page and after `MasterGrid` on the Academia page. Returns `null` silently when no community links are active, so no admin setup is required.
- **Discord + WhatsApp rows in `social_links`** (inserted via Supabase MCP): `discord` (sort_order 7) and `whatsapp` (sort_order 8) pointing to the official 1UP community invites. Managed entirely from the existing Admin → Redes Sociales panel.
- **`COMMUNITY_PLATFORMS` constant + `CommunityPlatform` type** (`src/lib/socialIcons.ts`): `["discord", "whatsapp"]` — used as the source-of-truth filter for both `CommunitySection` and the Footer exclusion.
- **`SOCIAL_LABEL` extended** (`src/lib/socialIcons.ts`): added `discord: "Discord"` and `whatsapp: "WhatsApp"` entries.

### Changed

- **Footer** (`src/components/layout/Footer.tsx`): community platforms (`discord`, `whatsapp`) are now filtered out of the social icon row via `.not("platform", "in", ...)`. They belong in the CommunitySection invite cards, not the generic footer icon strip.
- **`SOCIAL_ICON` map extended** (`src/lib/socialIcons.ts`): added explicit `discord` and `whatsapp` entries pointing to `/public/socialmedia/discord.png` and `/public/socialmedia/whatsapp.png`. Both PNGs are now committed to the repo. Without explicit entries, components like `MasterCard` and `PlayerCard` that use `SOCIAL_ICON[platform]` with no fallback would render a broken `src={undefined}`.

### Delivered by
- Ekinoxis

---

## [2.16.1] — 2026-05-12

### Changed

- **Send amount limits in wallet tab** (`src/components/perfil/WalletTab.tsx`): `handleSend` now enforces a minimum of 1 $1UP and a maximum equal to the user's live balance. Invalid amounts show Spanish error messages. The amount input carries `min` / `max` HTML attributes, a "MAX" shortcut button autofills the full balance, and a hint line shows both bounds ("Mínimo 1 $1UP · Máximo X $1UP").

### Delivered by
- Ekinoxis

---

## [2.16.0] — 2026-05-12

### Added

- **Prize delivery panel for tournament results** (`src/components/admin/AdminTournamentResultsClient.tsx`): a new "Entregar Premios" section appears below the podium editor whenever a selected tournament has results. For each podium row the admin sees the configured prize (tokens / COP / both), the winner's lookup wallet, the current delivery status badge (`SIN PREMIO` / `PENDIENTE` / `ENTREGADO`), and either an inline **ENVIAR $1UP** flow (uses `useSendTransaction` + `sponsor: true`, waits for receipt, auto-PATCHes the result with `tx_hash`) or a **comprobante upload** for COP payouts. Once delivered, basescan and comprobante links appear next to the status badge.
- **`prize_delivery_status` enum + 5 columns on `tournament_results`** (migration `add_prize_delivery_to_tournament_results`): enum values `no_prize | pending | sent`; adds `prize_status`, `prize_tx_hash`, `prize_sent_at`, `prize_sent_by`, `prize_comprobante_url`. Existing results are backfilled — `pending` if a matching `tournament_prizes` row exists for that position, else `no_prize`. New POST/upsert auto-derives the initial status from the live prize configuration.
- **`PATCH /api/admin/tournament-results`**: marks a result as delivered. Requires `tx_hash` OR `comprobante_url` when `prizeStatus === 'sent'`; sets `prize_sent_at = now()` and `prize_sent_by = admin email`. Clears the timestamp/hash/url fields when reverting to `pending` or `no_prize`.
- **`GET /api/admin/tournament-results?walletFor={userProfileId}`**: lightweight lookup endpoint — returns the user's most recent wallet from `pass_orders`, falling back to `token_purchase_orders`. Used by the delivery panel to populate the recipient address.
- **`tournament-prizes` upload folder** (`src/app/api/admin/upload/route.ts`, `src/lib/blob.ts`): new allowed folder for COP comprobante uploads. The upload route now accepts `application/pdf` when the folder is `tournament-prizes` (still rejects PDFs for image folders), 5MB cap unchanged. Storage path: `tournament-prizes/{resultId}/cover`.
- **Tournament cancellation flow** (`src/components/admin/AdminTorneosClient.tsx`, `src/app/api/admin/tournaments/route.ts`): new `block` icon button next to delete (only visible while the tournament is not yet `completed`). Opens a confirmation panel showing the active registration count; on confirm calls `PUT /api/admin/tournaments` with `cancelTournament: true`, which marks `status='completed'` + `is_registration_open=false` and bulk-updates all `registered` rows in `tournament_registrations` to `cancelled` with `cancelled_at=now()`. Tournament + its history are preserved.
- **Tournament deletion safety modal** (`src/components/admin/AdminTorneosClient.tsx`): the trash icon no longer fires a bare `confirm()`. It now opens a confirmation panel that fetches the active registration count for the tournament and shows a warning. Two clearly labeled buttons (`CANCELAR` and `ELIMINAR`) plus an explicit nudge pointing admins to the softer `CANCELAR TORNEO` action when applicable.

### Changed

- **`PUT /api/admin/tournaments`**: now accepts an optional `cancelTournament: boolean` body field. When `true`, the tournament is updated as part of the cancellation flow (forces `is_registration_open=false`, skips the prize-rewrite branch) and every active registration is moved to `cancelled`.
- **`src/types/database.types.ts`**: `tournament_results` Row/Insert/Update extended with the 5 new prize-delivery fields, `Enums.prize_delivery_status` added, `PrizeDeliveryStatus` alias exported, and `Constants` updated.

### Delivered by
- Ekinoxis

---

## [2.15.0] — 2026-05-12

### Added

- **1UP Pass calendar UI** (`src/components/perfil/PassCalendar.tsx`): new 12-month calendar (3 past + current + 8 ahead) on the pass page. Each day cell is colored by coverage — full `primary-container` for active/future days, muted for past history, empty for uncovered days. Today always has a visible ring indicator. Shows current month with an outline highlight.
- **Redesigned pass status panel** (`src/components/perfil/PassPurchasePanel.tsx`): new status bar showing `ACTIVO / EXPIRADO / SIN PASS` badge, days remaining, and exact coverage-until date. CTA button text adapts — "RENOVAR", "REACTIVAR", or "ACTIVAR" depending on state. Order history now inline (no extra fetch) since all orders are fetched once and shared.
- **`pass_status` column on `user_profiles`** (migration `add_pass_status_to_user_profiles`): DB-level enum `pass_status_enum ('never' | 'active' | 'expired')` stored on each user profile. Auto-maintained by trigger `trg_sync_pass_status` on every `pass_orders` INSERT/UPDATE. Existing users backfilled at migration time.
- **Nightly expiry cron** (migration `schedule_pass_status_nightly_expiry`): `pg_cron` job runs at 04:00 UTC daily to flip `active → expired` for users whose last pass has lapsed. Covers the time-based transition that the trigger alone cannot catch.
- **`PassStatusEnum` type export** (`src/types/database.types.ts`): `pass_status_enum` added to Enums, `user_profiles` Row/Insert/Update updated, `PassStatusEnum` alias exported.

### Delivered by
- Ekinoxis

---

## [2.14.2] — 2026-05-11

### Added

- **Calendar file (.ics) in registration email** (`src/lib/email.ts`): tournament registration confirmation email now includes an `.ics` attachment — Gmail, Outlook, and Apple Mail surface a native "Add to Calendar" prompt. Built with `buildIcsContent()` from `calendar.ts` and attached via Resend `attachments` with `content-type: text/calendar; charset=utf-8; method=PUBLISH`.
- **CalendarPromptModal after registration** (`src/components/torneos/RegisterButton.tsx`): after a successful (or already-registered 409) registration, a modal appears with a "AÑADIR A GOOGLE CALENDAR" button and a prompt to check email for the calendar file. Previously the modal only showed on fresh registration.

### Changed

- **Tournament registration email** (`src/lib/email.ts`): enriched with full tournament data — game name, date + time, location label with full address for presencial events, prize podium (🥇🥈🥉 with token/COP amounts), description block, "VER TORNEO →" CTA linking to the detail page, and "AÑADIR A GOOGLE CALENDAR" button. Admin notification email added for every new registration (sends to `ADMIN_NOTIFICATION_EMAIL`).
- **Tournament registration API** (`src/app/api/user/tournament-registrations/route.ts`): expands the post-registration tournament query to include `games(name)`, `tournament_prizes(*)`, `description`, and `max_participants` so the email function receives the full dataset.

### Delivered by
- Ekinoxis

---

## [2.14.1] — 2026-05-11

### Fixed

- **Tournament card navigation** (`src/components/torneos/TorneosClient.tsx`): cover image, title, and "VER MÁS" on list cards now link to `/torneos/[id]` instead of opening a detail modal. Gives users a shareable, navigable detail page for each tournament.
- **RegisterButton — removed `pendingRef` auto-register** (`src/components/torneos/RegisterButton.tsx`): the `pendingRef` trick was silently broken for Google/email magic-link auth because those flows navigate the page away, destroying the ref before the effect could fire. Removed entirely.
- **RegisterButton — compact card (unauthenticated)**: `login()` on the list page is replaced by a `<Link>` to `/torneos/[id]`. Users land on the detail page where the full auth flow applies.
- **RegisterButton — detail page (unauthenticated)**: "INGRESAR PARA INSCRIBIRSE" now navigates to `app.1upesports.org/login?redirect=https://1upesports.org/torneos/[id]`. Login happens on the app subdomain (already configured in Privy), then `safeRedirectTarget` returns the user to the exact tournament page. Privy session is shared cross-subdomain at the app-ID level via secure iframe.
- **RegisterButton — `CARGANDO...` state**: button text now shows `CARGANDO...` while Privy is initializing (`!ready`) instead of silently appearing disabled/dead.
- **RegisterButton — 404 error message**: missing profile now shows `"Completa tu perfil en la app para inscribirte."` instead of a raw API error string.
- **RegisterButton — `onRegistered` callback**: list page `TorneosClient` now passes `onRegistered` to each card's `RegisterButton`, updating `registeredIds` immediately after a successful registration so the card shows INSCRITO without a page refresh.
- **Privy dashboard configuration**: added `https://1upesports.org` to Allowed Domains and Allowed OAuth Redirect URLs so the Privy SDK initializes correctly on the main site.

### Delivered by
- Ekinoxis

---

## [2.14.0] — 2026-05-11

### Added

- **AcademiaSection** (`src/components/home/AcademiaSection.tsx`): new home section — pink accent, 3 feature tiles (cursos técnicos, mentalidad pro, coaches certificados), "VER CURSOS →" CTA to `/academia`.
- **TorneosSection** (`src/components/home/TorneosSection.tsx`): new home section — secondary blue accent, 3 feature tiles (premios $1UP, recompensas token, ranking oficial), "VER TORNEOS →" CTA to `/torneos`.
- **`JuegosDisplay` `hideHero` prop**: hero section is now conditional; pass `hideHero` to suppress it when embedding inside another page.
- **PassSection on Tower page** (`/gaming-tower`): 1UP Pass benefits now render below the hero on the Tower page (same component used on home).
- **MobileBottomNav PERFIL tab**: 5th tab is now always visible (PERFIL icon + label); links authenticated users to the app subdomain, unauthenticated to `APP_URL/login`. External `<a>` tag for cross-subdomain navigation.
- **AdminSidebar logout button**: "Cerrar Sesión" button at the bottom of the nav — calls Privy `logout()` then redirects to `ADMIN_URL/login`.
- **RecruitmentForm on Torneos page** (`/torneos`): recruitment form added below the tournament list; `source` union extended to include `"torneos"`.

### Changed

- **Home page sections reordered**: Hero → BrandsBanner → PassSection → **AcademiaSection** → **TorneosSection** → MarketplaceSection → TalentPipeline → RecruitmentForm. GamesGallery removed from home (games now live on Tower page).
- **TalentPipeline heading**: renamed from "Talent Pipeline" to "Sobre Nosotros / NUESTRO ECOSISTEMA" — frames the three pillars (Recreativo, Academia, Torneos) as an ecosystem explanation rather than a talent funnel.
- **Tower page games**: `GamesGallery` replaced by `JuegosDisplay hideHero` — displays games with the per-category layout (category image + game cards grid) matching the standalone `/juegos` design.
- **`/team` page**: removed roster/recruitment content; now `redirect("/")`. Masters on `/academia` and recruitment on `/torneos` cover both concerns.
- **`/juegos` page**: removed standalone games showcase; now `redirect("/gaming-tower")`. Games live on Tower page.
- **Sitemap** (`src/app/sitemap.ts`): removed `/team` and `/juegos` entries.
- **HeroHome**: removed "VER EQUIPO" button — only "CONOCE LA TORRE" CTA remains.
- **Marketplace page** (`/marketplace`): dynamic social links — reads `social_links` from DB, renders platform icons with `brightness-0 invert` styling on the pink accent card.
- **Footer** (`src/components/layout/Footer.tsx`): removed "Admin" link — admins access the panel directly via `admin.1upesports.org`.
- **TopAppBar** (`src/components/layout/TopAppBar.tsx`): removed admin panel icon and `ADMIN_URL` constant.
- **BrandsBanner** sparse-logo fix: uses `Math.ceil(6 / logos.length)` multiplier before doubling the track so the marquee animation looks correct even with a single logo.

### Fixed

- **RegisterButton cross-subdomain auth bug** (`src/components/torneos/RegisterButton.tsx`): button was broken for users coming from `1upesports.org` because redirecting to `app.1upesports.org/login` created a different Privy session. Fix: uses inline `login()` modal (same domain), `pendingRegister` flag, and a `useEffect` that auto-completes registration after `authenticated` flips to `true`.
- **RegisterButton stuck loading**: missing `try/catch` left `loading=true` on network errors. Both auth flows now wrap the API call in try/catch with `setLoading(false)` in the catch block.
- **RegisterButton detail page always showing REGISTRARME**: `useState(isRegistered)` only reads the prop on mount; detail page always passed `false`. Fixed with a sync `useEffect` for prop changes and a check-on-auth `useEffect` that fetches `/api/user/tournament-registrations` when `authenticated` becomes true.

### Delivered by
- Ekinoxis

---

## [2.13.0] — 2026-05-11

### Added

- **Tournament detail pages (`/torneos/[id]`)**: dedicated Server Component page per tournament — cover image, status/game/location badges, title, date, description, prize podium (`PrizePodium`), and `RegisterButton` CTA. `generateMetadata` with per-tournament OG image. `notFound()` on inactive or missing tournament.
- **Smooth login redirect flow**: `RegisterButton` now encodes the tournament detail URL as `?redirect=` and sends unauthenticated users to `app/login`. Login page uses `safeRedirectTarget()` (origin allowlist against `NEXT_PUBLIC_BASE_URL`) and redirects back to the tournament after auth. Prevents open redirects.
- **`/app/mis-torneos` tab**: new app section listing the authenticated user's tournament registrations — cover image, game badge, status badge (INSCRITO/ASISTIÓ/CANCELADO/NO ASISTIÓ), location icon, name, date. Each card links to the tournament detail page. Empty state includes CTA to `/torneos`.
- **Ajustes consolidation (`/app/ajustes`)**: merged Identidad and Settings into a single page with two tabs — IDENTIDAD (profile data) and SEGURIDAD (linked accounts). `/app/identidad` and `/app/settings` now redirect to `/app/ajustes` to preserve bookmarks.
- **QR check-in flow**: admin can generate a QR code per tournament (button in `/admin/torneos`) that encodes `/torneos/[id]/checkin`. Participants scan it → public check-in page authenticates inline via `usePrivy().login()` (no redirect), verifies registration, and calls `POST /api/user/tournament-checkin` to mark status as `attended`.
- **`POST /api/user/tournament-checkin`**: validates tournament is `live`, finds a `registered` registration for the user, updates status to `attended`, and revalidates `/admin/tournament-registrations`.
- **HallOfFame relocated**: "Torneos ganados por el 1UP Team" section moved from `/team` to the bottom of `/torneos` for contextual relevance.
- **`react-qr-code`**: added as dependency; used as default export `QRCode` in `AdminTorneosClient` for QR modal.

### Changed

- AppSidebar + AppBottomNav: removed `/app/identidad` entry; updated `/app/settings` → `/app/ajustes`; added "Torneos" nav entry (`emoji_events`) between Academia and Ajustes.
- `/app/(main)/team/page.tsx`: removed `allCompetitions` query and `HallOfFame` render (moved to `/torneos`).
- `HallOfFame` component heading changed to "TORNEOS GANADOS POR EL 1UP TEAM" with left-aligned layout matching the torneos page style.

### Delivered by
- Ekinoxis

---

## [2.12.0] — 2026-05-11

### Added

- **Full SEO pass — all public pages**: every `(main)` route now exports a typed `Metadata` object with `title`, `description`, `keywords`, `openGraph` (url, title, description, images), `twitter` (card, title, description), and `alternates.canonical`. Pages covered: home, torneos, gaming-tower, academia, team, juegos, recreativo, marketplace.
- **JSON-LD structured data**: `SportsActivityLocation` (LocalBusiness) on home page; `SportsEvent` per upcoming/live tournament on `/torneos` — enables Google rich results.
- **`src/app/sitemap.ts`**: Next.js native sitemap generator — auto-served at `/sitemap.xml`. All public routes listed with priority and change frequency calibrated per content type (torneos = daily, academia/home = weekly, static = monthly, legal = yearly).
- **`src/app/robots.ts`**: Next.js native robots.txt — allows crawlers on all public routes, disallows `/admin/`, `/app/`, `/api/`.
- **`.claude/skills/seo.md`**: new skill documenting the metadata pattern, JSON-LD approach, sitemap/robots conventions, keyword strategy and checklist for future pages.

### Delivered by
- Ekinoxis

---

## [2.11.0] — 2026-05-10

### Added

- **PWA support**: `public/manifest.json` (name, short_name, icons, theme `#e91e8c`, `display: standalone`, shortcuts to Wallet/Torneos/Academia); `public/sw.js` (install → cache /offline + /1up.png; fetch → offline fallback on navigation); `ServiceWorkerRegister` client component registered in root layout; `src/app/offline/page.tsx` branded offline fallback.
- **Admin mobile drawer**: `AdminSidebar` is now a slide-in drawer on mobile (≤ md). Fixed top bar `h-14` with hamburger, close on route change (`useEffect([pathname])`), backdrop tap-to-close, `translate-x` transition.
- **Admin main padding**: `pt-20 md:pt-10` on all admin `<main>` elements to clear the mobile top bar.
- **`.claude/skills/mobile-responsive.md`**: skill documenting touch targets (44px), table→card stacks, modal sheet pattern, iOS input zoom (`text-base`), safe-area insets, PWA notes, breakpoints.

### Changed

- Root layout `metadata`: added `manifest: "/manifest.json"`, `theme-color`, `apple-mobile-web-app-*`, and `viewport-fit=cover` meta tags.

### Delivered by
- Ekinoxis

---

## [2.10.0] — 2026-05-10

### Added

- **Masters merged into Academia**: `/academia` now renders the full master profiles section (photo, bio, social links, topics, courses per master) below the course catalog using the existing `MasterGrid` component. `/masters` route deleted. Nav entry for Masters removed from TopAppBar and MobileBottomNav.
- **Cédula de ciudadanía mandatory**: `numero_documento` is now required in the onboarding wizard. `step3Valid` enforces non-empty doc number; label updated from "(opcional)" to "*"; submit always sends `tipoDocumento` + `numeroDocumento`.

### Fixed

- **Pass purchase email `userName`**: both token-path and bank-path pass order emails now send the user's actual full name (`nombre + apellidos`) instead of the raw email address.

### Delivered by
- Ekinoxis

---

## [2.9.0] — 2026-05-10

### Added

- **Torneos Internacionales**: new `international_tournaments` table (separate from local tournaments — no prizes, no registrations, no capacity). Public section "TORNEOS INTERNACIONALES" on `/torneos`. External registration link opens in new tab.
- **`AdminTorneosIntlClient`**: full CRUD admin panel at `/admin/torneos-internacionales` — fields: name, organizer, game, country, city, date, registration link, description, image, sort order, active flag.
- **`IntlTournamentCard`**: public card component — country/city badge, organizer, game, date, "VER INSCRIPCIÓN" external link. No registration flow (different lifecycle than local tournaments).
- **Hall of Fame (v2.8.0)**: `tournament_results` table stores 1°/2°/3° podium per tournament with points (10/5/3 default). PostgreSQL `hall_of_fame` VIEW aggregates gold/silver/bronze counts and total points, ordered by points then golds.
- **`HallOfFameSection`**: Server Component rendering the live leaderboard from the `hall_of_fame` view. Rendered at the top of `/torneos`. Shows rank, player name, medal counts, points. Returns null when no data (clean empty state).
- **`AdminTournamentResultsClient`** at `/admin/tournament-results`: select a completed/live tournament → see its registered attendees → assign 1°/2°/3° positions from a dropdown. Saves via `/api/admin/tournament-results` (POST upserts by tournament+position). Points are pre-filled (10/5/3) with optional override. Shows existing results panel alongside with delete action.
- **`src/lib/tournamentPoints.ts`**: `POINTS_BY_POSITION` constant and `pointsFor(position)` helper.
- Admin sidebar: "Intl. Torneos" (`public` icon) and "Hall of Fame" (`leaderboard` icon) added.

### Changed

- `/torneos` page: now fetches international tournaments in parallel and renders `HallOfFameSection` above `TorneosClient`.
- `TorneosClient`: accepts `intlTournaments` prop; renders dedicated "TORNEOS INTERNACIONALES" section after historial.

### Delivered by
- Ekinoxis

---

## [2.8.0] — 2026-05-10

### Added

- **Tournament registrations**: new `tournament_registrations` table with status lifecycle (`registered → attended / no_show / cancelled`). Capacity check and uniqueness enforced atomically via PostgreSQL RPC `register_for_tournament` — no TOCTOU race on concurrent registrations.
- **`RegisterButton`**: client component on each tournament card and detail modal. Unauthenticated users are sent to `/app/login`; logged-in users register in one click; already-registered state shows "INSCRITO" badge.
- **`CalendarPromptModal`**: appears after successful registration — "AÑADIR A GOOGLE CALENDAR" (opens pre-filled URL) or "DESCARGAR .ICS" (Apple/Outlook). Closes on "Ahora no" or backdrop click.
- **`src/lib/calendar.ts`**: `buildGoogleCalendarUrl` and `buildIcsContent` — pure functions, UTC timestamps, 2h default duration.
- **Registration email**: `sendTournamentRegistrationEmail` in `src/lib/email.ts` — sent to user on successful registration with tournament details and Google Calendar CTA.
- **`/api/user/tournament-registrations`**: POST (register via RPC), GET (user's active registrations), DELETE (cancel — sets `cancelled_at`).
- **`/api/admin/tournament-registrations`**: GET (list all with filters by tournament), PATCH (mark attended / no_show).
- **`/admin/tournament-registrations`**: admin panel listing all registrations with tournament + user details, filters by tournament and status, "ASISTIÓ / NO" action buttons, CSV export.
- Admin sidebar: "Inscripciones" entry (`how_to_reg` icon) added to Sitio Web group.
- **Registration status shown on cards**: `TorneosClient` fetches user's registered tournament IDs on mount when authenticated; passes `isRegistered` to cards and detail modal.

### Changed

- `TorneosClient`: adds Privy auth hook; fetches `/api/user/tournament-registrations` on mount when authenticated; passes `isRegistered` to `TorneoCard` and `TournamentDetailModal`.
- `TournamentDetailModal`: REGISTRARME CTA replaced with `<RegisterButton>`.
- `TorneoCard`: REGISTRARME link replaced with `<RegisterButton compact>` when registration is open.

### Delivered by
- Ekinoxis

---

## [2.7.1] — 2026-05-10

### Added

- **Tournament prize structure**: new `tournament_prizes` table (Supabase migration applied). Each tournament can define 1–3 prizes by position (1°/2°/3°) with type `tokens`, `cop`, or `both`. Amounts enforced by DB CHECK constraints.
- **`AdminTorneoPrizesEditor`**: inline prize editor inside the tournament modal — replaces the single "Premio (COP)" input.
- **`PrizeBadge`** / **`PrizePodium`**: compact card badge and full 🥇🥈🥉 podium view (used in the detail modal).
- **`TournamentDetailModal`**: full-screen detail modal showing cover, date/time, description, prize podium, CTA. Opened via "VER MÁS" button on each card.
- **`TorneosClient`**: client component owning filter state (month + game select) and modal open state.
- **Month + game filters** on `/torneos`: auto-derived from actual tournament data; "Limpiar" resets. Empty state adapts to filtered vs unfiltered.

### Changed

- `/torneos` slimmed to a thin Server Component feeding `TorneosClient`.
- Admin query and admin client updated to include `tournament_prizes(*)` join.
- Tournaments API POST/PUT persist prizes atomically (delete-then-insert). `prize_pool_cop` no longer written.
- Existing `prize_pool_cop` values backfilled into `tournament_prizes` as position-1 COP prizes.

### Delivered by
- Ekinoxis

---

## [2.7.0] — 2026-05-10

### Added

- **Masters + Academia unification**: Academia page now fetches active masters alongside courses. Each course card shows the master's avatar and name as a byline ("by [Name]"). New master filter pill row added below category tabs — click any master to filter only their courses; click again or "Todos los masters" to reset. Filters stack (category + master applied simultaneously).
- **1UP Pass sticky banner**: fixed bottom banner that appears 3 seconds after page load on every public page. Shows "Obtén tu 1UP PASS" with a brief benefit description and a "VER PASS" CTA linking to `/app/pass`. Dismissable via X button; state stored in `sessionStorage` so it stays hidden for the rest of the session. On mobile it floats above the bottom nav.

### Changed

- **`CourseCatalog`**: accepts new `masters` prop (`{ id, name, photo_url }[]`). Builds an internal master lookup map for efficient byline rendering. Visible courses now filtered by both category and master simultaneously.
- **`/academia` page**: added `masters` to the parallel data fetch; passes it to `CourseCatalog`.
- **`(main)` layout**: `PassSuggestionBanner` added as a fixed overlay — no layout shift, always on top of `MobileBottomNav`.

### Delivered by
- Ekinoxis

---

## [2.6.0] — 2026-05-10

### Added

- **Public `/torneos` page**: tournament list grouped into "Próximos Torneos" (upcoming + live) and "Historial" (completed). Each card shows cover image, game name, status badge (animated pulse when live), location badge (Presencial/Online/Mixto), date, prize pool in COP, max participants, description excerpt, and a "REGISTRARME" CTA when registration is open. Empty state with "Próximamente" copy shown when no active tournaments exist.
- **Admin `/admin/torneos`**: full CRUD table with image upload, game dropdown (FK to `games`), date/time picker, status selector, location type, prize pool COP, max participants, description, sort order, registration-open toggle, and active toggle.
- **`/api/admin/tournaments`** — GET (public, active only, joined with game name), POST/PUT/DELETE (admin-only). `revalidatePath("/torneos")` and `revalidatePath("/admin/torneos")` on every mutation.
- **`tournaments` DB table**: `id`, `name`, `game_id` (nullable FK → `games`), `date`, `prize_pool_cop`, `max_participants`, `status` (`upcoming`/`live`/`completed`), `location_type` (`presencial`/`online`/`mixto`), `image_url`, `description`, `is_active`, `is_registration_open`, `sort_order`, `created_at`. Migration applied via Supabase MCP.
- **Admin sidebar**: "Torneos" entry added to "Sitio Web" group.
- **`blob.ts` + upload route + `ImageUpload`**: `"tournaments"` folder added.
- **`database.types.ts`**: `tournaments` table definition + `Tournament` convenience type export.

### Delivered by
- Ekinoxis

---

## [2.5.0] — 2026-05-10

### Added

- **Brands Banner (home)**: infinite animated marquee of partner/brand logos, rendered between Hero and Pass section. Logos managed via admin panel. Pauses on hover. White background with subtle top/bottom accent borders.
- **Marketplace section (home)**: teaser section with `id="marketplace"` for anchor linking. "PRÓXIMAMENTE" badge, headline, description, and 3 category tiles (Periféricos, Equipos, Accesorios). Scrollable from navbar.
- **Navbar — Marketplace link**: new `/#marketplace` anchor link added to `TopAppBar` NAV_LINKS so users can scroll directly from any page.
- **Admin — Logos Banner**: full CRUD panel at `/admin/brand-logos`. Supports image upload (PNG/SVG with transparent background), website URL (optional, makes logo clickable), sort order, and active toggle. Images stored in Supabase Storage under `brand-logos/` folder.
- **`brand_logos` table**: new DB table (`id`, `name`, `logo_url`, `website_url`, `sort_order`, `is_active`, `created_at`). API at `/api/admin/brand-logos` (GET public, POST/PUT/DELETE admin-only). `revalidatePath("/")` and `revalidatePath("/admin/brand-logos")` on every mutation.
- **Admin sidebar**: "Logos Banner" entry added to the "Sitio Web" group.
- **CSS marquee animation**: `@keyframes marquee-scroll` + `.animate-marquee` utility class added to `globals.css`.

### Changed

- **`src/lib/blob.ts`**: `"brand-logos"` added to `ImageFolder` type union.
- **`/api/admin/upload`**: `"brand-logos"` added to `ALLOWED_FOLDERS`.
- **`ImageUpload` component**: `"brand-logos"` added to `folder` prop type.

### Requires

- DB migration: `CREATE TABLE brand_logos (...)` — see migration SQL below or in the admin setup guide.

### Delivered by
- Ekinoxis

---

## [2.4.0] — 2026-05-10

### Changed

- **Navbar — reorder**: "Academia" moved to second position (right after "Home") so it's closer to the left edge and easier to find.
- **Navbar — remove logo redundancy**: text "1UP" next to the logo image removed. Logo image slightly enlarged to 44px. The image already conveys the brand; the duplicate text was noise.
- **Navbar — JOIN NOW button hover**: removed `active:scale-95` (felt like hold-on-click on mobile); hover now turns blue (`bg-secondary` + `neo-shadow-blue`) instead of pink for clear immediate feedback.
- **Header transparency**: `glass-panel` opacity raised from 0.60 → 0.85 so the nav is consistently readable across all pages regardless of the background content behind it.
- **Talent Pipeline section**: removed the step numbers (01–04) from the cards. Removed the "TRAINING" card entirely. Renamed "TORNEOS MUNDIALES" → "TORNEOS" with href `/torneos` (ready for the upcoming tournaments page). Updated description for the Torneos card. Grid changed from 4-col to 3-col to match the reduced card count.
- **1UP Pass heading**: enlarged from `text-6xl` to `text-7xl`, unified to a single line ("1UP PASS" instead of two-line split).

### Delivered by
- Ekinoxis

---

## [2.3.1] — 2026-05-10

### Fixed

- **Subdomain routing confirmed working via Next.js 16 native `proxy.ts`** — Next.js 16 picks up `src/proxy.ts` automatically as its proxy/middleware layer (replaces `middleware.ts`). Confirmed build output shows `ƒ Proxy (Middleware)` — subdomain rewrites for `app.1upesports.org → /app` and `admin.1upesports.org → /admin` are active.
- **WalletTab: wallet stuck initializing for new users** — Privy creates the embedded wallet during the login modal, but the `onboarding` redirect interrupts that flow before the wallet is fully connected in the browser session. Fixed with a three-stage recovery: (1) "Inicializando wallet…" spinner while Privy connects; (2) after 5s, automatically calls `createWallet({ createAdditional: false })` to handle the interrupted creation case; (3) after 15s, shows an error state with a "Recargar" button instead of an infinite spinner. Tightened `walletLoading` condition from `wallets.length === 0` to `!walletAddress` for correctness.
- **WalletTab: dead code cleanup** — removed unused `user`, `userEmail`, `googleAccount`, and `emailAccount` variables that were left behind from a previous refactor. These were causing TypeScript warnings.

### Delivered by
- Ekinoxis

---

## [2.3.0] — 2026-05-06

### Added

- **1UP Pass — bank transfer payment method** — users can now pay for the 1UP Pass via bank transfer in addition to $1UP tokens. New two-button selector on `PassPurchasePanel` ("Pagar con $1UP" / "Pagar con Banco"). New `BuyPassBankWizard.tsx` (4 steps: summary → bank details with copy-to-clipboard → comprobante upload → success screen). Admin approves/rejects from a dedicated page.
  - `pass_orders` table extended: `tx_hash` made nullable, new columns `payment_method` (token|bank), `bank_account_id` FK, `comprobante_url`, `rejection_reason`; new enum value `pending_bank`.
  - `POST /api/user/pass-orders` — detects `paymentMethod: "bank"` and routes to `handleBankOrder()`, which creates a `pending_bank` order and moves the comprobante via `moveComprobanteToOrder`.
  - `PATCH /api/admin/pass-orders` — new `action: "approve" | "reject"` param: approve calculates expiry with stacking from any active pass; reject records reason.
  - `/admin/pass-bank-orders` — new admin page + `AdminPassBankOrdersClient.tsx`: lists bank transfer pass orders with inline approve/reject panel (notes + rejection reason fields). Added to admin sidebar under Finanzas.
  - `database.types.ts` updated: nullable `tx_hash`, new columns, `pending_bank` enum value, `bank_accounts` relationship on `pass_orders`.

- **1UP Pass section moved to Home** — `PassSection` now renders on the home page (`/`) right after `<HeroHome>`, instead of at the bottom of the Gaming Tower page. Expanded with a "¿Cómo obtener tu 1UP Pass?" two-column strip (Option A: tokens, Option B: bank transfer).

- **Privacy Policy page** — `/privacidad` — comprehensive 13-section policy covering: responsible party, legal framework (Ley 1581 / Decreto 1377), data collected (identity, financial, usage, technical), processing purposes, legal basis, data subject rights, third-party transfers, retention periods, security measures, minors (14+), cookies, changes, and contact. Link added to Footer.

- **Onboarding consent step** — `OnboardingWizard` now has Step 6 "Consentimiento". Users must tick the privacy checkbox (links to `/privacidad`) before submitting. Blocks submit when unchecked.

- **Email notifications (Resend)** — `src/lib/email.ts` with three fire-and-forget templates:
  - `sendTokenOrderEmails` — user + admin notified when a $1UP token purchase order is submitted.
  - `sendPassTokenEmails` — user + admin notified when a pass is purchased via $1UP (instantaneous confirmation).
  - `sendPassBankEmails` — user + admin notified when a bank-transfer pass request is submitted.
  - Hooked into `POST /api/user/token-orders` and `POST /api/user/pass-orders`. Never blocks the API response.
  - New env vars: `RESEND_API_KEY`, `ADMIN_NOTIFICATION_EMAIL`.

### Changed

- **Minimum age raised to 14** — both frontend (`OnboardingWizard.tsx`) and backend (`POST /api/user/onboarding`) now enforce a minimum age of 14 years (up from 5). Year input max and error messages updated accordingly.

### DB Migrations (applied via Supabase MCP)
- `pass_orders_bank_transfer_support` — `ALTER TYPE pass_order_status ADD VALUE 'pending_bank'; ALTER TABLE pass_orders ALTER COLUMN tx_hash DROP NOT NULL; ADD COLUMN payment_method text NOT NULL DEFAULT 'token'; ADD COLUMN bank_account_id integer REFERENCES bank_accounts(id); ADD COLUMN comprobante_url text; ADD COLUMN rejection_reason text;`

---

## [2.2.3] — 2026-04-26

### Changed
- **Wallet page — layout redesign** — transaction history moved above the balance card (both full-width, stacked). History tiles render in a responsive grid (1 → 2 → 3 cols) instead of a narrow side column.
- **Admin courses — merged content management** — `AdminAcademiaContentClient` folded into `AdminCoursesClient`. Opening a course now shows a two-section panel: course settings on top + inline content list (sorted by order) below, with a content sub-modal (z-60) for add/edit. New "Contenido" count badge added to the course table row. "Contenido" link removed from the admin sidebar.
  - `courses/page.tsx` now fetches `academia_content` and passes it as `content` prop.
  - `AdminSidebar.tsx` — removed `/admin/academia-content` nav item.

---

## [2.2.2] — 2026-04-26

### Changed
- **Wallet — removed promo banner** — "LEVEL UP YOUR EXPERIENCE / PRÓXIMAMENTE" block removed from `WalletTab.tsx`.
- **Wallet — tx history fixed** — Blockscout API call had an invalid `limit` query param that caused the endpoint to return an error (no `items`), leaving history always empty. Removed `&limit=15`; API now returns results correctly.
- **Admin token orders — gas sponsored** — `AdminTokenOrdersClient.tsx` `handleSendApprove` now passes `sponsor: true`, consistent with user-side sends. Admin embedded wallet shares the same Privy app and TEE infrastructure.

---

## [2.2.1] — 2026-04-26

### Changed
- **Gas sponsorship for all user $1UP sends** — both `WalletTab.tsx` (send modal) and `BuyPassWizard.tsx` (pass purchase) now pass `sponsor: true` to `useSendTransaction`. Privy upgrades the embedded wallet via EIP-7702 in-place (same address, no migration) and covers gas via its paymaster, so users with 0 ETH can transact. Requires gas sponsorship enabled for Base in the Privy Dashboard and TEE execution active.
  - `WalletTab.tsx`: replaced raw `walletClient.writeContract` with `useSendTransaction` + `encodeFunctionData`; removed `createWalletClient`, `custom`, and `viem/chains` `base` imports.
  - `BuyPassWizard.tsx`: added `sponsor: true` to the existing `sendTransaction` call.
  - `.claude/skills/pass-purchase-flow.md`: updated code snippet and added gas sponsorship context note.
- **Wallet balance — 1UP as Basescan hyperlink** — the `1UP` label beside the balance BigNumber is now an `<a>` tag linking to the token on Basescan. Hover turns `text-primary-container`.
- **Wallet card — removed Red Base L2 badge and contract row** — the "RED / Base — L2" network chip and the "CONTRATO:" truncated address link have been removed from the balance card for a cleaner UI.

---

## [2.2.0] — 2026-04-26

### Added
- **Admin users table — sort & game filter** — `/admin/privy-users` table now supports client-side sorting by $1UP balance (↑/↓), name (A–Z), and registration date (newest/oldest), plus multi-select game filter pills derived from users' `game_ids`. Sort defaults to $1UP descending. Filter is OR-logic (shows users who play any selected game). Count badge reflects combined search + game filter result.
  - `AdminPrivyUsersClient.tsx` — `SortKey` type, `SORT_OPTIONS`, `tokenBigInt` helper (BigInt comparison for wei strings), `allGames` derived from user data, `gameFilter` state, sort/filter row UI.
- **Referral code in Identidad** — users who skipped the referral code during onboarding can now add it later on `/app/identidad`. Existing code is shown as a read-only green pill (locked, one-time only). New section added at the bottom of the page.
  - `IdentidadTab.tsx` — `referralInput`, `referralStatus`, debounced live validation (600ms), save button enabled only when code is `"valid"`.
  - `PUT /api/user/profile` — now accepts `referralCode`; guards against overwriting an existing code; validates against `referral_codes` table and increments `used_count`.

### Changed
- **Birth date** — replaced `birth_year` (integer) with `birth_date` (full DATE: YYYY-MM-DD). Onboarding wizard and Identidad page now show a 3-column day/month/year picker with real calendar validation (round-trip Date check) and age preview. Minimum age 5 years enforced on both frontend and backend.
  - `OnboardingWizard.tsx` — three separate states (`birthDay`, `birthMonth`, `birthYear`), `MONTHS` array, `calcAge` helper, `birthDateStr` derived.
  - `IdentidadTab.tsx` — same 3-field picker; `fetchProfile` splits `birth_date` on `-` to pre-fill fields.
  - `POST /api/user/onboarding` — `parseBirthDate` validates YYYY-MM-DD format + real date + age.
  - `PUT /api/user/profile` — same validation; stores `birth_date`.
  - `database.types.ts` — `birth_date: string | null` replaces `birth_year: number | null` on Row/Insert/Update.
- **Referral code optional at onboarding** — step 5 of the wizard is no longer a hard gate. Users can skip it and add a code later via Identidad. `step5Valid` now passes when field is empty or valid (blocks only on `"invalid"` or `"checking"`). API skips validation entirely when no code is sent.
- **Base L2 as default Privy chain** — `PrivyClientProvider` now sets `defaultChain: base` and `supportedChains: [base]`. External wallets (MetaMask etc.) are automatically prompted to switch to Base on connect, preventing chain-mismatch errors when the admin sends $1UP from the approve modal.

### DB Migrations (applied via Supabase MCP)
- `birth_date_replace_birth_year` — `ALTER TABLE user_profiles RENAME COLUMN birth_year TO birth_date; ALTER TABLE user_profiles ALTER COLUMN birth_date TYPE DATE USING NULL; UPDATE ... SET birth_date = (birth_year::text || '-01-01')::date WHERE birth_year IS NOT NULL;` (best-effort backfill).

---

## [2.1.0] — 2026-04-26

### Changed
- **Admin approve $1UP orders** — replaced manual TX hash input with a live on-chain send flow. Admin modal now shows all connected Privy wallets (embedded + external), lets admin select which one to send from, encodes an ERC-20 `transfer` call via viem, submits via `useSendTransaction`, waits for Base L2 receipt, then auto-records the captured hash in the DB. Fallback: if receipt timeout, hash is shown so admin can approve manually.
  - `AdminTokenOrdersClient.tsx` — new `handleSendApprove`, wallet selector, send step indicator (`idle → sending → waiting → done`).

---

## [2.0.0] — 2026-04-26

### Added
- **Onboarding wizard** — mandatory 5-step flow for new users before they access any protected app page. Steps: nombre+apellidos → username+teléfono → barrio+año de nacimiento+documento → juegos favoritos → código de referido (required).
  - `/app/onboarding` — standalone branded page (no app shell), outside `(protected)` group to avoid circular redirect.
  - `OnboardingWizard` client component — live referral code validation (debounced 600ms), age calculation preview, game tiles multi-select, animated submit.
  - `POST /api/user/onboarding` — validates all required fields + referral code, upserts profile atomically, sets `onboarding_completed_at`, increments `referral_codes.used_count`.
  - `GET /api/user/referral-codes/validate?code=` — public endpoint for live code validation.
  - Onboarding gate in `app/(protected)/layout.tsx` — queries `onboarding_completed_at`; redirects unonboarded users to `/app/onboarding` before any protected page renders.
- **Referral codes** — admin-managed codes required at onboarding. Supports `max_uses` cap and `is_active` toggle.
  - `referral_codes` table: code (unique), description, is_active, max_uses, used_count.
  - `/admin/referral-codes` — admin CRUD: create codes with optional use limit, activate/deactivate inline, usage progress bar.
  - `GET|POST|PUT /api/admin/referral-codes` — isAdmin protected.
  - Admin sidebar — "Referidos" entry added to Sistema group.
- **New profile fields**: `barrio` (neighborhood) and `birth_year` (year of birth — displays calculated age). Both collected during onboarding and editable later on `/app/identidad`.
- **IdentidadTab** — new "Barrio y Edad" section for post-onboarding edits.

### Changed
- **`/api/user/profile` PUT** — now accepts `barrio` and `birthYear` fields.
- **`database.types.ts`** — updated `user_profiles` with `barrio`, `birth_year`, `onboarding_completed_at`, `referred_by_code`; added `referral_codes` table and `ReferralCode` alias.

### DB Migrations (applied via Supabase MCP)
- `create_referral_codes` — `referral_codes` table with 3 seed codes (1UP2024, EKINOXIS, GAMING).
- `add_onboarding_fields_to_user_profiles` — adds `barrio`, `birth_year`, `onboarding_completed_at`, `referred_by_code` to `user_profiles`; backfills `onboarding_completed_at = now()` for existing users with `nombre IS NOT NULL`.

---

## [1.9.1] — 2026-04-26

### Changed
- **Benefits CRUD consolidated into `/admin/1pass`** — add/edit/delete pass benefits now lives inline on the 1UP Pass admin page via a modal. Removes the need to navigate to a separate page.
- **Admin sidebar** — "Pass Benefits" link removed from "Academia & App" group. Benefits are managed from "1UP Pass".

---

## [1.9.0] — 2026-04-26

### Added
- **1UP Pass on-chain purchase flow** — users buy the 1UP Pass by sending $1UP tokens directly on Base mainnet. No discounts; full price only.
  - **`BuyPassWizard`** — single-confirm modal: user reviews price → Privy `useSendTransaction` encodes ERC20 transfer calldata → waits for `waitForTransactionReceipt` → POSTs confirmed tx hash to backend → shows expiry date.
  - **`MisPassOrders`** — compact history panel showing status (Activo/Expirado) and BaseScan link per order.
  - **`PassPurchasePanel`** — Client Component on `/app/pass` page: shows active pass with expiry, price info, "OBTENER / RENOVAR" button, benefits list, and order history.
  - **`AdminPassConfigCard`** — inline-edit card for price, recipient wallet, duration, and active toggle. Embedded in `/admin/1pass`.
  - **`AdminPassOrdersClient`** — admin table at `/admin/pass-orders` with KPIs (total, confirmed, active now, failed), filter pills, BaseScan TX link, active/expired badge, admin notes editor.
- **New tables**: `pass_config` (single-row: price_token, recipient_address, duration_days, is_active) · `pass_orders` (tx_hash unique, stacking expiry, block_number, verification_attempts).
- **New API routes**:
  - `GET  /api/user/pass-config` — public, returns price/recipient/duration
  - `GET  /api/admin/pass-config` · `PUT /api/admin/pass-config` — admin config CRUD
  - `GET  /api/user/pass-orders` — user's own orders
  - `POST /api/user/pass-orders` — verifies tx on-chain via `passVerifier.ts`, stacks expiry, inserts confirmed order
  - `GET  /api/admin/pass-orders` — admin list with user_profiles join; `?status=` filter
  - `PATCH /api/admin/pass-orders` — admin notes update
- **`src/lib/passVerifier.ts`** — server-side on-chain verification: `getTransactionReceipt` + `decodeEventLog` to confirm ERC20 Transfer(from, to, value ≥ expected).
- **Admin sidebar** — "Compras Pass" entry added to "Tokens $1UP" group.

### Changed
- **`/app/pass` page** — replaced placeholder with real `PassPurchasePanel` (Server Component fetches config + benefits, Client Component handles purchase).
- **`/admin/1pass` page** — replaced enrollment/discount sections with `AdminPassConfigCard` + live KPIs from `pass_orders`.
- **TypeScript types** — `database.types.ts` updated with `pass_config`, `pass_orders`, `pass_order_status` enum; new aliases `PassConfig`, `PassOrder`, `PassOrderStatus`.

---

## [1.8.0] — 2026-04-24

### Added
- **OTC $1UP purchase flow** — complete COP-based token buying system replacing the old Uniswap swap button.
  - **`BuyTokensWizard`** — 4-step modal: (1) Enter COP amount with live $1UP equivalent (rate: 1 $1UP = 1,000 COP), (2) Select active bank account with copy-to-clipboard, (3) Upload payment proof (comprobante — jpg/png/webp/pdf, max 5MB) + contact details, (4) Order confirmation with ID.
  - **`MisOrdenes`** — panel below wallet showing user's last 10 purchase orders with status badge and cancel button for pending orders.
  - **Bank accounts admin** (`/admin/bank-accounts`) — full CRUD for configuring bank accounts visible to users. Fields: bank name, type (ahorros/corriente), account number, holder name/document, free-text instructions, active flag, sort order.
  - **Token orders admin** (`/admin/token-orders`) — table with filter pills (Todos/Pendientes/Aprobados/Rechazados/Cancelados), KPI header (total COP approved, $1UP approved, pending count), comprobante thumbnail/lightbox, approve modal (requires Base L2 tx hash), reject modal (requires reason).
- **New API routes**:
  - `POST /api/user/upload-comprobante` — Privy auth, multipart file upload to `comprobantes/pending/` in Supabase Storage
  - `GET  /api/bank-accounts` — returns active bank accounts ordered by sort_order
  - `GET  /api/user/token-orders` — user's order history (last 20)
  - `POST /api/user/token-orders` — creates order, moves comprobante to `comprobantes/{orderId}/receipt.{ext}`
  - `POST /api/user/token-orders/cancel` — cancels own pending order
  - `GET  /api/admin/token-orders` — admin list with joins; `?status=` filter
  - `PATCH /api/admin/token-orders` — approve (requires txHash) or reject (requires rejectionReason)
  - `POST|PUT|DELETE /api/admin/bank-accounts` — bank account CRUD
- **Storage helpers in `src/lib/blob.ts`**: `uploadComprobante(file, privyUserId)` and `moveComprobanteToOrder(pendingPath, orderId, ext)`
- **Admin sidebar** — new "Tokens $1UP" group with "Órdenes 1UP" and "Cuentas Banco" entries.

### Changed
- **WalletTab BUY button** — replaced Uniswap swap modal with `BuyTokensWizard` OTC flow.

### DB Migrations (applied via Supabase MCP)
- `bank_accounts` table created (id, bank_name, account_type, account_number, holder_name, holder_document, instructions, is_active, sort_order, created_at, updated_at)
- `token_purchase_orders` table created with `token_purchase_status` enum (pending/approved/rejected/cancelled); unique partial index `WHERE status = 'pending'` enforces one pending order per user
- `src/types/database.types.ts` regenerated with new tables + convenience type aliases `BankAccount`, `TokenPurchaseOrder`, `TokenPurchaseStatus`

---

## [1.7.0] — 2026-04-25

### Added
- **App mobile bottom nav** (`AppBottomNav`) — fixed bottom bar visible only on mobile (`md:hidden`). Shows all 6 app modules (Wallet, Identidad, Beneficios, Pass, Academia, Ajustes) with filled icon on active route via `usePathname`. Layout gains `pb-24` on mobile to prevent content sitting behind it.
- **Wallet BUY action** — third quick-action button alongside ENVIAR / RECIBIR. Opens a swap modal with the existing asset-selector (USDC / ETH on Base) + amount input, enabled and functional. "SWAP POR $1UP" button builds a Uniswap URL with asset and amount prefilled and opens it in a new tab on Base.
- **Live transaction history** — WalletTab fetches last 15 $1UP token transfers for the connected wallet from Blockscout Base mainnet API. Each row shows direction (ENVIADO / RECIBIDO), signed amount, counterparty address, date, and a Basescan link. Loading spinner and empty-state preserved.

### Removed
- **Token Utility bars** — mocked "Cursos Academia 45% / Entrada Torneos 35% / Beneficios 1UP Pass 20%" distribution chart removed from WalletTab. Right column now shows only the transaction history.

---

## [1.6.0] — 2026-04-24

### Added
- **Privy Users admin panel** (`/admin/privy-users`) — real-time user database merging Privy accounts, Supabase profiles, course/pass enrollments, and live $1UP token balances from Blockscout Base mainnet. Cards show nombre, apellidos, @username, wallet address, $1UP balance, cédula, Comfenalco status, enrolled courses count, games interests, 1UP Pass badge, linked account icons, and Privy join date. Client-side search covers email, wallet, cédula, DID, name, and username. Stats bar shows total users, with profile, with wallet, and 1UP Pass active count.
- **Extended user profiles** — 6 new columns on `user_profiles`: `nombre varchar(100)`, `apellidos varchar(100)`, `username varchar(50)` (unique partial index `WHERE username IS NOT NULL`), `phone_country varchar(10)`, `phone_number varchar(20)`, `game_ids integer[] DEFAULT '{}'`.
- **Identidad page redesigned** (`/app/identidad`) — pure "my data" form with 4 independent save sections: Datos personales (nombre, apellidos, @username with regex validation), Teléfono (country selector + number), Juegos favoritos (pill toggle grid from DB), Documento de identidad. Each section saves independently without affecting others.
- **Beneficios page** (`/app/beneficios`) — new page for aliado verification. Lists all active aliados with their discount labels; routes Comfenalco to legacy endpoint (`/api/user/comfenalco/verify`), all others to generic endpoint (`/api/user/aliado/verify`). Shows "PRÓXIMO" badge for aliados without a configured API URL (503 state). Shows verified date for confirmed affiliations.
- **AppSidebar active state** — sidebar now highlights the active route using `usePathname` (was a static server component before). Beneficios added between Identidad and 1UP Pass.

### Changed
- **Admin sidebar** — "Usuarios" now links to `/admin/privy-users` (primary Privy user database); old user-profiles link renamed to "Perfiles App" (`/admin/user-profiles`).
- **`/api/user/profile` PUT** — now accepts all new fields via patch semantics: `nombre`, `apellidos`, `username` (validated `^[a-z0-9_]{3,20}$`, returns 409 on duplicate), `phoneCountry` (from allowlist), `phoneNumber`, `gameIds integer[]`. Only supplied fields are updated.
- **Document section** — Documento de identidad in IdentidadTab now shows a hint linking to `/app/beneficios` when a document number is set, clarifying it's used for benefit verification.

### DB Migration (applied via Supabase MCP)
- `user_profiles`: added `nombre varchar(100)`, `apellidos varchar(100)`, `username varchar(50)`, `phone_country varchar(10)`, `phone_number varchar(20)`, `game_ids integer[] DEFAULT '{}'`
- Unique partial index: `CREATE UNIQUE INDEX user_profiles_username_uq ON user_profiles(username) WHERE username IS NOT NULL`

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
