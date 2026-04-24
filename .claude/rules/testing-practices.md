# Testing Practices — 1UP Gaming Tower

> **Current state**: No tests exist. The project ships via manual verification + TypeScript + ESLint.
> This document defines what to do WHEN we add tests.

---

## Recommended stack (when adding tests)

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom
```

These work with Next.js 15+ App Router without ejecting. Add to `package.json`:

```json
"test": "vitest",
"test:run": "vitest run"
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom" },
  resolve: { alias: { "@": resolve(__dirname, "src") } },
});
```

---

## What to test (priority order)

### 1. API route logic (highest value)

Test the business logic extracted from route handlers — not the Next.js request/response wiring:

- `checkAdmin()` auth guard — valid token → true, missing token → false, non-admin email → false
- `isAdmin()` — env admin match, DB admin match, unknown email → false
- Discount calculation in `/api/checkout` — best discount wins, expired discount ignored
- Webhook HMAC verification in `/api/webhooks/mercadopago`

### 2. Pure utility functions

- `src/lib/admin.ts`: `isEnvAdmin()`, `isAdmin()`
- `src/lib/privy.ts`: `verifyToken()` (mock the PrivyClient)
- `src/lib/comfenalco.ts`: error thrown when env vars absent

### 3. Supabase query correctness

Integration-style tests against a local Supabase or mocked responses. Only test WHERE the query has meaningful filtering (e.g., `.eq("is_active", true)` filter that once had a bug).

### 4. React components (lowest priority for now)

Smoke tests only — "renders without throwing" for complex Client Components (AdminCoursesClient, checkout flow).

---

## What NOT to test

- Simple CRUD pass-throughs that just call `supabaseAdmin.from().insert()` — nothing to assert.
- Next.js routing itself — framework is tested by Vercel.
- Tailwind class presence — visual correctness is verified in browser.
- The Privy SDK internals.

---

## Current verification workflow (no tests)

Before every deploy, manually verify:

```
[ ] npm run build         — zero errors
[ ] npx tsc --noEmit      — zero TypeScript errors
[ ] npm run lint          — zero ESLint errors
[ ] Manual smoke test:
      - Public home page loads
      - Admin login → dashboard shows counts
      - Academy page shows courses
      - One full admin CRUD (create + edit + delete + verify public page updates)
```

---

## If a bug recurs

1. Write a test that reproduces it before fixing.
2. Fix, confirm test passes.
3. Keep the test to prevent regression.

This is how we build the test suite incrementally — only around real bugs, not hypothetical coverage.
