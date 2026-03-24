---
name: 1up-website
description: Expert guidance for the 1UP Gaming Tower website — design system rules, component patterns, database schema (Supabase+Drizzle), Privy auth flow, and admin panel architecture.
type: project
---

# 1UP Gaming Tower — Website Skill

## When to activate
When working on any file in the `1up-gaming-tower` / `website/app/` codebase.

---

## Absolute rules — never break

1. **0px border-radius.** The class `rounded-*` is banned except `rounded-full`. Sharp corners everywhere.
2. **No dividers.** Never use `<hr>`, `border-b`, or `border-t` for section separation. Use background color shifts.
3. **Public pages = pure Tailwind.** No shadcn/ui imports in `src/components/{home,tower,team,academia,recreativo}/`.
4. **Skew pattern.** Skewed elements: outer → `className="skew-fix"`, inner text → `className="skew-content block"`.
5. **Auth on every admin API route.** Call `verifyToken(req.headers.get("authorization"))` + `isAdmin(email)` before any DB write. No exceptions.
6. **Server Components for public data.** Public pages must be async Server Components fetching from DB directly — no `useEffect`, no SWR, no loading states.
7. **`revalidatePath()` after every mutation.** Call it for both the public page and the admin page.

---

## Color token cheat sheet

```
bg-background               #0b1326  ← page base
bg-surface-container-lowest #060e20  ← darkest sections
bg-surface-container-low    #131b2e  ← alternating rows
bg-surface-container        #171f33  ← cards
bg-surface-container-high   #222a3d  ← elevated cards

text-primary / bg-primary        #ffb2bf  ← neon pink (accents)
bg-primary-container             #ff4d80  ← CTA buttons, active nav
text-secondary / bg-secondary    #a1c9ff  ← electric blue
bg-secondary-container           #0897ff  ← blue CTAs, badges
text-tertiary / bg-tertiary      #abd600  ← acid green (Academia, wins)
```

---

## Component patterns

### Skewed CTA button
```tsx
<button className="bg-primary-container text-white font-headline font-black px-8 py-3 skew-fix hover:neo-shadow-pink transition-all">
  <span className="block skew-content">LABEL</span>
</button>
```

### Section heading with accent bar
```tsx
<div className="mb-12">
  <h2 className="font-headline text-4xl font-black uppercase tracking-tighter">
    TITLE <span className="text-secondary">ACCENT</span>
  </h2>
  <div className="h-2 w-24 bg-tertiary mt-2" />
</div>
```

### Card monolith (no dividers, no radius)
```tsx
<div className="bg-surface-container border-l-4 border-primary-container p-6 hover:bg-surface-container-high transition-colors">
  {/* content */}
</div>
```

### Glassmorphism panel (nav, overlays)
```tsx
<div className="glass-panel">  {/* bg rgba(11,19,38,0.6) + backdrop-blur-20px */}
```

---

## Database quick reference

> **Driver**: `postgres` (postgres.js) + Drizzle ORM. DB is **Supabase Postgres** — use the **Transaction pooler** URI as `DATABASE_URL`.

```typescript
// Import in Server Components / API routes:
import { db } from "@/db";
import { games, gameCategories, players, competitions, courses, passBenefits, floorInfo, recruitmentSubmissions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// Example query:
const allGames = await db.select().from(games).orderBy(games.sortOrder);

// Example insert:
await db.insert(games).values({ name, categoryId, sortOrder: 0 });

// After mutation — always revalidate:
import { revalidatePath } from "next/cache";
revalidatePath("/");
revalidatePath("/admin/games");
```

---

## Admin auth pattern (API routes)

```typescript
import { verifyToken, privyServer } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";

async function checkAdmin(req: NextRequest): Promise<boolean> {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  const user = await privyServer.getUser(claims.userId).catch(() => null);
  return isAdmin(user?.email?.address);
}

// In every handler:
if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

---

## Admin client token pattern

```typescript
"use client";
import { usePrivy } from "@privy-io/react-auth";

const { getAccessToken } = usePrivy();

async function callAdmin(endpoint: string, body: object, method = "POST") {
  const token = await getAccessToken();
  return fetch(endpoint, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}
```

---

## Route group structure

| URL | Route group | Layout |
|-----|------------|--------|
| `/` | `(main)` | TopAppBar + Footer + MobileBottomNav |
| `/recreativo` | `(main)` | TopAppBar + Footer + MobileBottomNav |
| `/gaming-tower` | `(sidebar)` | TopAppBar + **SideNavBar** + Footer + MobileBottomNav |
| `/team` | `(sidebar)` | TopAppBar + **SideNavBar** + Footer + MobileBottomNav |
| `/academia` | `(sidebar)` | TopAppBar + **SideNavBar** + Footer + MobileBottomNav |
| `/admin/*` | `admin/` | AdminSidebar only (no TopAppBar) |

---

## Content language rules
- Nav labels, buttons, section badges: **English UPPERCASE** (JOIN NOW, SEND INTEL, PAY, EXPLORAR)
- Page headlines: **Spanish** (matching the mockups)
- Body copy: **Spanish**
- Admin panel: **English** (it's internal)
