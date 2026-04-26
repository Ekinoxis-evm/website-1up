---
name: pass-purchase-flow
description: Full spec for the on-chain 1UP Pass purchase flow — BuyPassWizard, on-chain tx verification, pass_config admin, pass_orders management.
type: project
filePattern: src/components/perfil/BuyPassWizard.tsx, src/components/perfil/MisPassOrders.tsx, src/components/perfil/PassPurchasePanel.tsx, src/lib/passVerifier.ts, src/app/api/user/pass-orders/**, src/app/api/user/pass-config/**, src/app/api/admin/pass-orders/**, src/app/api/admin/pass-config/**, src/app/admin/(protected)/pass-orders/**, src/app/app/(protected)/pass/**
---

# 1UP Pass On-Chain Purchase Flow

## Business rules

- User pays **full price** in `$1UP` tokens on Base mainnet — no discounts applied.
- Price is admin-configurable via `pass_config` (single row, id=1). Initial: 30,000 $1UP.
- Recipient wallet is admin-configurable. Initial: `0x2D772d0d0152f0d81363a81F06DB7EFC5D5eF339`.
- Access duration is admin-configurable. Initial: 30 days.
- **Transaction-first flow**: client sends tx on-chain, waits for confirmation, then submits order to backend.
- Backend independently re-verifies the tx receipt before creating the order. Client cannot fake it.
- **Stacking expiry**: if user has an active confirmed pass, new purchase extends from current `expires_at`, not from `now()`.
- `tx_hash` is unique — same tx cannot be submitted twice.

---

## DB Tables

### `pass_config`
```sql
id               INT PK DEFAULT 1  -- single-row guard via CHECK (id = 1)
price_token      NUMERIC NOT NULL DEFAULT 30000
recipient_address TEXT NOT NULL DEFAULT '0x2D772d0d0152f0d81363a81F06DB7EFC5D5eF339'
duration_days    INT NOT NULL DEFAULT 30
is_active        BOOLEAN NOT NULL DEFAULT TRUE
updated_at       TIMESTAMPTZ DEFAULT now()
updated_by       TEXT NULL          -- admin email
```

### `pass_orders`
```sql
id                      BIGSERIAL PK
user_profile_id         BIGINT FK → user_profiles(id)
privy_user_id           TEXT NOT NULL
email                   TEXT NULL
wallet_address          TEXT NOT NULL            -- user wallet (sender)
tx_hash                 TEXT NOT NULL UNIQUE     -- Base L2 tx hash
status                  pass_order_status        -- pending_tx | confirmed | failed | expired_unverified
token_price_at_purchase NUMERIC NOT NULL         -- frozen at creation
token_amount_paid       NUMERIC NOT NULL         -- actual amount sent (= price, no discounts)
recipient_address       TEXT NOT NULL            -- frozen at creation
duration_days           INT NOT NULL
discount_pct_applied    NUMERIC DEFAULT 0        -- always 0 for now
discount_rule_id        BIGINT NULL FK
block_number            BIGINT NULL
paid_at                 TIMESTAMPTZ NULL
expires_at              TIMESTAMPTZ NULL
failure_reason          TEXT NULL
admin_notes             TEXT NULL
verification_attempts   INT DEFAULT 0
last_verified_at        TIMESTAMPTZ NULL
reviewed_by             TEXT NULL
reviewed_at             TIMESTAMPTZ NULL
created_at              TIMESTAMPTZ DEFAULT now()
updated_at              TIMESTAMPTZ DEFAULT now()
```

---

## Token & Chain

- **Token**: `$1UP` at `0xF6813C71e620c654Ff6049a485E38D9494eFABdf` (Base mainnet), 18 decimals
- **Chain**: Base mainnet (chainId: 8453)
- **ABIs**: `ERC20_TRANSFER_ABI` + `ERC20_BALANCE_ABI` in `src/lib/viem.ts`
- **Public client**: `publicClient` from `src/lib/viem.ts`

---

## Client-side flow (`BuyPassWizard`)

Uses `useSendTransaction` from `@privy-io/react-auth` — correct hook for custom ERC20 transfers (the Privy `/transfer` API only covers USDC/ETH/etc). Pass `sponsor: true` so Privy covers gas via EIP-7702 paymaster; users with 0 ETH can still send. Requires **Gas Sponsorship enabled for Base** in the Privy Dashboard and **TEE execution** active.

```ts
import { useSendTransaction } from "@privy-io/react-auth";
import { encodeFunctionData, parseUnits } from "viem";
import { publicClient, ONE_UP_TOKEN, ERC20_TRANSFER_ABI } from "@/lib/viem";

const { sendTransaction } = useSendTransaction();

// 1. Encode calldata
const data = encodeFunctionData({
  abi: ERC20_TRANSFER_ABI,
  functionName: "transfer",
  args: [recipientAddress as `0x${string}`, parseUnits(priceToken.toString(), 18)],
});

// 2. Send via Privy embedded wallet — gas sponsored
const { hash } = await sendTransaction(
  { to: ONE_UP_TOKEN.address, data, chainId: 8453 },
  { address: walletAddress, sponsor: true },
);

// 3. Wait for on-chain confirmation
const receipt = await publicClient.waitForTransactionReceipt({
  hash: hash as `0x${string}`,
  timeout: 120_000,
});

if (receipt.status !== "success") { /* show error */ return; }

