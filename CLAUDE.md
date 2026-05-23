# CLAUDE.md — 1UP Gaming Tower Website

Production website for **1UP Gaming Tower** (`1upesports.org`), Colombia's first professional esports hub.
Built and maintained by **Ekinoxis** — stack: Next.js 16 App Router, TypeScript, Tailwind CSS v3, Privy auth, Supabase JS, Supabase Storage, MercadoPago. Node 24 LTS.

---

## 8 Non-Negotiable Rules

1. **0px border-radius.** `rounded-*` is banned except `rounded-full`. Sharp corners everywhere.
2. **No 1px dividers.** Never `<hr>`, `border-b`, or `border-t` for section separation — use background color shifts.
3. **Public pages = pure Tailwind.** No shadcn imports in `src/components/{home,tower,team,academia,recreativo,juegos,masters,torneos}/`.
4. **Skew pattern.** Outer element: `className="skew-fix"`. Inner text: `className="block skew-content"`.
5. **Glass nav.** TopAppBar always uses `glass-panel` class — never opaque.
6. **Auth on every admin API route.** `verifyToken` + `isAdmin` before any DB operation. No exceptions.
7. **`revalidatePath()` after every mutation.** Call it for both the public page AND the admin page. Footer is in the shared layout — use `revalidatePath("/", "layout")` when mutating `social_links` so all public pages refresh.
8. **Update docs after every change.** After any addition, fix, or feature: update `CHANGELOG.md` (new version entry), `README.md` (if routes/tables/stack changed), and this file (if rules/routes/env vars changed). Also update `docs/FICHA-TECNICA.md` on every MINOR or MAJOR release — bump its version number (2.x), update the "Última actualización" date, and correct any sections affected by the change (endpoints, tables, login providers, integrations). No exception — docs drift is technical debt.

---

## Infrastructure Access — use these proactively

You (Claude) have **live access to the four platforms that run this project**. Use them directly to diagnose, fix, and verify — do not ask the user to do things you can do yourself.

| Platform | How to access | What it's for |
|----------|--------------|---------------|
| **Supabase** | MCP `mcp__plugin_supabase_supabase__*` (OAuth — re-auth per session via `__authenticate`, then complete via `/mcp`) | Project `1uptower` = `kwqfpkvalspuvyiszrfh`. Run migrations (`apply_migration`), queries (`execute_sql`), check logs/advisors. See **Database Migrations** below. |
| **Vercel** | MCP `mcp__claude_ai_Vercel__*` (always available) **or** `npx vercel@latest <cmd>` (CLI not globally installed; `npm i -g vercel` needs sudo on this machine — use `npx` for one-off `env ls/add/pull`). Repo already linked to the project. | Project `website-1up` = `prj_hNsodgd6Gh4eToJub3zUKnG6m7ND`, team `team_jxTNRBmimeErr5ULGBepXlL0` (slug `ekinoxis-team`). Inspect deployments, build logs, runtime logs; manage env vars. |
| **Cloudflare** | MCP `mcp__plugin_cloudflare_cloudflare-api__*` (OAuth — re-auth per session via `__authenticate`) | Account `3347a58a0885b5e3c040d1f9fb408c4e`. General CF API. **Caveat:** the MCP OAuth scope excludes Stream — for Stream API calls use `CF_STREAM_API_TOKEN` from `.env.local` directly via `curl`/`fetch`. |
| **GitHub** | `gh` CLI (installed v2.92.0, authed via keyring — persistent across sessions). **Do not try the GitHub MCP** — the server (`api.githubcopilot.com/mcp`) rejects Claude Code's dynamic OAuth client registration with "Incompatible auth server"; `mcp__github__authenticate` will always fail until either side updates. Plain `git` covers branch/commit/push. | Repo `Ekinoxis-evm/website-1up`. Default branch `main`. Use `gh pr create / list / merge / view`, `gh issue ...`, `gh release ...`, `gh run ...` via plain `Bash`. For branch cleanup use plain git (`git push origin --delete <branch>`). |

**Critical practice — env vars are NOT auto-synced.** `.env.local` is local-only; Vercel has its own env var store. When something works locally but fails in production, **first check `vercel env ls production`** for missing/stale keys before touching code. (This exact gap — `CF_STREAM_*` vars absent on Vercel — caused the v2.27.1 production outage.)

**Build caveat.** `npm install` on Vercel needs `.npmrc` with `legacy-peer-deps=true` because `@g-loot/react-tournament-brackets` pins React 18 while the project is on React 19. Do not remove `.npmrc`.

**Local dev fact:** the Vercel project ID and team ID above are authoritative — `CLAUDE.local.md` is also kept in sync.

---

## Route Map

All public routes use the single `(main)` layout group — TopAppBar + MobileBottomNav + Footer. No sidebar.

