

---
name: database
description: Database layer for 1UP — dual Supabase clients, full schema reference, Supabase Storage, migration workflow, and type system.
type: project
filePattern: src/{db,lib/supabase.ts,lib/blob.ts,app/api}/**
---

# Database — 1UP Gaming Tower

## Two clients, two purposes

```ts
import { supabase, supabaseAdmin } from "@/lib/supabase";
```

| Client | Key type | Use for |
|--------|----------|---------|
| `supabase` | anon key | **Server Component reads only** — never mutates |
| `supabaseAdmin` | service role | **API route mutations** — bypasses RLS |

> **RLS:** Most tables have RLS disabled — auth is enforced at the API route level via Privy. Exception: `masters` table has RLS enabled with a `public_read_active_masters` policy (anon can read `is_active = true` rows). Never expose `supabaseAdmin` to client-side code.

## Full schema

> **Source of truth:** `src/types/database.types.ts` — keep it in sync with the live Supabase schema after any migration. This table is the human-readable companion (key fields + FK delete behavior).

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
| `tournaments` | name, slug (unique — auto-generated from name, used in URLs), game_id FK (nullable → games), date, prize_pool_cop (deprecated — use tournament_prizes), max_participants, status (upcoming/live/completed), location_type (presencial/online/mixto), image_url, description, sponsor_name, sponsor_website_url, sponsor_logo_url, is_active, is_registration_open, sort_order, **entry_fee_tokens** (NUMERIC nullable), **entry_fee_cop** (INT nullable) — both null = free tournament (v2.41.0), **treasury_address** (text nullable, EVM address — per-tournament $1UP treasury; required when entry_fee_tokens > 0, never reuses pass_config; v2.41.0) |
| `tournament_entry_orders` | Entry-fee payment record (v2.41.0, mirrors pass_orders) — tournament_id FK (CASCADE), user_profile_id FK (CASCADE), privy_user_id, registration_id FK → tournament_registrations (SET NULL — linked once the slot is taken), payment_method (token/bank), amount_tokens/amount_cop, wallet_address, tx_hash (lower() UNIQUE partial), block_number, bank_account_id FK, comprobante_url, status (`tournament_entry_status`: pending_bank/confirmed/rejected/cancelled), rejection_reason, reviewed_by/at. Partial UNIQUE: one in-flight (pending_bank/confirmed) order per user+tournament. A `confirmed` order with null registration_id = paid-but-full → manual refund |
| `tournament_prizes` | tournament_id FK → tournaments (CASCADE), position (1–3 unique per tournament), prize_type (tokens/cop/both), amount_tokens (nullable NUMERIC), amount_cop (nullable INTEGER) — DB CHECK enforces type/amount consistency |
| `tournament_registrations` | tournament_id FK → tournaments (CASCADE), user_profile_id FK → user_profiles (CASCADE), privy_user_id, status (registered/cancelled/attended/no_show), registered_at, cancelled_at — UNIQUE (tournament_id, user_profile_id). RPC `register_for_tournament` enforces capacity + uniqueness atomically |
| `international_tournaments` | name, organizer, date, country, city, game_id FK (nullable → games), registration_link, image_url, description, is_active, sort_order — no prizes/registrations/capacity lifecycle |
| `tournament_results` | tournament_id FK → tournaments (CASCADE), user_profile_id FK → user_profiles (CASCADE), position (1–3), points, awarded_by, prize_status (prize_delivery_status: no_prize/pending/sent — auto-set on INSERT from tournament_prizes), prize_tx_hash, prize_sent_at, prize_sent_by, prize_comprobante_url — UNIQUE per tournament+position and per tournament+user |
| `hall_of_fame` | PostgreSQL VIEW: user_profile_id, username, nombre, apellidos, gold_count, silver_count, bronze_count, total_points, avatar_url — ordered by points DESC then gold_count DESC |
| `brackets` | id (bigint PK), tournament_id FK → tournaments (UNIQUE CASCADE), format (bracket_format enum: single_elimination/double_elimination), status (bracket_status enum: draft/published/in_progress/completed), participant_count, rounds_winners, rounds_losers, created_at, updated_at |
| `bracket_participants` | id (bigint PK), bracket_id FK → brackets (CASCADE), seed (1-based), display_name, user_profile_id FK → user_profiles (nullable), eliminated (bool default false), created_at |
| `bracket_matches` | id (bigint PK), bracket_id FK → brackets (CASCADE), bracket_side (text: winners/losers/grand_final), round, match_number, p1_id/p2_id FK → bracket_participants (nullable), p1_score/p2_score, winner_id/loser_id FK → bracket_participants, state (match_state enum: pending/ready/in_progress/completed/bye), p1_source/p2_source (slot_source enum: seed/winner_of/loser_of/bye), p1_source_match_id/p2_source_match_id self-ref, next_match_id self-ref (where winner advances), next_match_slot (1 or 2), next_loser_match_id self-ref (DE — where loser drops), next_loser_slot, created_at, updated_at |

> **Admin Server Components must use `supabaseAdmin`** (service role key), never `supabase` (anon). RLS policies on tables like `masters` silently filter inactive records from the anon client — admin panels need to see everything.

> **Admin failure UX: use the shared toast, not `alert()` or silent failure.** The admin `(protected)` layout wraps every page in `AdminToastProvider` (`src/components/admin/ui/Toast.tsx`). In any `"use client"` admin component, call `const { showError, showSuccess, showInfo } = useAdminToast();` and surface every API failure through it. Existing inline `setSaveError` banners can stay where they're working, but new code uses the toast. **Never use `alert()`** — it breaks the design system flow.

## Full API route reference

All `/api/admin/*` require a Privy Bearer token + isAdmin check.

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
| `GET /api/user/passes` | Privy user | List the caller's passes (the `passes` asset rows) with state |
| `POST /api/user/passes/activate` | Privy user | Activate an own `issued` pass (claim-later) — sets `state='active'`, `activated_at`, stacked `expires_at`. Guarded by `canActivatePass()` + idempotent row-count update; rate-limited |
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
| `GET\|POST /api/user/tournament-entry-orders` | Privy user | v2.41.0 — list own entry-fee orders (`?tournamentId=`) / pay a tournament entry fee. POST (rate-limited): `paymentMethod: "token"` → tx-first on-chain verify (`verifyPassTransfer`, treasury = the tournament's own `treasury_address` — NOT pass_config; fails closed 503 if null, wallet pinned via `getVerifiedWallet`) → order `confirmed` → `register_for_tournament` RPC → link `registration_id`; RPC `full` after payment keeps the confirmed order unlinked + returns the manual-refund 409. `paymentMethod: "bank"` → comprobante (pending path, moved to `entry-{id}/receipt.*`) → order `pending_bank`. 409 dup tx_hash / in-flight order / already registered; 422 bad transfer; 400 free tournament or method not offered |
| `GET\|PATCH /api/admin/tournament-entry-orders` | isAdmin | v2.41.0 — list entry orders (`?tournamentId=`, `?status=`, comprobantes signed) / approve or reject a `pending_bank` order (`canReviewEntryOrder` guard). Approve runs the RPC first — `full` returns 409 telling the admin to reject + refund manually (no refunds in v1) — then sets `confirmed` + `registration_id` |
| `GET\|PATCH /api/admin/tournament-registrations` | isAdmin | List all registrations (filter by tournamentId) / update status (attended/no_show) |
| `POST\|DELETE /api/admin/tournament-results` | isAdmin | Upsert podium result (position 1–3 with points) / delete by id |
| `POST /api/admin/tournament-results/deliver-pass` | isAdmin | Issue a **claimable** 1UP Pass to a podium winner (v2.39.0) — inserts a `passes` row in `issued` state (`source='tournament_prize'`), links `tournament_results.pass_id`, emails the winner to activate. Idempotent (partial UNIQUE on `pass_id`) |
| `POST /api/admin/passes/revoke` | isAdmin | Revoke a delivered pass (v2.40.0) — `state='revoked'` + unlinks `tournament_results.pass_id` so the prize can be re-delivered. Idempotent (state-guarded) |
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
| `GET\|POST\|PATCH\|DELETE /api/admin/brackets` | isAdmin | See **Bracket lifecycle** below — the bracket is the single source of truth for tournament lifecycle AND the podium. |

## Bracket lifecycle (`/api/admin/brackets`)

**The bracket is the single source of truth for tournament lifecycle AND the podium.**

- **GET** — fetch bracket + participants + matches.
- **POST** — seed as **draft** from an ordered `participantIds[]` (2-phase insert + pointer wiring + bye auto-advance + **DE bye-cascading**) — tournament stays `upcoming`.
- **PATCH** is action-based:
  - `start` — draft→in_progress, locks structure, sets tournament `live` and forces `is_registration_open = false`.
  - `result` — pick winnerId, advance; **when the last match completes the tournament auto-flips to `completed` AND `tournament_results` is auto-filled from `derivePodium()`** — manual overrides via POST `/api/admin/tournament-results` are preserved (auto-fill only INSERTs missing positions; auto-rows are stamped `awarded_by = "system:auto-podium"`).
  - `undo` — safe revert if no downstream match played; **reverts a completed tournament back to `live` when the final match is undone AND deletes auto-podium rows** so re-completion can re-derive accurately — manual rows are kept.
  - `swap_slots` (v2.36.15) — manual override of draft pairings; body `{ matchId1, slot1, matchId2, slot2 }`; guards: bracket must be `draft`, both slots must hold real participants — used by the click-to-swap UI on the draft pairings preview.
- **DELETE** refuses with 409 unless `bracket.status = 'draft'` — a running/finished bracket cannot be wiped or re-seeded.

**DE bye-cascading (v2.36.14):** for non-pow2 double-elim, LB slots whose feeder WB match is a BYE get `p_source='bye'` at creation (phantom); fully-phantom LB matches cascade their phantom forward; at PATCH `result`, when a WB loser lands next to a phantom slot, `cascadeLbAdvance()` auto-completes the LB match and recursively advances the loser through any chain of phantom slots — so non-pow2 DE brackets never end up with LB matches stuck pending.

**Single-elim non-pow2 (v2.36.13)** uses a `Play-in` round (round 0) instead of byes.

Public bracket (`/api/tournaments/[slug]/bracket` + tournament page) only shows `in_progress`/`completed` brackets — drafts stay private.

## Type system

Types live in `src/types/database.types.ts`. The bottom of the file exports convenience aliases:

```ts
// These are Supabase Row types (snake_case fields) — NOT Drizzle types
export type GameCategory = Database["public"]["Tables"]["game_categories"]["Row"];
export type Game         = Database["public"]["Tables"]["games"]["Row"];
export type Player       = Database["public"]["Tables"]["players"]["Row"];
export type Master       = Database["public"]["Tables"]["masters"]["Row"];
export type Aliado       = Database["public"]["Tables"]["aliados"]["Row"];
// ... etc.
```

**Always import types from `@/types/database.types`** in components and API routes.

## Schema change workflow

When adding or modifying a DB column:

1. **Apply migration** via Supabase MCP: `mcp__plugin_supabase_supabase__apply_migration`
   ```sql
   ALTER TABLE table_name ADD COLUMN column_name TYPE;
   ```
2. **Update `src/types/database.types.ts`** manually — add the field to the matching Row/Insert/Update blocks and keep the convenience aliases at the bottom intact
3. **Update API routes** — add the new column to POST/PUT insert/update objects
4. **Update admin client** — add field to form state + modal UI

## Column naming convention

DB columns: `snake_case`  →  API/client bodies: `camelCase`

```ts
// In API route — mapping camelCase body → snake_case DB:
await supabaseAdmin.from("players").insert({
  real_name:     body.realName,
  photo_url:     body.photoUrl,
  instagram_url: body.instagramUrl,
  sort_order:    body.sortOrder ?? 0,
});
```

## Image storage (Supabase Storage)

All images are stored in the **`images`** bucket in Supabase Storage (public, 5MB limit).

```ts
import { uploadImage } from "@/lib/blob";
// folder: "players" | "courses" | "games" | "categories" | "floors" | "masters" | "aliados" | "site" | "brand-logos" | "tournaments"
const url = await uploadImage(file, "players", entityId); // returns public Supabase Storage URL
```

The bucket uses folder structure: `images/players/{id}/cover`, `images/tournaments/{id}/cover`, etc.

- **Upload**: `supabaseAdmin.storage.from("images").upload(path, file)` (service role — server-side only)
- **Public URL**: `supabaseAdmin.storage.from("images").getPublicUrl(path).data.publicUrl`
- **Policies**: public read for everyone; write restricted to service role

This runs **server-side only** (inside `/api/admin/upload/route.ts`). Never import `blob.ts` in client components.

## No Drizzle

Drizzle was removed from this project. Do not import from `@/db` or `@/db/schema`. All DB access is via `supabase` / `supabaseAdmin` from `@/lib/supabase`.
