---
name: fix-error
description: Systematic error resolution for 1UP — TypeScript errors, Supabase query failures, build failures, runtime errors, RLS issues, and revalidatePath gaps.
type: skill
trigger: when any build error, TypeScript error, ESLint error, or runtime error appears
---

# Fix Error — 1UP Gaming Tower

Activate this skill the moment any error appears. Work systematically — fix root cause, never patch symptoms.

---

## Step 1 — Classify the error

| Error type | Typical symptom | Go to |
|-----------|----------------|-------|
| TypeScript type mismatch | `Type 'X' is not assignable to type 'Y'` | Section A |
| Supabase returns empty / wrong data | Admin shows 0 rows, public page missing records | Section B |
| Build failure (`npm run build`) | Module not found, type error in production | Section C |
| API returns 401/403 unexpectedly | Unauthorized in network tab | Section D |
| Public page not updating after admin save | Stale data after create/edit/delete | Section E |
| Runtime error in browser | Component crash, white screen | Section F |

---

## Section A — TypeScript type errors

1. Check what type is expected vs what's being passed.
2. If the error is on a Supabase query result: the type in `database.types.ts` may be out of date. Regenerate:
   - Use `mcp__plugin_supabase_supabase__generate_typescript_types`
   - Paste the new output into `src/types/database.types.ts` (keep the convenience aliases at the bottom)
3. If mapping DB snake_case → camelCase, check the exact column name in `database.types.ts`.
4. If `Property 'X' does not exist on type 'Y'`: check if the column was recently added to the schema but `database.types.ts` wasn't updated.
5. Run `npx tsc --noEmit` to confirm fix.

---

## Section B — Supabase returns empty or missing rows

The most common cause is **RLS (Row Level Security)**.

**Diagnosis:**
- Are you using `supabase` (anon key) instead of `supabaseAdmin` (service role)?
- Is this in an admin Server Component? → Always use `supabaseAdmin`.
- Is this the `masters` table? → RLS is enabled on it; anon key only returns `is_active = true` rows.

**Fix pattern:**
```ts
// Wrong — anon key respects RLS:
import { supabase } from "@/lib/supabase";
const { data } = await supabase.from("masters").select("*");

// Correct for admin pages — bypasses RLS:
import { supabaseAdmin as supabase } from "@/lib/supabase";
const { data } = await supabase.from("masters").select("*");
```

Also check:
- Is there a `.eq("is_active", true)` filter that's incorrectly applied on the admin page?
- Is there a JOIN (`select("*, related_table(*)")`) that silently fails due to a missing FK?

---

## Section C — Build failures

1. Run `npm run build` and read the full error.
2. Most common: a Server Component is importing a Client-only module (e.g., `usePrivy`). Check `"use client"` directive is present.
3. `Module not found: @/db/*` — Drizzle was removed in v1.3.9. If anything imports from `@/db/`, update it to use Supabase JS directly.
4. Missing env var at build time: Next.js build bakes `NEXT_PUBLIC_*` vars. Confirm they're in `.env.local`.
5. After fixing, always run `npx tsc --noEmit` first (faster) before running the full build.

---

## Section D — API returns 401 / 403

**401 Unauthorized:**
- Client is not sending the `Authorization: Bearer <token>` header.
- `getAccessToken()` returned `null` — user session expired. Redirect to login.
- Privy token is stale (> 1 hour). Client needs to refresh.

**403 Forbidden (non-admin):**
- The email resolved by `resolveUserEmail(claims.userId)` is not in `ADMIN_EMAILS` env var or `admin_users` table.
- Check: is the user logged in with Google/Discord OAuth? → `resolveUserEmail` must be used (not `claims.user.email`).

**Verify the checkAdmin pattern is exactly:**
```ts
async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}
```

---

## Section E — Public page not updating after admin save

The mutation is succeeding but `revalidatePath` is missing or wrong.

**Check the route handler** — does it call `revalidatePath` for BOTH the admin page AND the public page?

Consult the revalidatePath map in `.claude/skills/admin-crud.md`. Example for courses:
```ts
revalidatePath("/academia");
revalidatePath("/admin/courses");
```

For `social_links` mutations: use `revalidatePath("/", "layout")` to bust the shared footer layout.

If the admin client uses `router.refresh()` but the public page is still stale: `router.refresh()` only refreshes the current page's RSC cache, not other pages. `revalidatePath` is mandatory.

---

## Section F — Runtime errors in browser

1. Open browser console — read the full error + stack trace.
2. Most common: accessing `.map()` on `undefined` — a Server Component passed a nullable prop without a fallback. Add `?? []`.
3. `Cannot read properties of null` on a Privy hook — user is not authenticated. Wrap with `if (!authenticated) return null`.
4. Hydration mismatch: a Server Component and Client Component render different HTML. Usually caused by using `Date.now()` or random values without `suppressHydrationWarning`.
5. `useRouter` outside of client component: add `"use client"` directive.

---

## After fixing any error

1. Run `npx tsc --noEmit` — confirm zero errors.
2. Run `npm run build` if the error was a build failure.
3. Add a `CHANGELOG.md` PATCH entry: `[X.Y.Z+1] — YYYY-MM-DD → Fixed: [one-line description]`.
4. Do NOT refactor surrounding code — fix only what's broken.
