---
name: admin-crud
description: Admin panel architecture for 1UP — 5-step CRUD pattern, auth, image uploads, revalidatePath map, and all admin routes.
type: project
filePattern: src/{app/admin,components/admin}/**
---

# Admin CRUD — 1UP Gaming Tower

## The 5-step pattern (every admin section follows this exactly)

1. **Server Component** (`src/app/admin/xxx/page.tsx`) — fetches via `supabase` (anon), passes as props
2. **Client Component** (`src/components/admin/AdminXxxClient.tsx`) — `useState` for list + modal + form
3. **Modal form** — opens for create/edit, calls `/api/admin/xxx` with Bearer token
4. **API route** (`src/app/api/admin/xxx/route.ts`) — `checkAdmin()` → `supabaseAdmin` mutation → `revalidatePath()`
5. **Client refresh** — `router.refresh()` after success

## checkAdmin pattern (current — use this exact version)

```ts
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

// In every handler:
if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

> **Why `resolveUserEmail`?** Google/Discord OAuth users don't set `user.email.address` — it resolves email from whichever auth method the user used.

## Client-side auth headers

```ts
const { getAccessToken } = usePrivy();

async function authHeaders() {
  const token = await getAccessToken();
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}
```

## Image upload pattern

Every admin form that has an image field uses the `ImageUpload` component:

```tsx
import { ImageUpload } from "./ImageUpload";

// Inside modal:
<ImageUpload
  currentUrl={form.imageUrl || null}
  folder="courses"          // "players" | "courses" | "games" | "floors"
  aspectRatio="video"       // "video" (16:9) | "square" (1:1)
  onUploaded={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
  getAccessToken={getAccessToken}
/>
```

The component POSTs `FormData` to `/api/admin/upload` (auth-protected), gets back `{ url }`, and calls `onUploaded`. No `Content-Type` header on FormData requests — browser sets the multipart boundary automatically.

The resulting URL is stored in `form.imageUrl` and sent as part of the normal JSON body.

## revalidatePath map

| Entity mutated | revalidatePath calls |
|---------------|---------------------|
| Players | `/team`, `/admin/players` |
| Competitions | `/team`, `/admin/competitions` |
| Courses | `/academia`, `/admin/courses` |
| Floor info | `/gaming-tower`, `/admin/floors` |
| Pass benefits | `/gaming-tower`, `/admin/pass-benefits` |
| Games | `/`, `/juegos`, `/admin/games` |
| Game categories | `/`, `/juegos`, `/admin/games` |

## All admin routes

| Page | Component | API endpoint | Methods |
|------|-----------|-------------|---------|
| `/admin` | `AdminDashboard` | — | — |
| `/admin/games` | `AdminGamesClient` | `/api/admin/games` + `/api/admin/game-categories` | POST/PUT/DELETE + PUT |
| `/admin/players` | `AdminPlayersClient` | `/api/admin/players` | POST/PUT/DELETE |
| `/admin/competitions` | `AdminCompetitionsClient` | `/api/admin/competitions` | POST/PUT/DELETE |
| `/admin/courses` | `AdminCoursesClient` | `/api/admin/courses` | POST/PUT/DELETE |
| `/admin/floors` | `AdminFloorsClient` | `/api/admin/floors` | POST/PUT/DELETE |
| `/admin/pass-benefits` | `AdminPassBenefitsClient` | `/api/admin/pass-benefits` | POST/PUT/DELETE |
| `/admin/submissions` | read-only table | — | — |
| `/admin/users` | `AdminUsersClient` | `/api/admin/users` | GET/POST/DELETE |

**Special endpoints:**
- `/api/admin/upload` — POST multipart/form-data → Vercel Blob → returns `{ url }`
- `/api/admin/game-categories` — PUT only (update name/slug/image_url)
- `/api/admin/users` — manage the `admin_users` DB table

## Admin users system

Two tiers of admin access:
- **Root admins** (env) — `ADMIN_EMAILS` env var, always have access, cannot be removed from UI
- **DB admins** — stored in `admin_users` table, managed via `/admin/users` page

`isEnvAdmin(email)` — sync check for root admin (used in UI-level checks)
`isAdmin(email)` — async, checks env first then DB table

## Admin sidebar items (AdminSidebar.tsx)

When adding a new admin section, add to `MODULES` array in `src/components/admin/AdminSidebar.tsx`.
