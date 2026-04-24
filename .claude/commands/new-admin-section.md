Add a new admin CRUD section to the 1UP Gaming Tower admin panel.

Follow the mandatory 5-step pattern EXACTLY. Do not deviate.

## Step 0 — Understand the entity

Before writing code, confirm:
1. What is the table name in Supabase? Check `src/types/database.types.ts` for the Row type.
2. What fields need to be editable in the admin?
3. Does it need an image upload? Which folder? (`players` | `courses` | `games` | `floors` | `masters` | `aliados`)
4. Which public pages need `revalidatePath` after mutations?
5. Which sidebar group does it belong to? (`Sitio Web` | `Academia & App` | `Sistema`)

## Step 1 — Server Component page

Create `src/app/admin/(protected)/[section]/page.tsx`:

```tsx
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { AdminXxxClient } from "@/components/admin/AdminXxxClient";

export default async function AdminXxxPage() {
  const { data: items } = await supabase.from("table_name").select("*").order("sort_order");
  return <AdminXxxClient initialItems={items ?? []} />;
}
```

**Use `supabaseAdmin`** (service role) for Server Components in admin — RLS may filter records from the anon client.

## Step 2 — Client Component

Create `src/components/admin/AdminXxxClient.tsx`:

```tsx
"use client";
import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import type { XxxRow } from "@/types/database.types";

// authHeaders helper
async function authHeaders(getAccessToken: () => Promise<string | null>) {
  const token = await getAccessToken();
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}
```

State pattern:
- `items` — local copy of the list (initialized from `initialItems` prop)
- `open` — modal open/closed
- `editing` — the row being edited (`XxxRow | null`)
- `form` — form field values
- `loading` — save button state
- `saveError` — inline error message (always render it above the button row)

## Step 3 — Modal form

Modal overlay pattern (mandatory):
```tsx
<div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
  <div className="bg-surface-container border-4 border-primary-container p-8 w-full max-w-lg my-8">
```

Close button in top-right corner.
`{saveError && <p className="text-error font-headline font-bold text-xs uppercase mb-3">{saveError}</p>}` before button row.
Save button: `className="bg-primary-container text-white font-headline font-black px-6 py-3 hover:opacity-90 disabled:opacity-50"`.

## Step 4 — API route

Create `src/app/api/admin/[section]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}
```

Every handler: `if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });`

Map camelCase body → snake_case insert/update.

After every mutation: `revalidatePath("/public-page"); revalidatePath("/admin/[section]");`

## Step 5 — Wire up navigation

Add to all three nav files:

1. `src/components/admin/AdminSidebar.tsx` — add `{ href: "/admin/[section]", icon: "material_icon", label: "Label" }` to the right group.

No other nav files need updating for admin-only pages.

## Step 6 — Update docs (Rule 8 — mandatory)

After implementing:
1. Update `CHANGELOG.md` — new MINOR version entry
2. Update `.claude/skills/admin-crud.md` — add to "All admin routes" table + revalidatePath map
3. Update `CLAUDE.md` — add to Route Map and API routes table if new endpoint
4. Update `README.md` if the section changes public-facing routes

## Step 7 — Verify

```bash
npm run build
npx tsc --noEmit
```

Zero errors before shipping.
