

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

| Table | Columns |
|-------|---------|
| `game_categories` | `id`, `name`, `slug`, `image_url`, `sort_order`, `created_at` |
| `games` | `id`, `name`, `category_id` → game_categories (CASCADE), `image_url`, `sort_order`, `created_at` |
| `players` | `id`, `gamertag`, `real_name`, `role`, `photo_url`, `instagram_url`, `tiktok_url`, `kick_url`, `youtube_url`, `sort_order`, `is_active`, `created_at` |
| `competitions` | `id`, `tournament_name`, `country`, `city`, `year`, `result`, `player_id` → players (SET NULL), `created_at` |
| `courses` | `id`, `name`, `category` (Performance\|Technology\|Gaming), `description`, `price_cop`, `duration_hours`, `image_url`, `master_id` → masters (SET NULL), `sort_order`, `is_active`, `created_at` |
| `masters` | `id`, `name`, `specialty`, `bio`, `photo_url`, `instagram_url`, `tiktok_url`, `twitter_url`, `youtube_url`, `linkedin_url`, `topics` (text[]), `sort_order`, `is_active`, `created_at` |
| `aliados` | `id`, `name`, `nit`, `email`, `api_url`, `api_key`, `logo_url`, `is_active`, `created_at` |
| `academia_content` | `id`, `course_id` → courses (CASCADE), `content_type` (video\|document\|quiz), `title`, `description`, `url`, `sort_order`, `is_published`, `created_at` |
| `pass_benefits` | `id`, `title`, `description`, `sort_order`, `created_at` |
| `floor_info` | `id`, `floor_label` (01\|02-03\|04-05\|06), `title`, `description`, `accent_color`, `image_url`, `sort_order`, `created_at` |
| `discount_rules` | `id`, `trigger_type`, `discount_pct`, `applies_to`, `aliado_id` → aliados (SET NULL), `is_active`, `valid_from`, `valid_until`, `created_at` |
| `enrollments` | `id`, `user_profile_id` → user_profiles, `course_id` → courses (SET NULL), `final_price_cop`, `payment_status`, `mp_payment_id`, `created_at` |
| `user_profiles` | `id`, `privy_user_id`, `tipo_documento`, `numero_documento`, `comfenalco_afiliado`, `verified_aliados` (text[]), `created_at` |
| `recruitment_submissions` | `id`, `name`, `email`, `phone`, `category_id`, `game_id`, `gamertag`, `portfolio_url`, `message`, `source`, `created_at` |
| `admin_users` | `id`, `email`, `added_by`, `created_at` |
| `brand_logos` | `id`, `name`, `logo_url`, `website_url` (nullable), `sort_order`, `is_active`, `created_at` |
| `tournaments` | `id`, `name`, `game_id` → games (SET NULL), `date` (timestamptz), `prize_pool_cop`, `max_participants`, `status` (upcoming\|live\|completed), `location_type` (presencial\|online\|mixto), `image_url`, `description`, `is_active`, `is_registration_open`, `sort_order`, `created_at` |

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
