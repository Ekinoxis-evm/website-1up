---
name: token-purchase-flow
description: Full spec for the $1UP token purchase flow — 4-step BUY modal, bank accounts, comprobante upload, purchase orders, and admin management. Also covers course and 1UP Pass purchases via token or bank transfer.
type: project
filePattern: src/components/perfil/BuyTokensWizard.tsx, src/components/perfil/MisOrdenes.tsx, src/app/api/user/token-orders/**, src/app/api/user/upload-comprobante/**, src/app/api/bank-accounts/**, src/app/api/admin/token-orders/**, src/app/api/admin/bank-accounts/**, src/app/admin/(protected)/token-orders/**, src/app/admin/(protected)/bank-accounts/**, src/components/academia/CourseCheckoutWizard.tsx, src/app/api/user/course-orders/**, src/app/api/admin/enrollments/**, src/components/perfil/BuyPassWizard.tsx, src/app/api/user/pass-orders/**, src/app/api/admin/pass-orders/**
---

# $1UP Purchase Flow

## Three products, two payment methods

All three purchasable products share the same payment method architecture:

| Product | Token path | Bank transfer path | MercadoPago |
|---------|-----------|-------------------|-------------|
| $1UP tokens (`token_purchase_orders`) | N/A — tokens ARE the payment | ✅ user pays COP, admin sends $1UP | ❌ |
| 1UP Pass (`pass_orders`) | ✅ on-chain verify, auto-confirm | ✅ admin approve/reject | ❌ |
| Course enrollment (`enrollments`) | ✅ on-chain verify, auto-confirm | ✅ admin approve/reject | ✅ |

**Email triggers — every product × every event:**

| Event | Email sent |
|-------|-----------|
| $1UP token order placed | `sendTokenOrderPlacedEmail` (user) + admin notification |
| $1UP token order approved | `sendTokenOrderApprovedEmail` (user) + admin notification |
| $1UP token order rejected | `sendTokenOrderRejectedEmail` (user) + admin notification |
| Pass bank order placed | `sendPassBankPlacedEmail` (user) + admin notification |
| Pass bank order approved | `sendPassBankApprovedEmail` (user) + admin notification |
| Pass bank order rejected | `sendPassBankRejectedEmail` (user) + admin notification |
| Course order placed (bank) | `sendCourseOrderPlacedEmail` (user) + admin notification |
| Course order confirmed (token) | `sendCourseOrderConfirmedEmail` (user) + admin notification |
| Course order approved (bank) | `sendCourseOrderApprovedEmail` (user) + admin notification |
| Course order rejected (bank) | `sendCourseOrderRejectedEmail` (user) + admin notification |

All email functions live in `src/lib/email.ts` and use `Promise.allSettled` with `.catch(() => null)` so email failures never block order creation.

---

## $1UP Token purchase business rules

- Exchange rate: **1 $1UP = 1,000 COP** (fixed; frozen at order time in `exchange_rate_cop`).
- User pays by bank transfer (offline). They upload a receipt (comprobante) and submit an order.
- Admin reviews the comprobante, then sends $1UP tokens **directly from their connected Privy wallet** — no manual TX hash entry. The hash is auto-captured and stored.
- **One pending order per user at a time** — enforced by unique partial index.
- COP amount must be a positive integer multiple of 1,000.
- File upload: jpg / png / webp / pdf only, 5MB max.
- `nombre` and `celular_contacto` are stored on the order but are **pulled server-side from `user_profiles`** — the user never enters them in the wizard.

---

## DB Tables

### `bank_accounts`
```sql
id             BIGSERIAL PK
bank_name      TEXT NOT NULL
account_type   TEXT CHECK (account_type IN ('ahorros','corriente'))
account_number TEXT NOT NULL
holder_name    TEXT NOT NULL
holder_document TEXT NULL       -- shown to user (NIT/CC of holder)
instructions   TEXT NULL        -- free text: "Incluye email en el concepto"
is_active      BOOLEAN DEFAULT TRUE
sort_order     INT DEFAULT 0
created_at     TIMESTAMPTZ
updated_at     TIMESTAMPTZ
```
RLS policy: anon + authenticated can SELECT `WHERE is_active = TRUE`. Service role bypasses RLS for admin.

### `token_purchase_orders`
```sql
id                BIGSERIAL PK
user_profile_id   BIGINT FK → user_profiles(id) ON DELETE RESTRICT
privy_user_id     TEXT NOT NULL                 -- denormalized for admin lookups
email             TEXT NOT NULL
nombre            TEXT NOT NULL
celular_contacto  TEXT NOT NULL
wallet_address    TEXT NOT NULL                 -- lowercased 0x...
cop_amount        INT CHECK (cop_amount > 0)
token_amount      NUMERIC(20,4)                 -- cop_amount / 1000
exchange_rate_cop INT DEFAULT 1000             -- frozen at creation
bank_account_id   BIGINT FK → bank_accounts(id) ON DELETE SET NULL
comprobante_url   TEXT NOT NULL
status            token_purchase_status         -- pending/approved/rejected/cancelled
admin_notes       TEXT NULL
rejection_reason  TEXT NULL
approved_tx_hash  TEXT NULL                    -- Base L2 tx hash entered on approval
reviewed_by       TEXT NULL                    -- admin email
reviewed_at       TIMESTAMPTZ NULL
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
```
Key index: `UNIQUE (user_profile_id) WHERE status = 'pending'` — one pending per user.

---

## Storage paths (inside `images` bucket)

| Path | When |
|------|------|
| `comprobantes/pending/{privyUserIdHash}-{timestamp}.{ext}` | Upload step — before order ID exists |
| `comprobantes/{orderId}/receipt.{ext}` | Final path — after order created; `move()` called by token-orders POST |

Helpers in `src/lib/blob.ts`:
- `uploadComprobante(file, privyUserId)` → `{ url, path }`
- `moveComprobanteToOrder(pendingPath, orderId)` → `finalUrl`

Both use `supabaseAdmin.storage.from("images")`. Extension is kept (not stripped) so PDFs serve with correct content-type.

---

## API Routes

### User

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/user/upload-comprobante` | POST | Privy user | `multipart/form-data` — uploads receipt; returns `{ url, path }` |
| `/api/user/token-orders` | GET | Privy user | Returns latest 20 orders for calling user |
| `/api/user/token-orders` | POST | Privy user | Creates purchase order; moves comprobante to final path |
| `/api/user/token-orders/cancel` | POST | Privy user | Cancels own pending order; body: `{ id }` |
| `/api/bank-accounts` | GET | Privy user | Returns active bank accounts (`is_active = true`, ordered by `sort_order, id`) |

**`POST /api/user/token-orders` — validation checklist:**
1. `isAddress(walletAddress)` via viem
2. `copAmount` is integer, `copAmount >= 1000`, `copAmount % 1000 === 0`
3. `bankAccountId` resolves to an `is_active = true` row
4. Unique partial index violation → catch error code `23505` → return `409 { error: "Ya tienes una orden pendiente." }`
5. Storage `move()` fails → set order `status = 'cancelled'`, return `502`

### Admin

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/admin/token-orders` | GET | isAdmin | List orders; `?status=` filter; joins `user_profiles` + `bank_accounts`; limit 200 |
| `/api/admin/token-orders` | PATCH | isAdmin | Approve (`action: "approve"`, requires `txHash`) or reject (`action: "reject"`, requires `rejectionReason`). Guards: status must be `pending`; sets `reviewed_by`, `reviewed_at` |
| `/api/admin/bank-accounts` | POST | isAdmin | Create bank account |
| `/api/admin/bank-accounts` | PUT | isAdmin | Update bank account |
| `/api/admin/bank-accounts` | DELETE | isAdmin | Delete bank account |

`revalidatePath` calls after every mutation:
- User routes: `revalidatePath("/admin/token-orders")` + `revalidatePath("/app")`
- Admin token-orders PATCH: same
- Admin bank-accounts: `revalidatePath("/admin/bank-accounts")` + `revalidatePath("/app")`

---

## Component Structure

### `src/components/perfil/BuyTokensWizard.tsx`
4-step wizard rendered inside the BUY modal in `WalletTab.tsx`. Receives props: `walletAddress`, `onClose`, `getAccessToken`.

**Step 1 — Enter COP:**
- Numeric input for COP amount; live display `÷ 1000 = {tokenAmount} $1UP`
- Validation: multiple of 1,000, min 1,000
- On CONTINUAR: fetch `/api/bank-accounts` → advance to step 2

**Step 2 — Select bank + transfer:**
- Radio cards for each active bank account (bank name, type chip, account number + copy button, holder, instructions)
- Highlighted summary: "Vas a recibir {tokenAmount} $1UP por {formatCop(copAmount)}"
- Caution panel: "Realiza la transferencia ahora. Vuelve aquí con el comprobante."
- Buttons: ATRÁS / YA TRANSFERÍ →

**Step 3 — Upload comprobante + confirm:**
- Shows a **copyable bank details card** with per-field copy buttons: banco, tipo de cuenta, número de cuenta, titular, documento (NIT/CC)
- Amount reminder pill: "Debes transferir {formatCop(copAmount)}"
- Drop-zone file input only (`accept="image/jpeg,image/png,image/webp,application/pdf"`, max 5MB)
- On file select: immediately POST to `/api/user/upload-comprobante`; show preview
- Submit disabled only while upload is in progress or no comprobante uploaded — no other fields required
- `nombre` and `celular` are **not collected here** — the API route pulls them from `user_profiles` server-side
- On `409`: "Ya tienes una orden pendiente" + link to Mis Órdenes
- On success: advance to step 4

**Step 4 — Confirmation:**
- Check icon + "ORDEN ENVIADA"
- Order ID, COP, $1UP, wallet, status `PENDIENTE`
- Buttons: VER MIS ÓRDENES / CERRAR

**Reset on close:** `buyStep → 1`, clear all inputs.

### `src/components/perfil/MisOrdenes.tsx`
Panel rendered inside the **ÓRDENES** tab in `WalletTab` (tab toggle: HISTORIAL | ÓRDENES, sits below the balance card). Fetches `GET /api/user/token-orders` on mount. Shows last 5–10 orders with status badge, amounts, date. Each `pending` row has a CANCELAR button → `POST /api/user/token-orders/cancel`.

### `src/components/admin/AdminTokenOrdersClient.tsx`
- Status filter pills: Todos / Pendientes / Aprobados / Rechazados / Cancelados
- Header KPIs: total approved COP, total approved $1UP, pending count
- Table: #, Usuario (email + nombre), Wallet (truncated + copy), COP, 1UP, Banco, Comprobante (thumbnail → lightbox), Estado badge, Fecha, Acciones
- **Approve modal — wallet-send flow:**
  - Shows order summary: recipient wallet, $1UP amount, COP paid
  - Wallet selector: lists all connected Privy wallets (`useWallets`) with type label; "Conectar otra wallet" button via `useConnectWallet`
  - `handleSendApprove`: `encodeFunctionData(ERC20_TRANSFER_ABI, "transfer")` + `useSendTransaction` with `sponsor: true` + `publicClient.waitForTransactionReceipt` → auto-captures hash → `PATCH /api/admin/token-orders`
  - Send steps: `idle → sending → waiting → done` (animated status indicator during sending/waiting)
  - If receipt times out after 120s: error shows captured hash so admin can approve manually if needed
  - Does NOT require manual TX hash entry — hash is always captured from the actual on-chain TX
- **Reject modal:** requires `rejectionReason`; optional `adminNotes`
- Imports: `useSendTransaction`, `useWallets`, `useConnectWallet` from `@privy-io/react-auth`; `encodeFunctionData`, `parseUnits` from `viem`; `publicClient`, `ONE_UP_TOKEN`, `ERC20_TRANSFER_ABI` from `@/lib/viem`

### `src/components/admin/AdminBankAccountsClient.tsx`
Standard CRUD list + modal. Form fields: `bankName`, `accountType` (select), `accountNumber`, `holderName`, `holderDocument`, `instructions` (textarea), `isActive`, `sortOrder`.

---

## Implementation Sequence

1. DB migrations: `bank_accounts` first, then `token_purchase_orders`
2. Regenerate `src/types/database.types.ts` via Supabase MCP; add aliases
3. Add `uploadComprobante` + `moveComprobanteToOrder` to `src/lib/blob.ts`
4. `POST /api/user/upload-comprobante/route.ts`
5. `POST|PUT|DELETE /api/admin/bank-accounts/route.ts` + admin page + `AdminBankAccountsClient`
6. `GET /api/bank-accounts/route.ts`
7. `GET|POST /api/user/token-orders/route.ts` + `POST /api/user/token-orders/cancel/route.ts`
8. `GET|PATCH /api/admin/token-orders/route.ts` + admin page + `AdminTokenOrdersClient`
9. `BuyTokensWizard.tsx` + `MisOrdenes.tsx` + wire into `WalletTab.tsx`
10. Add two entries to `AdminSidebar.tsx`
11. Bump version, update docs

---

## Edge Cases

| Case | Handling |
|------|---------|
| Duplicate pending order | Unique partial index → `23505` → `409 "Ya tienes una orden pendiente."` |
| File wrong MIME | Server rejects `400`; client also validates via `accept` attribute |
| File over 5MB | Server rejects `400 "Archivo demasiado grande (máx 5MB)"` |
| Storage `move()` fails | Order set to `cancelled`; `502` returned; user retries |
| Non-multiple of 1,000 COP | Client gates step 1; server rejects `400` |
| Admin's wallet TX fails or is rejected | `sendTransaction` throws; error shown; step resets to `idle` |
| Receipt confirmation times out (120s) | Error shown with captured hash so admin can fall back to manual record if needed |
| Admin has no wallets connected | Button disabled; "Conectar wallet" shown |
| Admin rejects without `rejectionReason` | Server returns `400` |
| Actioning a non-pending order | Server checks status first → `409` |
| Bank account deactivated mid-flow | Server re-validates `is_active = true` on order POST → `400 "Cuenta no disponible"` |
| User has no `user_profiles` row | Use `getOrCreateProfile` helper (extract to `src/lib/userProfile.ts` if not already) |
| User cancels then resubmits | Cancel frees the unique index slot; comprobante left in storage for audit trail |

---

## Course purchase flow

### `src/components/academia/CourseCheckoutWizard.tsx`
Client component rendered as a modal overlay from `CourseCatalog`. Props: `course`, `walletAddress`, `recipientAddress`, `getAccessToken`, `onClose`.

**Phase state machine:**
`"method"` → `"mp_loading"` | `"token_pay"` → `"token_sending"` → `"token_confirming"` → `"token_registering"` → `"bank_select"` → `"bank_pay"` → `"bank_uploading"` → `"bank_submitting"` → `"success"` | `"error"`

**MercadoPago path:** POST `/api/checkout` → `window.location.href = data.checkoutUrl`. Auto-approved on webhook.

**Token path:**
1. `sendTransaction` with `sponsor: true` (gas-sponsored EIP-7702)
2. `publicClient.waitForTransactionReceipt` (120s timeout)
3. POST `/api/user/course-orders` with `{ courseId, paymentMethod:"token", txHash, walletAddress }`
4. Server calls `verifyPassTransfer(txHash, wallet, recipient, course.price_token)` for on-chain verification
5. Enrollment created with `payment_status: "approved"` — no admin review needed
6. `sendCourseOrderConfirmedEmail` fired

**Bank path:**
1. Fetch `/api/bank-accounts` → user selects bank
2. User uploads comprobante → POST `/api/user/upload-comprobante`
3. POST `/api/user/course-orders` with `{ courseId, paymentMethod:"bank", bankAccountId, comprobantePath, comprobanteUrl }`
4. Enrollment created with `payment_status: "pending"` → admin reviews in `/admin/enrollments`
5. `sendCourseOrderPlacedEmail` fired

**Token option disabled** when `course.price_token` is null — admin must set this field on each course in `/admin/courses`.

### `POST /api/user/course-orders`
- Reads `pass_config` (id=1) for `recipient_address` — both course token payments AND pass token payments go to the same wallet
- Applies best active `discount_rules` server-side (same logic as `/api/checkout`)
- Deduplicates by `tx_hash` (UNIQUE constraint) → 409 on double-submit
- On bank path: calls `moveComprobanteToOrder(comprobantePath, enrollment.id, ext)` after insert

### `PATCH /api/admin/enrollments`
Guards: `payment_method IN ("token","bank")` AND `payment_status = "pending"`.
- `action: "approve"`: sets `payment_status = "approved"`, `paid_at = now()`, optional `approved_tx_hash`. Fires `sendCourseOrderApprovedEmail`.
- `action: "reject"`: requires `rejectionReason`, sets `payment_status = "rejected"`. Fires `sendCourseOrderRejectedEmail`.
- `revalidatePath` on `/academia`, `/admin/enrollments`, `/app/academia`.

### `src/components/admin/AdminEnrollmentsClient.tsx`
- Payment method badge: MercadoPago / $1UP Token / Banco
- Inline Aprobar/Rechazar panel for pending token/bank enrollments
- Comprobante link (bank) and BaseScan TX link (token) rendered in proof column
- Rejection requires non-empty `rejectionReason`; approve optionally accepts `approved_tx_hash`

---

## Pass purchase flow (token + bank)

See `.claude/skills/pass-purchase-flow.md` for the full spec.

Key points for cross-reference:
- Token path: `verifyPassTransfer` validates on-chain; `pass_orders.status = "confirmed"` auto-set
- Bank path: `pass_orders.status = "pending_bank"` → admin approves/rejects in `/admin/pass-orders`
- Admin combined tab page (`AdminPassOrdersClient`): "Token $1UP" tab + "Banco" tab (with pending count badge)
- Emails: `sendPassBankApprovedEmail` / `sendPassBankRejectedEmail` fired on PATCH
