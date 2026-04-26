# CHANGELOG — 1UP Gaming Tower Website

All deliveries are documented here. Newest version on top.
Format follows `.claude/skills/release-management.md`.

---

## [2.2.1] — 2026-04-26

### Changed
- **Wallet send — gas sponsorship via Privy EIP-7702** — `WalletTab.tsx` `handleSend` now uses `useSendTransaction` from `@privy-io/react-auth` with `sponsor: true` instead of building a raw `walletClient.writeContract` call. Privy upgrades the embedded wallet to a Kernel smart contract in-place (same address, no migration) and covers gas via its paymaster. Requires gas sponsorship enabled for Base in the Privy Dashboard and TEE execution active.
  - Removed viem `createWalletClient`, `custom`, and `viem/chains` `base` imports from `WalletTab.tsx`.
  - Added `encodeFunctionData` (encodes the ERC-20 `transfer` calldata) and `useSendTransaction` hook.
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
