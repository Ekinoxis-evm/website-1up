# Coding Style — 1UP Gaming Tower

Derived from the actual codebase patterns. Follow these exactly.

---

## TypeScript

- Strict mode is on. No `any` — use `unknown` and narrow, or use Supabase Row types.
- Always import DB types from `@/types/database.types` — never from `src/db/schema.ts` (Drizzle was removed).
- Component props: inline `{ prop: Type }` in function signature, no separate `interface Props`.
- Use `const` for everything; `let` only when you actually reassign.
- Async Server Components return `JSX.Element` implicitly — no explicit return type needed.

---

## Naming

| Context | Convention | Example |
|---------|-----------|---------|
| DB columns | `snake_case` | `photo_url`, `is_active` |
| API body keys | `camelCase` | `photoUrl`, `isActive` |
| React components | `PascalCase` | `AdminMastersClient` |
| Hooks | `camelCase` prefixed `use` | `use1upBalance` |
| Lib functions | `camelCase` | `verifyToken`, `uploadImage` |
| Route files | lowercase Next.js conventions | `route.ts`, `page.tsx` |

---

## Server Components vs Client Components

- **Default to Server Components** — async, no `"use client"`, fetch directly from Supabase.
- **Add `"use client"` only when** the component needs: `useState`, `useEffect`, Privy hooks, or browser APIs.
- **Pattern**: Server Component page → passes DB data as props → Client Component handles UI state.
- Admin pages: Server Component in `src/app/admin/(protected)/xxx/page.tsx`, Client Component in `src/components/admin/AdminXxxClient.tsx`.

---

## Supabase usage

```ts
// Server Component read (never mutates):
import { supabase } from "@/lib/supabase";

// API route mutation (bypasses RLS):
import { supabaseAdmin } from "@/lib/supabase";
```

Never use `supabase` (anon) in API routes that mutate. Never expose `supabaseAdmin` to client-side code.

The `masters` table has RLS that filters `is_active = false` rows from anon reads — always use `supabaseAdmin` in admin Server Components.

---

## API routes

Every admin API route starts with this exact checkAdmin block:

```ts
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { NextRequest, NextResponse } from "next/server";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // ...
}
```

Use `resolveUserEmail` — not `claims.user?.email` — because Google/Discord OAuth users don't populate `user.email`.

---

## Mutations must call revalidatePath

Every API route mutation (POST/PUT/DELETE) calls `revalidatePath` on BOTH the public page and the admin page:

```ts
import { revalidatePath } from "next/cache";
revalidatePath("/masters");
revalidatePath("/academia");
revalidatePath("/admin/masters");
```

Full mapping is in `.claude/skills/admin-crud.md → revalidatePath map`.

---

## Client-side API calls pattern

```ts
"use client";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

const { getAccessToken } = usePrivy();
const router = useRouter();

async function authHeaders() {
  const token = await getAccessToken();
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

// After success:
setOpen(false); setLoading(false); setSaveError(null); router.refresh();

// On failure:
if (!res.ok) { setSaveError("Error al guardar. Intenta de nuevo."); setLoading(false); return; }
```

---

## Tailwind rules (non-negotiable)

1. **0px border-radius** — `rounded-*` is banned except `rounded-full` (for avatars/pills).
2. **No 1px dividers** — no `<hr>`, `border-b`, or `border-t` for visual separation. Use background color shifts.
3. **Public pages only** — no shadcn imports in `src/components/{home,tower,team,academia,recreativo,juegos,masters}/`.
4. **Skew pattern** — outer: `className="skew-fix"`, inner: `className="block skew-content"`.
5. **Glass nav** — TopAppBar always `glass-panel`, never opaque.

---

## Typography classes

```tsx
// Page headline
<h1 className="font-headline font-black text-4xl uppercase tracking-tighter">
  MAIN <span className="text-primary-container">WORD</span>
</h1>
<div className="h-1 w-20 bg-primary-container mt-2" />

// Section label
<p className="font-headline font-bold text-xs uppercase tracking-widest text-outline">LABEL</p>

// Body text
<p className="font-body text-sm text-on-surface-variant">Body copy in Spanish.</p>
```

---

## Icons

- **Admin UI**: Material Symbols via `<span className="material-symbols-outlined">icon_name</span>`
- **Social media**: PNG files in `/public/socialmedia/` — use `<img src="/socialmedia/instagram.png" />`. Mapping in `src/lib/socialIcons.ts`.
- Fill a symbol: `style={{ fontVariationSettings: "'FILL' 1" }}`

---

## Language rules

| Where | Language | Case |
|-------|---------|------|
| Buttons / CTAs | Spanish or English | UPPERCASE |
| Nav links | Mixed | UPPERCASE |
| Section headings | Spanish | Natural |
| Body copy / descriptions | Spanish | Natural |
| Admin panel labels | Spanish | Natural (used by 1UP team) |
| Error messages | Spanish | Natural |

---

## Comments

Write zero comments by default. Add a comment only when the WHY is non-obvious (hidden constraint, external bug workaround, invariant that would surprise a reader). Never comment WHAT — identifiers already do that.