| URL | Layout group | Purpose |
|-----|-------------|---------|
| `/` | `(main)` | Home — Hero, Brands Banner, 1UP Pass, AcademiaSection, TorneosSection, CommunitySection (discord/whatsapp from social_links), MarketplaceSection, TalentPipeline ("Sobre Nosotros"), Recruitment |
| `/torneos` | `(main)` | Tournament list — upcoming/live/completed cards with game, prize, registration CTA. RecruitmentForm at bottom. |
| `/gaming-tower` | `(main)` | 6-floor breakdown, 1UP Pass benefits, per-category games (JuegosDisplay hideHero), Map |
| `/privacidad` | `(main)` | Política de Privacidad y Tratamiento de Datos (Ley 1581) |
| `/juegos` | `(main)` | **Redirects to `/gaming-tower`** — games are now part of the Tower page |
| `/team` | `(main)` | **Redirects to `/`** — Masters on `/academia`, recruitment on `/torneos` |
| `/torneos/[slug]` | `(main)` | Tournament detail — cover, badges, prizes podium, sponsor strip, RegisterButton CTA. `generateMetadata` with per-tournament OG. Numeric ID fallback for old QR codes/bookmarks. |
| `/torneos/[slug]/checkin` | `(main)` | QR check-in — inline Privy login (no redirect), validates registration, marks `attended` via POST /api/user/tournament-checkin. Numeric ID fallback for old QR codes. |
| `/torneos/[slug]/tv` | `(bare)` | **TV / venue display view** (v2.35.0). Fullscreen, no chrome. Huge tournament title + cover, bracket scaled to viewport with avatar-aware match cards (56px avatars, big typography), sponsor strip at bottom. Polls `/api/tournaments/[slug]/bracket` every 15s for live updates as the cockpit records winners. The `(bare)` route group is a sibling of `(main)` so this page inherits no TopAppBar / Footer. |
| `/academia` | `(main)` | Course catalog + Masters profiles + CommunitySection + token/bank checkout (MercadoPago not yet active) |
| `/academia/[courseId]` | `(main)` | Public course preview — hero card (image, master, stats, price), playable intro video (CF Stream signed token via `/api/public/course-intro-token`), full module + session list with lock icons, INSCRIBIRSE CTA. `generateMetadata` with per-course OG. |
| `/recreativo` | `(main)` | Jornadas recreativas (corporate gaming days). CTA URL comes from `social_links` (whatsapp) with a `/torneos#recruitment` fallback. |
| `/marketplace` | `(main)` | Marketplace landing — features + CTA |
| `/perfil` | `(main)` | Legacy — `permanentRedirect` to `app.1upesports.org` (noindex) |
| `/offline` | top-level | PWA offline fallback page (no `(main)` layout — bare shell) |
| `app/login` | `app/` | Public login page — `safeRedirectTarget()` allowlist, redirects back to `?redirect=` URL after auth |
| `app/onboarding` | `app/` | Mandatory first-time wizard (outside `(protected)` to avoid circular redirect) — own auth check |
| `app/(protected)/*` | `app/` | Auth-gated user shell (wallet, mis-torneos, beneficios, pass, academia, ajustes) — AppSidebar on desktop, AppBottomNav on mobile. Layout redirects unonboarded users to `/app/onboarding`. |
| `app/(protected)/mis-torneos` | `app/` | User tournament registrations — card list with status badges, links to detail pages |
| `app/(protected)/ajustes` | `app/` | Two-tab settings: IDENTIDAD (profile data) + SEGURIDAD (linked accounts). Replaces `/app/identidad` and `/app/settings` (both redirect here). |
| `admin/login` | `admin/` | Public login page for admin subdomain |
| `admin/(protected)/*` | `admin/` | Auth-gated admin panel (requires isAdmin) |
| `admin/(protected)/torneos/[slug]/manage` | `admin/` | **Unified tournament cockpit — fully embedded tab UI** (PR D, v2.34.0). Header (status pill, public/TV/QR/edit/cancel/delete) + lifecycle banner + 4 tabs persisted in URL hash: **Información** (read-only summary + edit deep-link), **Inscripciones** (`AdminTournamentRegistrationsPanel` — pre-filtered list, status chips, status updates, CSV), **Bracket** (`AdminTournamentBracketPanel` — full per-tournament editor extracted from the global brackets admin), **Premios** (`AdminTournamentResultsPanel` — podium with avatars, manual-assign picker, mark-entregado modal with tx_hash / comprobante). Standalone admin pages (`/admin/tournament-registrations`, `/admin/tournament-brackets`, `/admin/tournament-results`) stay as the global cross-tournament views. |
| `admin/(protected)/courses` | `admin/` | Course list — `+ NUEVO CURSO` (→ new), per-row `Editar` (→ editor) + `Eliminar`. Fetches courses only — no legacy academia_content fetch |
| `admin/(protected)/courses/new` | `admin/` | Quick-create a course (name + category) then redirect to editor |
| `admin/(protected)/courses/[id]/edit` | `admin/` | Full course editor: Info tab (all fields + CF Stream intro video) + Contenido tab (drag-reorder modules/sessions, session panel with video/docs/links) |
| `app/(protected)/academia/[courseId]` | `app/` | Per-course curriculum page for enrolled users — intro video, module tabs, session accordion with lazy video player + doc downloads |

