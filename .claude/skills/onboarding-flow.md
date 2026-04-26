---
name: onboarding-flow
description: Mandatory 5-step onboarding wizard for new 1UP app users — OnboardingWizard component, referral code system, onboarding gate, and admin referral code management.
type: project
filePattern: src/app/app/onboarding/**, src/components/perfil/OnboardingWizard.tsx, src/app/api/user/onboarding/**, src/app/api/user/referral-codes/**, src/app/api/admin/referral-codes/**, src/app/admin/(protected)/referral-codes/**, src/components/admin/AdminReferralCodesClient.tsx
---

# Onboarding Flow — 1UP Gaming Tower

## Overview

Every new user must complete the onboarding wizard before accessing any protected app page. The wizard collects the data needed to create a full `user_profiles` row. Referral code is **required** — the system won't submit without a valid one.

---

## Routing

- `/app/onboarding` → `src/app/app/onboarding/page.tsx`
- **Outside** `(protected)` group — has its own auth check via `verifyCookieToken` to avoid circular redirect.
- The `(protected)` layout checks `onboarding_completed_at`: if null → `redirect("/app/onboarding")`.

---

## DB: `user_profiles` onboarding fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `nombre` | TEXT | Yes | Step 1 |
| `apellidos` | TEXT | Yes | Step 1 |
| `username` | TEXT (unique, nullable) | No | Step 2 — `^[a-z0-9_]{3,20}$` |
| `phone_country` | TEXT | No | Step 2 |
| `phone_number` | TEXT | No | Step 2 |
| `barrio` | TEXT | Yes | Step 3 |
| `birth_year` | INT | Yes | Step 3 — 1930 to currentYear-5 |
| `tipo_documento` | ENUM | No | Step 3 (optional, collapsible) |
| `numero_documento` | TEXT | No | Step 3 (optional) |
| `game_ids` | INT[] | No | Step 4 (skippable) |
| `referred_by_code` | TEXT | Yes | Step 5 — validated against `referral_codes` |
| `onboarding_completed_at` | TIMESTAMPTZ | set by API | Set on successful POST |

---

## DB: `referral_codes`

```sql
id           BIGSERIAL PK
code         TEXT UNIQUE NOT NULL    -- uppercase alphanumeric + underscore
description  TEXT NULL
is_active    BOOLEAN DEFAULT TRUE
max_uses     INT NULL                -- NULL = unlimited
used_count   INT DEFAULT 0
created_at   TIMESTAMPTZ
updated_at   TIMESTAMPTZ
```

- Code is validated at onboarding submit: must exist, `is_active = true`, `used_count < max_uses` (or `max_uses IS NULL`).
- `used_count` is incremented immediately after profile upsert.

---

## API Routes

### `POST /api/user/onboarding`
Auth: Privy Bearer token required.

Validates:
- `nombre`, `apellidos`, `barrio` — required, non-empty
- `birthYear` — integer in range [1930, currentYear-5]
- `referralCode` — required; checked against `referral_codes` for active + within use limit
- `username` — optional; regex `^[a-z0-9_]{3,20}$` if provided
- `phoneCountry` — optional; must be in allowed list if provided
- `tipoDocumento` — optional; must be in `["CC","CE","TI","PP","NIT"]` if provided

Success: upserts `user_profiles` (conflict on `privy_user_id`), increments `referral_codes.used_count`, revalidates `/app` + `/admin/referral-codes`. Returns `201 { ok: true }`.

TypeScript note: use `Database["public"]["Tables"]["user_profiles"]["Insert"]` as the patch type — `Record<string, unknown>` breaks the Supabase overload.

### `GET /api/user/referral-codes/validate?code=`
Auth: none (public).
Returns `{ valid: boolean, reason?: string }`.
Used by the wizard for live validation (debounced 600ms).

### `GET|POST|PUT /api/admin/referral-codes`
Auth: isAdmin.
- GET: all codes ordered by `created_at desc`
- POST: create new code (`^[A-Z0-9_]{2,30}$`); duplicate → 409
- PUT: update `description`, `is_active`, `max_uses` by id

---

## `OnboardingWizard` Component

`src/components/perfil/OnboardingWizard.tsx` — Client Component. Props: `games: { id: number; name: string }[]`.

### Steps

| # | Label | Fields | Required to advance |
|---|-------|--------|---------------------|
| 1 | Datos personales | `nombre`, `apellidos` | Both non-empty |
| 2 | Contacto | `username` (optional), `phoneCountry` + `phoneNumber` (optional) | Always (fields optional) |
| 3 | Ubicación e identidad | `barrio`*, `birthYear`* (shows age preview), collapsible document section (optional) | `barrio` + valid `birthYear` |
| 4 | Juegos favoritos | Multi-select game tiles | Always skippable |
| 5 | Código de referido | `referralCode` (auto-uppercase), live validation via GET endpoint | Valid code required |

Progress bar: 5 segments, fills with current step. Each step shows a label + icon.

### Referral code validation (Step 5)
- Input auto-uppercases
- Debounced 600ms `GET /api/user/referral-codes/validate?code=`
- Valid: green check icon
- Invalid: red cancel icon + reason message
- ENTRAR AL 1UP button disabled until `validCode === true`

### Submit (`handleSubmit`)
- POSTs all fields to `POST /api/user/onboarding`
- On success: `router.replace("/app")`
- On error: shows error message, re-enables button

---

## `AdminReferralCodesClient` Component

`src/components/admin/AdminReferralCodesClient.tsx` — Client Component.

- KPIs: total codes, active count, total uses
- Code list: code (monospace), status badge, `used_count / max_uses` with progress bar, activate/deactivate toggle button
- Create modal: code input (auto-uppercase), description, max_uses (optional — leave empty = unlimited)

---

## Backfill for existing users

When the onboarding gate was added, existing users who already had profile data needed `onboarding_completed_at` set to avoid being blocked:

```sql
UPDATE user_profiles
SET onboarding_completed_at = now()
WHERE nombre IS NOT NULL
  AND onboarding_completed_at IS NULL;
```

Run via `mcp__plugin_supabase_supabase__execute_sql` if needed for a fresh migration.
