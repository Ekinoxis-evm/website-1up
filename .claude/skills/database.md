---
name: database
description: Database layer for 1UP — dual Supabase clients, full schema reference, migration workflow, and type system.
type: project
filePattern: src/{db,lib/supabase.ts,app/api}/**
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

> **RLS is disabled on all tables.** Auth is enforced at the API route level via Privy. Never expose `supabaseAdmin` to client-side code.

## Full schema

| Table | Columns |
|-------|---------|
| `game_categories` | `id`, `name`, `slug`, **`image_url`**, `sort_order`, `created_at` |
| `games` | `id`, `name`, `category_id` → game_categories (CASCADE), **`image_url`**, `sort_order`, `created_at` |
| `players` | `id`, `gamertag`, `real_name`, `role`, **`photo_url`**, `instagram_url`, `tiktok_url`, `kick_url`, `youtube_url`, `sort_order`, `is_active`, `created_at` |
| `competitions` | `id`, `tournament_name`, `country`, `city`, `year`, `result`, `player_id` → players (SET NULL), `created_at` |
| `courses` | `id`, `name`, `category` (Performance\|Technology\|Gaming), `description`, `price_cop`, `duration_hours`, `payment_link`, **`image_url`**, `sort_order`, `is_active`, `created_at` |
| `pass_benefits` | `id`, `title`, `description`, `sort_order`, `created_at` |
| `floor_info` | `id`, `floor_label` (01\|02-03\|04-05\|06), `title`, `description`, `accent_color`, **`image_url`**, `sort_order`, `created_at` |
| `recruitment_submissions` | `id`, `name`, `email`, `phone`, `category_id` → game_categories, `game_id` → games, `gamertag`, `portfolio_url`, `message`, `source` (home\|team), `created_at` |
| `admin_users` | `id`, `email`, `added_by`, `created_at` |

## Type system

Types live in `src/types/database.types.ts`. The bottom of the file exports convenience aliases:

```ts
// These are Supabase Row types (snake_case fields) — NOT Drizzle types
export type GameCategory = Database["public"]["Tables"]["game_categories"]["Row"];
export type Game         = Database["public"]["Tables"]["games"]["Row"];
export type Player       = Database["public"]["Tables"]["players"]["Row"];
// ... etc.
```

**Always import types from `@/types/database.types`** in components and API routes — not from `@/db/schema`. The schema file is for Drizzle/seeding only.

## Schema change workflow

When adding or modifying a DB column:

1. **Apply migration** via Supabase MCP: `mcp__plugin_supabase_supabase__apply_migration`
   ```sql
   ALTER TABLE table_name ADD COLUMN column_name TYPE;
   ```
2. **Update Drizzle schema** (`src/db/schema.ts`) — add the field to the matching table definition
3. **Regenerate types** via Supabase MCP: `mcp__plugin_supabase_supabase__generate_typescript_types`
4. **Update `database.types.ts`** — paste the new generated content, keep the convenience aliases at the bottom intact
5. **Update API routes** — add the new column to POST/PUT insert/update objects
6. **Update admin client** — add field to form state + modal UI

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

## Drizzle (schema + seeding only)

```ts
import { db } from "@/db";
import { games, players } from "@/db/schema";
import { eq } from "drizzle-orm";

// Use for seeding / migrations only
await db.insert(games).values({ name: "Street Fighter 6", categoryId: 1 });
```

Drizzle `db` uses `DATABASE_URL` (Supabase Transaction pooler connection string). Do NOT use Drizzle in API routes or Server Components — use `supabase` / `supabaseAdmin` instead.

## Image storage

```ts
import { uploadImage } from "@/lib/blob";
// folder: "players" | "courses" | "games" | "floors"
const url = await uploadImage(file, "players"); // returns public Vercel Blob URL
```

This runs **server-side only** (inside `/api/admin/upload/route.ts`). Never import `blob.ts` in client components.