**API routes** — all `/api/admin/*` require Privy Bearer token + isAdmin check.

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/recruitment` | Public | Recruitment form submission |
| `GET\|PUT /api/user/profile` | Privy user | Own profile CRUD |
| `POST\|DELETE /api/user/avatar` | Privy user | Upload (multipart `file`, JPEG/PNG/WebP, ≤5MB, magic-byte sniffed) or remove the user's avatar. Stored at `users/{user_profile_id}/avatar` in the `images` bucket; updates `user_profiles.avatar_url`. |
| `POST /api/user/comfenalco/verify` | Privy user | Comfenalco affiliation check |
| `POST /api/user/aliado/verify` | Privy user | Generic aliado affiliation check |
| `POST /api/checkout` | Privy user | Creates MP preference + pending enrollment |
| `POST /api/webhooks/mercadopago` | HMAC signature | Payment confirmation |
| `POST /api/user/upload-comprobante` | Privy user | Upload payment receipt → Supabase Storage (`comprobantes/`) |
| `GET\|POST /api/user/token-orders` | Privy user | List own purchase orders / create new order |
| `POST /api/user/token-orders/cancel` | Privy user | Cancel own pending order |
| `GET /api/bank-accounts` | Privy user | List active bank accounts — **masked** (`account_number_masked` = last 4 only; `holder_document` dropped) for the wizards' picker. Rate-limited under `authMutate` (audit M-A5.3 / H-6 — 2.29.5). |
| `GET /api/bank-accounts/[id]` | Privy user | Returns the **full** bank account record for a single id — invoked once per checkout after a user picks a bank. Rate-limited. |
| `POST\|PUT\|DELETE /api/admin/courses` | isAdmin | Course CRUD |
| `POST\|PUT\|DELETE /api/admin/discounts` | isAdmin | Discount rule CRUD |
| `POST\|PUT\|DELETE /api/admin/masters` | isAdmin | Masters CRUD |
| `GET\|POST\|PUT\|DELETE /api/admin/aliados` | isAdmin | Aliados CRUD (GET lists all; POST/PUT include `website_url`, `sort_order`, `show_in_banner`) |
| `PUT /api/admin/social-links` | isAdmin | Footer social links update |
| `GET /api/admin/enrollments` | isAdmin | Enrollment list |
| `GET\|POST\|DELETE /api/admin/users` | isAdmin | Admin user management |
| `GET /api/admin/user-detail` | isAdmin | Full activity for one user profile (`?id=N`) — registrations, enrollments, pass orders, token orders, podium results. Powers the player-detail popup on `/admin/user-profiles`. |
| `POST /api/admin/upload` | isAdmin | Image upload → Supabase Storage |
| `GET\|PATCH /api/admin/token-orders` | isAdmin | List token purchase orders / approve or reject |
| `POST\|PUT\|DELETE /api/admin/bank-accounts` | isAdmin | Bank account CRUD |
| `GET /api/user/pass-config` | Public | Pass price, recipient address, duration |
| `GET\|POST /api/user/pass-orders` | Privy user | List own pass orders / submit after confirmed tx |
| `GET\|PUT /api/admin/pass-config` | isAdmin | Read/update pass price, recipient wallet, duration, active flag |
| `GET\|POST\|PATCH /api/admin/pass-orders` | isAdmin | List all pass orders / **create admin_grant order** (POST: userProfileId, privyUserId, walletAddress, startedAt, durationDays, adminNotes?) / update admin notes / approve or reject bank-transfer pass orders (`action: "approve" \| "reject"`) |
| `POST /api/user/onboarding` | Privy user | Complete onboarding — saves all profile fields, validates referral code, sets onboarding_completed_at |
| `GET /api/user/referral-codes/validate` | Public | Validate a referral code (returns `{ valid, reason }`) |
| `GET\|POST\|PUT /api/admin/referral-codes` | isAdmin | Referral code CRUD (create, toggle active, update description/max_uses) |
| `GET\|POST\|PUT\|DELETE /api/admin/brand-logos` | — | **Removed** — returns 410. Use `/api/admin/aliados` with `show_in_banner: true`. |
| `GET\|POST\|PUT\|DELETE /api/admin/tournaments` | isAdmin | Tournament CRUD (GET is public — active only, joined with game name). **Tournament `status` is derived from the bracket lifecycle, not editor-controlled.** POST forces `status: 'upcoming'`; PUT does not write `status` from the body (it preserves whatever the bracket flow set). The only PUT path that flips status is `cancelTournament: true`, which is the sanctioned end-of-life and sets `status: 'completed'`. `is_registration_open` can only be set true while current status is `'upcoming'`. |
| `GET\|POST\|DELETE /api/user/tournament-registrations` | Privy user | List own registrations / register for tournament (RPC) / cancel |
| `GET\|PATCH /api/admin/tournament-registrations` | isAdmin | List all registrations (filter by tournamentId) / update status (attended/no_show) |
| `POST\|DELETE /api/admin/tournament-results` | isAdmin | Upsert podium result (position 1–3 with points) / delete by id |
| `GET\|POST\|PUT\|DELETE /api/admin/international-tournaments` | isAdmin | International tournament CRUD |
| `POST /api/user/tournament-checkin` | Privy user | Mark own registration as `attended` — validates tournament is `live`, registration is `registered` |
| `POST /api/user/stream-token` | Privy user | Verify enrollment → signed RS256 JWT (1h) for `academia_content.stream_uid` (legacy flat content) |
| `POST /api/admin/stream-upload-url` | isAdmin | Return CF Stream direct-upload URL + video UID for client-side PUT upload |
| `POST\|PUT\|DELETE /api/admin/course-modules` | isAdmin | Module CRUD (title, description, is_published, sort_order) |
| `POST /api/admin/course-modules/reorder` | isAdmin | Bulk sort_order update for modules in a course |
| `POST\|PUT\|DELETE /api/admin/course-sessions` | isAdmin | Session CRUD — POST/PUT accept `pendingDocs[]` (moves from pending to final path) + `links[]`; DELETE cleans up storage |
| `POST /api/admin/course-sessions/reorder` | isAdmin | Bulk sort_order update for sessions in a module |
| `POST\|PUT\|DELETE /api/admin/course-session-links` | isAdmin | Session support link CRUD |
| `POST /api/admin/course-doc-upload` | isAdmin | Multipart upload of a session document to `course-docs` private bucket (pending path). Returns `{ path, mimeType, sizeBytes, label }` |
| `POST\|DELETE /api/admin/course-session-documents` | isAdmin | Insert DB row for uploaded doc / delete doc (removes storage object + row) |
| `POST /api/user/course-intro-token` | Privy user | Signed CF JWT for `courses.intro_video_uid` — no enrollment required (used inside the protected app shell) |
| `POST /api/public/course-intro-token` | Public | Signed CF JWT for `courses.intro_video_uid` — no auth, used by the public `/academia/[courseId]` preview page. Safe because tokens are 1h-scoped to a single video UID and the video has `requireSignedURLs: true`. |
| `POST /api/user/stream-token-v2` | Privy user | Signed CF JWT for `course_sessions.video_uid` — enrollment required |
| `GET /api/user/course-session` | Privy user | Session data + links + doc metadata for enrolled user (`?sessionId=N`) |
| `GET /api/user/course-document` | Privy user | 1-hour signed Supabase Storage URL for a session document (`?id=N`) — enrollment required |
| `GET /api/tournaments/[slug]/bracket` | Public | Returns bracket + participants + matches by tournament slug (null if no bracket exists) |
| `GET\|POST\|PATCH\|DELETE /api/admin/brackets` | isAdmin | **The bracket is the single source of truth for tournament lifecycle AND the podium.** GET fetch bracket+participants+matches; POST seed as **draft** from an ordered `participantIds[]` (2-phase insert + pointer wiring + bye auto-advance) — tournament stays `upcoming`; PATCH is action-based — `start` (draft→in_progress, locks structure, sets tournament `live` and forces `is_registration_open = false`), `result` (pick winnerId, advance; **when the last match completes the tournament auto-flips to `completed` AND `tournament_results` is auto-filled from `derivePodium()` — manual overrides via POST `/api/admin/tournament-results` are preserved (auto-fill only INSERTs missing positions; auto-rows are stamped `awarded_by = "system:auto-podium"`)**), `undo` (safe revert if no downstream match played; **reverts a completed tournament back to `live` when the final match is undone AND deletes auto-podium rows so re-completion can re-derive accurately — manual rows are kept**); **DELETE refuses with 409 unless `bracket.status = 'draft'`** — a running/finished bracket cannot be wiped or re-seeded. Public bracket (`/api/tournaments/[slug]/bracket` + tournament page) only shows `in_progress`/`completed` brackets — drafts stay private. |

---

## Database Tables

| Table | Key fields |
|-------|-----------|
| `game_categories` | name, slug, image_url |
| `games` | name, category_id, image_url |
| `players` | gamertag, real_name, role, photo_url, social URLs, is_active |
| `competitions` | tournament_name, year, result, player_id |
| `courses` | name, category, price_cop, price_token (nullable — enables $1UP payment), duration_hours, session_duration_min, image_url, master_id FK, is_active, intro_video_uid (CF Stream UID for preview), intro_description |
| `course_modules` | course_id FK → courses (CASCADE), title, description, sort_order, is_published |
| `course_sessions` | module_id FK → course_modules (CASCADE), title, description, video_uid (CF Stream UID — null if no video), duration_minutes, sort_order, is_published |
| `course_session_links` | session_id FK → course_sessions (CASCADE), label, url, sort_order — support links shown to enrolled users |
| `course_session_documents` | session_id FK → course_sessions (CASCADE), label, storage_path (in `course-docs` private bucket), mime_type, size_bytes, sort_order — downloadable files for enrolled users |
| `masters` | name, specialty, bio, photo_url, instagram/tiktok/twitter/youtube/linkedin/kick/twitch/github URLs, categories[], topics[], is_active |
| `pass_benefits` | title, description |
| `floor_info` | floor_label, title, description, accent_color, image_url |
| `recruitment_submissions` | name, email, phone, source |
| `user_profiles` | privy_user_id, nombre, apellidos, username (unique nullable), phone_country, phone_number, game_ids[], tipo_documento, numero_documento, barrio, birth_date (DATE), onboarding_completed_at, referred_by_code, comfenalco_afiliado, verified_aliados[], **avatar_url** (Supabase Storage URL — managed by `/api/user/avatar`; null → UI shows the deterministic initials gradient via `<Avatar />`), pass_status (pass_status_enum: never/active/expired — auto-synced by trigger `trg_sync_pass_status` on every `pass_orders` INSERT/UPDATE; nightly pg_cron job flips active→expired at 04:00 UTC), **wallet_address** (Privy embedded wallet), **auth_provider** (email/google/…), **linked_accounts** (jsonb snapshot of Privy linked accounts), **privy_created_at**, **last_synced_at** — the last 5 captured from Privy by `src/lib/privySync.ts` on onboarding + throttled on profile GET |
| `referral_codes` | code (unique), description, is_active, max_uses, used_count — optional at onboarding (addable later on /app/identidad), admin-managed |
| `aliados` | name, nit, email, api_url, api_key, logo_url, website_url, sort_order, show_in_banner, is_active — API integration partners AND visual banner sponsors. `show_in_banner = true` → appears in home marquee. `brand_logos` table was merged here. |
| `discount_rules` | trigger_type, discount_pct, applies_to, aliado_id FK, is_active, valid_from/until |
| `enrollments` | user_profile_id, course_id, final_price_cop, payment_status, mp_payment_id |
| `academia_content` | course_id FK, content_type, title, url, stream_uid (CF Stream video UID — null for external links), is_published |
| `social_links` | platform, url, is_active, sort_order — footer social icons (instagram/tiktok/kick/youtube/x/twitch) + community invite links (discord/whatsapp — rendered in `CommunitySection`, filtered OUT of Footer via `COMMUNITY_PLATFORMS` constant in `src/lib/socialIcons.ts`) |
| `site_content` | key (PK), image_url — site-level images (equipment_highlight, learning_path) |
| `admin_users` | email, added_by |
| `bank_accounts` | bank_name, account_type (ahorros/corriente), account_number, holder_name, holder_document, instructions, is_active, sort_order — bank transfer destinations shown in BUY modal |
| `token_purchase_orders` | user_profile_id FK, privy_user_id, email, nombre, celular_contacto, wallet_address, cop_amount, token_amount, exchange_rate_cop (frozen 1000), bank_account_id FK, comprobante_url, status (pending/approved/rejected/cancelled), admin_notes, rejection_reason, approved_tx_hash, reviewed_by, reviewed_at |
| `pass_config` | Single-row (id=1): price_token, recipient_address, duration_days, is_active, updated_by — admin-editable via `/admin/1pass` and `/admin/bank-accounts` (treasury wallet only) |
| `pass_orders` | user_profile_id FK, privy_user_id, wallet_address, payment_method (token/bank/**admin_grant**), tx_hash (nullable — token path only), bank_account_id FK, comprobante_url, status (pending_bank/confirmed/failed/…), token_amount_paid, token_price_at_purchase, recipient_address, duration_days, block_number, **started_at** (when pass period begins — can be past for admin grants), paid_at, expires_at (stacks on renewal from expires_at), **granted_by** (admin email for admin_grant orders), rejection_reason, reviewed_by, reviewed_at |
| `tournaments` | name, slug (unique — auto-generated from name, used in URLs), game_id FK (nullable → games), date, prize_pool_cop (deprecated — use tournament_prizes), max_participants, status (upcoming/live/completed), location_type (presencial/online/mixto), image_url, description, sponsor_name, sponsor_website_url, sponsor_logo_url, is_active, is_registration_open, sort_order |
| `tournament_prizes` | tournament_id FK → tournaments (CASCADE), position (1–3 unique per tournament), prize_type (tokens/cop/both), amount_tokens (nullable NUMERIC), amount_cop (nullable INTEGER) — DB CHECK enforces type/amount consistency |
| `tournament_registrations` | tournament_id FK → tournaments (CASCADE), user_profile_id FK → user_profiles (CASCADE), privy_user_id, status (registered/cancelled/attended/no_show), registered_at, cancelled_at — UNIQUE (tournament_id, user_profile_id). RPC `register_for_tournament` enforces capacity + uniqueness atomically |
| `international_tournaments` | name, organizer, date, country, city, game_id FK (nullable → games), registration_link, image_url, description, is_active, sort_order — no prizes/registrations/capacity lifecycle |
| `tournament_results` | tournament_id FK → tournaments (CASCADE), user_profile_id FK → user_profiles (CASCADE), position (1–3), points, awarded_by, prize_status (prize_delivery_status: no_prize/pending/sent — auto-set on INSERT from tournament_prizes), prize_tx_hash, prize_sent_at, prize_sent_by, prize_comprobante_url — UNIQUE per tournament+position and per tournament+user |
| `hall_of_fame` | PostgreSQL VIEW: user_profile_id, username, nombre, apellidos, gold_count, silver_count, bronze_count, total_points, avatar_url — ordered by points DESC then gold_count DESC |
| `brackets` | id (bigint PK), tournament_id FK → tournaments (UNIQUE CASCADE), format (bracket_format enum: single_elimination/double_elimination), status (bracket_status enum: draft/published/in_progress/completed), participant_count, rounds_winners, rounds_losers, created_at, updated_at |
| `bracket_participants` | id (bigint PK), bracket_id FK → brackets (CASCADE), seed (1-based), display_name, user_profile_id FK → user_profiles (nullable), eliminated (bool default false), created_at |
| `bracket_matches` | id (bigint PK), bracket_id FK → brackets (CASCADE), bracket_side (text: winners/losers/grand_final), round, match_number, p1_id/p2_id FK → bracket_participants (nullable), p1_score/p2_score, winner_id/loser_id FK → bracket_participants, state (match_state enum: pending/ready/in_progress/completed/bye), p1_source/p2_source (slot_source enum: seed/winner_of/loser_of/bye), p1_source_match_id/p2_source_match_id self-ref, next_match_id self-ref (where winner advances), next_match_slot (1 or 2), next_loser_match_id self-ref (DE — where loser drops), next_loser_slot, created_at, updated_at |

**Schema source of truth:** `src/types/database.types.ts` — keep this in sync with the live Supabase schema after any migration.

> **Admin Server Components must use `supabaseAdmin`** (service role key), never `supabase` (anon). RLS policies on tables like `masters` silently filter inactive records from the anon client — admin panels need to see everything. Import: `import { supabaseAdmin } from "@/lib/supabase"`.

> **Admin failure UX: use the shared toast, not `alert()` or silent failure.** The admin `(protected)` layout wraps every page in `AdminToastProvider` (`src/components/admin/ui/Toast.tsx`). In any `"use client"` admin component, call `const { showError, showSuccess, showInfo } = useAdminToast();` and surface every API failure through it. Existing inline `setSaveError` banners can stay where they're working, but new code uses the toast. **Never use `alert()`** — it breaks the design system flow.

---

## Database Migrations

**Always run migrations via the Supabase MCP tool — never ask the user to run SQL manually.**

```
1. mcp__plugin_supabase_supabase__list_projects  → confirm project ID (1uptower = kwqfpkvalspuvyiszrfh)
2. mcp__plugin_supabase_supabase__apply_migration → for DDL (CREATE TABLE, ALTER TABLE, etc.)
3. mcp__plugin_supabase_supabase__execute_sql     → for DML checks (SELECT) or seed data
```

After applying, confirm `success: true` before moving on.

**Schema baseline.** The full live schema is committed at
`supabase/migrations/00000000000000_baseline.sql` (audit H-7). It's idempotent — running it
on the live DB is a no-op; running it on a fresh DB produces the live state. After applying
any new DDL migration via the MCP, also commit a matching `.sql` file under
`supabase/migrations/` named `YYYYMMDDHHMMSS_<snake_case_name>.sql` so the repo and the
remote stay in sync (the live `supabase_migrations.schema_migrations` table is the source
of truth on timestamps — `mcp__plugin_supabase_supabase__list_migrations` shows them).

Local dev: `supabase start` will spin up a Postgres + Auth + Studio + Storage replica that
matches production (configured in `supabase/config.toml`). Requires the Supabase CLI:
`brew install supabase/tap/supabase`.

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
| `aliados/{id}/cover` | Partner logos and banner sponsor logos (consolidated from brand-logos) |
| `tournaments/{id}/cover` | Tournament cover images |
| `site/{key}/cover` | Site-level images (equipment-highlight, learning-path) |
| `users/{user_profile_id}/avatar` | User profile avatar — JPEG/PNG/WebP only, ≤5MB, managed by `/api/user/avatar` |
| `comprobantes/pending/{privyUserIdHash}-{timestamp}.{ext}` | Payment receipt — temporary path before order ID exists |
| `comprobantes/{orderId}/receipt.{ext}` | Payment receipt — moved here after order is created (jpg/png/webp/pdf) |

**Comprobante uploads** go through `/api/user/upload-comprobante` (Privy user auth, NOT admin-only). The file is uploaded to the pending path first, then `move()`d to the final order path by `/api/user/token-orders`. Accepts jpg/png/webp/pdf only, 5MB max.

**Course documents** use a separate **private** bucket `course-docs` (25 MB max, no public URL). Paths:

| Path | Used by |
|------|---------|
| `courses/{courseId}/sessions/pending/{timestamp}-{filename}` | Temporary on upload — admin uploads file, then save moves it |
| `courses/{courseId}/sessions/{sessionId}/{timestamp}-{filename}` | Final path after session is created/saved |

Access via `/api/user/course-document?id=N` which returns a 1-hour signed URL after verifying enrollment. Managed via `src/lib/courseDocs.ts`.

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
| `.claude/skills/cloudflare-stream.md` | `src/lib/stream.ts`, `src/app/api/user/stream-token/**`, `src/app/api/user/stream-token-v2/**`, `src/app/api/user/course-intro-token/**`, `src/app/api/admin/stream-upload-url/**`, `src/lib/courseDocs.ts`, `src/app/api/user/course-session/**`, `src/app/api/user/course-document/**`, `src/app/api/admin/course-sessions/**`, `src/app/api/admin/course-modules/**`, `src/app/api/admin/course-session-links/**`, `src/app/api/admin/course-session-documents/**`, academia content work |
| `.claude/skills/token-purchase-flow.md` | `src/components/perfil/BuyTokensWizard.tsx`, `src/components/perfil/MisOrdenes.tsx`, `src/app/api/user/token-orders/**`, `src/app/api/user/upload-comprobante/**`, `src/app/api/bank-accounts/**`, `src/app/api/admin/token-orders/**`, `src/app/api/admin/bank-accounts/**`, `src/app/admin/(protected)/token-orders/**`, `src/app/admin/(protected)/bank-accounts/**`, `src/components/admin/AdminTokenOrdersClient.tsx`, `src/components/academia/CourseCheckoutWizard.tsx`, `src/app/api/user/course-orders/**`, `src/app/api/admin/enrollments/**` |
| `.claude/skills/onboarding-flow.md` | `src/app/app/onboarding/**`, `src/components/perfil/OnboardingWizard.tsx`, `src/app/api/user/onboarding/**`, `src/app/api/user/referral-codes/**`, `src/app/api/admin/referral-codes/**`, `src/app/admin/(protected)/referral-codes/**`, `src/components/admin/AdminReferralCodesClient.tsx` |
| `.claude/skills/mobile-responsive.md` | `src/components/layout/**`, `src/components/admin/**`, any new page or client component |
| `.claude/skills/pass-purchase-flow.md` | `src/components/perfil/BuyPassWizard.tsx`, `src/components/perfil/MisPassOrders.tsx`, `src/components/perfil/PassPurchasePanel.tsx`, `src/lib/passVerifier.ts`, `src/app/api/user/pass-orders/**`, `src/app/api/user/pass-config/**`, `src/app/api/admin/pass-orders/**`, `src/app/api/admin/pass-config/**`, `src/app/admin/(protected)/pass-orders/**`, `src/app/app/(protected)/pass/**` |
| `.claude/skills/seo.md` | `src/app/(main)/**/page.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, any new public page |

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
| `RESEND_API_KEY` | Resend dashboard → API Keys |
| `ADMIN_NOTIFICATION_EMAIL` | Email that receives purchase notifications (usually same as ADMIN_EMAILS) |
| `CF_STREAM_ACCOUNT_ID` | Cloudflare dashboard → Account ID |
| `CF_STREAM_API_TOKEN` | Cloudflare → API Tokens → "Read and write to Cloudflare Stream and Images" template |
| `CF_STREAM_KEY_ID` | From one-time `POST /accounts/{id}/stream/keys` — RS256 signing key ID |
| `CF_STREAM_PEM` | Base64-encoded RSA private key from same signing key response — never regenerate (invalidates all issued tokens) |
| `NEXT_PUBLIC_CF_CUSTOMER_CODE` | From CF Stream video playback URL: `customer-{CODE}.cloudflarestream.com` |
| `UPSTASH_REDIS_REST_URL` *(or `UPSTASH_REDIS_REST_KV_REST_API_URL`)* | Vercel Marketplace → Upstash → "Add to Project". Drives `src/lib/rateLimit.ts`. Vercel auto-generates the longer `_KV_REST_API_URL` form; the code falls back to it. **When unset, all rate limiters are pass-through** — code ships safely without it, but H-4 is unenforced until provisioned. |
| `UPSTASH_REDIS_REST_TOKEN` *(or `UPSTASH_REDIS_REST_KV_REST_API_TOKEN`)* | Same source as the URL above; same dual-name handling. |

