---
name: admin-crud
description: Admin panel architecture for 1UP — 5-step CRUD pattern, auth, image uploads, revalidatePath map, and all admin routes.
type: project
filePattern: src/{app/admin,components/admin}/**
---

# Admin CRUD — 1UP Gaming Tower

## The 5-step pattern (every admin section follows this exactly)

1. **Server Component** (`src/app/admin/(protected)/xxx/page.tsx`) — fetches via `supabase` (anon), passes as props
2. **Client Component** (`src/components/admin/AdminXxxClient.tsx`) — `useState` for list + modal + form
3. **Modal form** — opens for create/edit, calls `/api/admin/xxx` with Bearer token
4. **API route** (`src/app/api/admin/xxx/route.ts`) — `checkAdmin()` → `supabaseAdmin` mutation → `revalidatePath()`
5. **Client refresh** — `router.refresh()` after success

## checkAdmin pattern (use this exact version)

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

## Error handling pattern (mandatory on all saves)

```ts
const res = await fetch("/api/admin/xxx", { method, headers: await authHeaders(), body: JSON.stringify(body) });
if (!res.ok) { setSaveError("Error al guardar. Intenta de nuevo."); setLoading(false); return; }
setSaveError(null); setOpen(false); setLoading(false); router.refresh();
```

Always render `{saveError && <p className="text-error font-headline font-bold text-xs uppercase mb-3">{saveError}</p>}` before the modal button row.

## Image upload pattern

Every admin form that has an image field uses the `ImageUpload` component:

```tsx
import { ImageUpload } from "./ImageUpload";

// Inside modal:
<ImageUpload
  currentUrl={form.imageUrl || null}
  folder="courses"          // "players" | "courses" | "games" | "floors" | "masters" | "aliados"
  aspectRatio="video"       // "video" (16:9) | "square" (1:1)
  onUploaded={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
  getAccessToken={getAccessToken}
/>
```

The component POSTs `FormData` to `/api/admin/upload` (auth-protected), which uploads to Supabase Storage `images` bucket, and returns `{ url }`. No `Content-Type` header on FormData requests — browser sets the multipart boundary automatically.

## revalidatePath map

| Entity mutated | revalidatePath calls |
|---------------|---------------------|
| Players | `/team`, `/admin/players` |
| Competitions | `/team`, `/admin/competitions` |
| Courses | `/academia`, `/admin/courses` |
| Masters | `/masters`, `/academia`, `/admin/masters` |
| Aliados | `/admin/aliados` |
| Academia content | `/academia`, `/admin/courses` |
| Discounts | `/academia`, `/admin/discounts` |
| Floor info | `/gaming-tower`, `/admin/floors` |
| Pass benefits | `/gaming-tower`, `/admin/1pass` |
| Games | `/`, `/juegos`, `/admin/games` |
| Game categories | `/`, `/juegos`, `/admin/games` |
| Social links | `revalidatePath("/", "layout")` — footer is in shared layout, must bust all public pages |
| Site content (images) | `/`, `/gaming-tower`, `/academia`, `/admin/site-images` |
| Bank accounts | `/admin/bank-accounts`, `/app` |
| Token purchase orders | `/admin/token-orders`, `/app` |
| Pass config | `/gaming-tower`, `/admin/1pass` |
| Pass orders | `/admin/pass-orders`, `/app/pass` |
| Referral codes | `/admin/referral-codes` |
| User onboarding | `/app`, `/admin/referral-codes` |

## All admin routes

| Page | Component | API endpoint | Methods |
|------|-----------|-------------|---------|
| `/admin` | `AdminDashboard` | — | — |
| `/admin/games` | `AdminGamesClient` | `/api/admin/games` + `/api/admin/game-categories` | POST/PUT/DELETE + PUT |
| `/admin/floors` | `AdminFloorsClient` | `/api/admin/floors` | POST/PUT/DELETE |
| `/admin/players` | `AdminPlayersClient` | `/api/admin/players` | POST/PUT/DELETE |
| `/admin/competitions` | `AdminCompetitionsClient` | `/api/admin/competitions` | POST/PUT/DELETE |
| `/admin/masters` | `AdminMastersClient` | `/api/admin/masters` | POST/PUT/DELETE |
| `/admin/courses` | `AdminCoursesClient` | `/api/admin/courses` + `/api/admin/academia-content` | POST/PUT/DELETE — course CRUD + inline content CRUD (content sub-modal inside course edit modal at z-60) |
| `/admin/1pass` | `Admin1PassClient` | `/api/admin/pass-config` + `/api/admin/pass-benefits` | GET/PUT + POST/PUT/DELETE |
| `/admin/pass-orders` | `AdminPassOrdersClient` | `/api/admin/pass-orders` | GET/PATCH |
| `/admin/discounts` | `AdminDiscountsClient` | `/api/admin/discounts` | POST/PUT/DELETE |
| `/admin/enrollments` | read-only table | — | — |
| `/admin/aliados` | `AdminAliadosClient` | `/api/admin/aliados` | POST/PUT/DELETE |
| `/admin/token-orders` | `AdminTokenOrdersClient` | `/api/admin/token-orders` | GET/PATCH (approve via wallet-send / reject) |
| `/admin/bank-accounts` | `AdminBankAccountsClient` | `/api/admin/bank-accounts` | POST/PUT/DELETE |
| `/admin/site-images` | `AdminSiteImagesClient` | `/api/admin/upload` | POST (image upload) |
| `/admin/referral-codes` | `AdminReferralCodesClient` | `/api/admin/referral-codes` | GET/POST/PUT |
| `/admin/social-links` | `AdminSocialLinksClient` | `/api/admin/social-links` | PUT |
| `/admin/privy-users` | read-only merged view | — | — |
| `/admin/user-profiles` | `AdminUserProfilesClient` | — (read-only) | — |
| `/admin/submissions` | read-only table | — | — |
| `/admin/users` | `AdminUsersClient` | `/api/admin/users` | GET/POST/DELETE |

**Special endpoints:**
- `/api/admin/upload` — POST multipart/form-data → Supabase Storage `images` bucket → returns `{ url }`
- `/api/admin/game-categories` — PUT only (update name/slug/image_url)
- `/api/admin/users` — manage the `admin_users` DB table

## Admin sidebar groups (AdminSidebar.tsx)

Sidebar is organized into 4 labeled groups:

| Group | Items |
|-------|-------|
| **Sitio Web** | Dashboard, Juegos, Gaming Tower, Jugadores, Competiciones, Masters, Imágenes del Sitio, Links Sociales |
| **Academia & App** | Cursos (includes inline content management), 1UP Pass, Descuentos, Inscripciones |
| **OTC / Tokens** | Órdenes $1UP, Cuentas Bancarias |
| **Sistema** | Usuarios Privy, Referidos, Aliados, Solicitudes, Admins |

> `Pass Benefits` was removed as a standalone page — benefits are now managed inline inside `/admin/1pass`.

When adding a new admin section, add its `{ href, icon, label }` to the appropriate group in `GROUPS` in `src/components/admin/AdminSidebar.tsx`.

## Admin users system

Two tiers of admin access:
- **Root admins** (env) — `ADMIN_EMAILS` env var, always have access, cannot be removed from UI
- **DB admins** — stored in `admin_users` table, managed via `/admin/users` page

`isEnvAdmin(email)` — sync check for root admin (used in UI-level checks)
`isAdmin(email)` — async, checks env first then DB table