// 4. Submit confirmed tx to backend
const res = await fetch("/api/user/pass-orders", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ txHash: hash, walletAddress }),
});
```

### Phases shown to user
1. `confirm` — price/duration/wallet summary + "PAGAR" button
2. `sending` — "Enviando transacción…" (waiting for Privy wallet response)
3. `confirming` — "Confirmando en blockchain…" (waiting for receipt; shows BaseScan link)
4. `registering` — "Registrando compra…" (backend call)
5. `success` — check icon + expiry date + BaseScan link
6. `error` — error message + BaseScan link if tx was sent

---

## Server-side verification (`src/lib/passVerifier.ts`)

```ts
verifyPassTransfer(txHash, expectedFrom, expectedTo, expectedTokenAmount)
  → VerifyResult: { ok: true, blockNumber, paidAt } | { ok: false, reason }
```

Logic:
1. `publicClient.getTransactionReceipt({ hash: txHash })`
2. Check `receipt.status === 'success'`
3. Iterate `receipt.logs` filtering `log.address === ONE_UP_TOKEN.address`
4. `decodeEventLog` with Transfer event ABI
5. Check `from === expectedFrom`, `to === expectedTo`, `value >= parseUnits(amount, 18)`
6. On match: `publicClient.getBlock({ blockNumber })` to get `block.timestamp` → `paidAt`

---

## API Routes

### `GET /api/user/pass-config`
Public (no auth). Returns `{ price_token, recipient_address, duration_days, is_active }`.

### `POST /api/user/pass-orders`
Privy user auth. Body: `{ txHash, walletAddress }`.

Flow:
1. Validate `txHash` format (`/^0x[0-9a-fA-F]{64}$/`)
2. Check `tx_hash` not already in DB (duplicate guard)
3. Fetch `pass_config` — check `is_active`
4. Call `verifyPassTransfer(txHash, walletAddress, config.recipient_address, config.price_token)`
5. If failed → 422 with reason
6. `getOrCreateProfile` for calling user
7. Stacking expiry: look up existing `confirmed` order with `expires_at > NOW()`, use its `expires_at` as base date; otherwise use `paidAt`
8. Insert order as `confirmed` with `expires_at = baseDate + duration_days`
9. `revalidatePath("/app/pass")` + `revalidatePath("/admin/1pass")` + `revalidatePath("/admin/pass-orders")`
10. Return 201 with full order

Error codes: `409` duplicate tx, `422` verification failed, `400` pass inactive.

### `GET /api/admin/pass-config` · `PUT /api/admin/pass-config`
isAdmin. PUT body: `{ priceToken, recipientAddress, durationDays, isActive }` (all optional).
Validates: `priceToken > 0`, `isAddress(recipientAddress)`, `durationDays >= 1`.

### `GET /api/admin/pass-orders`
isAdmin. Joins `user_profiles`. Optional `?status=` filter. Limit 200.

### `PATCH /api/admin/pass-orders`
isAdmin. Body: `{ id, adminNotes }`. Sets `admin_notes`, `reviewed_by`, `reviewed_at`.

---

## Components

### `PassPurchasePanel` (Client Component)
Rendered by `/app/pass` Server Component page. Receives `config` + `benefits` as props.
- Fetches user's orders client-side on mount; shows active pass with expiry or "No tienes pass"
- Opens `BuyPassWizard` modal on button click
- Calls `fetchActiveOrder()` + bumps `ordersKey` after successful purchase
- Renders `MisPassOrders` for history

### `BuyPassWizard`
Modal component. Props: `{ priceToken, recipientAddress, durationDays, walletAddress, getAccessToken, onClose, onSuccess }`.

### `MisPassOrders`
Fetches `GET /api/user/pass-orders` on mount. Shows status badge + active/expired chip + expiry date + BaseScan TX link.

### `AdminPassConfigCard`
Inline-edit card embedded in `/admin/1pass`. Validates address with viem `isAddress`. PUT to `/api/admin/pass-config`.

### `AdminPassOrdersClient`
Full pass order table at `/admin/pass-orders`. KPIs: total orders, confirmed count, active now count, failed count. Filter pills. Admin notes editor per row.

---

## Edge Cases

| Case | Handling |
|------|---------|
| Duplicate `tx_hash` | DB unique constraint → `23505` caught → `409` |
| Receipt `status !== 'success'` | `422 "La transacción falló en la blockchain."` |
| Transfer not found in logs | `422 "No se encontró la transferencia de $1UP…"` |
| Amount < expected | `value >= expectedWei` check; underpayment rejected |
| `waitForTransactionReceipt` timeout | Show error with BaseScan link; user contacts support with tx hash |
| Pass config `is_active = false` | `400 "La venta del 1UP Pass está desactivada temporalmente."` |
| User has no wallet | `BuyPassWizard` not rendered (`canBuy` requires `walletAddress`) |
| Stacking expiry | Looks up `expires_at > NOW()` confirmed order; uses it as base if found |
| User already has active pass | "RENOVAR PASS" shown instead of "OBTENER"; new expiry stacks forward |