> `BLOB_READ_WRITE_TOKEN` is **not needed** — image storage migrated to Supabase Storage.

> **Activating rate limiting in production:** add the Upstash integration to the Vercel
> project (Marketplace → Upstash → "Add to Project"). It auto-provisions a free-tier Redis
> and writes `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` into the project env vars.
> No code redeploy is needed — the next request after the env vars land starts enforcing.

---

## Privy + Google OAuth Setup

Login methods configured: **email** and **google** (`loginMethods: ["email", "google"]` in `src/components/providers/PrivyClientProvider.tsx`). Discord is disabled.

Custom Privy auth domain: **`privy.1upesports.org`** (set in Privy Dashboard → Settings → Custom Auth Domain).

**Critical: even with a custom auth domain, the Google callback Privy sends is the standard one.**

### Google Cloud Console (one-time)
Credentials → OAuth 2.0 Client → **Authorized redirect URIs** — must contain exactly:
```
https://auth.privy.io/api/v1/oauth/callback
```
Do NOT use `https://privy.1upesports.org/api/v1/oauth/callback` — Privy always sends the `auth.privy.io` callback to Google regardless of the custom domain.

### Privy Dashboard (one-time)
- **Allowed origins**: `https://1upesports.org`, `https://app.1upesports.org`, `https://admin.1upesports.org`
- **Allowed OAuth redirect URLs**: `https://app.1upesports.org/login` (this is the `redirect_to` Privy sends to its own `/oauth/init` endpoint — must be an exact match, no trailing slash)

### Debugging checklist
If Google login breaks again (401 from `privy.1upesports.org/api/v1/oauth/init`):
1. Privy is rejecting the `redirect_to` → check **Allowed OAuth redirect URLs** in Privy dashboard
2. If it reaches Google and returns `redirect_uri_mismatch` → the Google Cloud Console is missing `https://auth.privy.io/api/v1/oauth/callback`
3. The exact rejected URI is encoded in the Google error page URL (`authError` param, base64 protobuf) — decode to confirm

---

## Gas Sponsorship

All $1UP token sends from embedded wallets use **Privy native gas sponsorship (EIP-7702)**. Privy upgrades the embedded wallet to a Kernel smart contract in-place — same address, no migration — and its paymaster covers the gas fee.

**Pattern — always use this for embedded wallet sends:**
```ts
const { sendTransaction } = useSendTransaction(); // from @privy-io/react-auth

const { hash } = await sendTransaction(
  {
    to: ONE_UP_TOKEN.address,
    value: BigInt(0),
    chainId: 8453,
    data: encodeFunctionData({ abi: ERC20_TRANSFER_ABI, functionName: "transfer", args: [...] }),
  },
  { address: walletAddress, sponsor: true }  // ← sponsor: true is mandatory
);
```

**Files that use this pattern:**
- `src/components/perfil/WalletTab.tsx` — user send modal
- `src/components/perfil/BuyPassWizard.tsx` — pass purchase
- `src/components/admin/AdminTokenOrdersClient.tsx` — admin approve token purchase order

**Dashboard requirements (one-time setup):**
- Privy Dashboard → Gas Sponsorship tab → enable for **Base mainnet**
- Settings → Wallet Infrastructure → confirm **TEE execution** is active (not MPC legacy)

**Transaction history** — use Blockscout API v2, not Privy (Privy has no list-transactions endpoint):
```
GET https://base.blockscout.com/api/v2/addresses/{wallet}/token-transfers?token={ONE_UP_TOKEN.address}
```
Do NOT append `&limit=N` — Blockscout v2 rejects unknown query params and returns an error with no `items`.

---

## Subdomain Routing

**`src/proxy.ts`** is the Next.js 16 first-class proxy file — it replaces `middleware.ts` for subdomain routing. Next.js 16 picks it up automatically by name; no `middleware.ts` is needed or allowed (having both causes a build error).

- Export the function as `proxy` (not `middleware`)
- Export `config` with the `matcher` array
- Never create a `src/middleware.ts` alongside it — that conflicts and breaks the build

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
