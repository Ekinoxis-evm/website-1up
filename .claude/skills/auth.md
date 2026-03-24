---
name: auth
description: Auth layer for 1UP — Privy token verification, email resolution across OAuth methods, hybrid isAdmin check, and $1UP token on Base L2.
type: project
filePattern: src/{lib/privy.ts,lib/admin.ts,app/admin/layout.tsx,app/api/admin}/**
---

# Auth — 1UP Gaming Tower

## Why `resolveUserEmail` exists

Privy supports email, Google OAuth, and Discord OAuth. The issue:
- Email login → `user.email?.address` ✓
- Google OAuth → `user.google?.email` ✓ but `user.email` is undefined
- Discord OAuth → `user.discord?.email` ✓ but `user.email` is undefined

`resolveUserEmail(userId)` centralizes this lookup so all paths return the same email string.

```ts
// src/lib/privy.ts
export async function resolveUserEmail(userId: string): Promise<string | undefined> {
  const user = await privyServer.getUser(userId).catch(() => null);
  if (!user) return undefined;
  return user.email?.address ?? user.google?.email ?? user.discord?.email ?? undefined;
}
```

## isAdmin — hybrid check (env + DB)

```ts
// src/lib/admin.ts
const ENV_ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",").map(e => e.trim().toLowerCase()).filter(Boolean);

export function isEnvAdmin(email: string): boolean {
  return ENV_ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function isAdmin(email?: string | null): Promise<boolean> {
  if (!email) return false;
  const normalized = email.toLowerCase();
  if (isEnvAdmin(normalized)) return true;            // fast path — env admins
  const { data } = await supabaseAdmin               // DB admins (admin_users table)
    .from("admin_users").select("id").eq("email", normalized).maybeSingle();
  return !!data;
}
```

Use `isEnvAdmin` for read-only UI checks (e.g., show/hide delete button for root admins).
Use `isAdmin` everywhere auth is enforced.

## API route auth (Bearer token)

```ts
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

## Admin layout auth (cookie)

```ts
// src/app/admin/layout.tsx
const token = cookieStore.get("privy-token")?.value;
const claims = await verifyCookieToken(token);
if (!claims) redirect("/");

const user = await privyServer.getUser(claims.userId);
const email = user.email?.address ?? user.google?.email ?? user.discord?.email ?? undefined;
if (!await isAdmin(email)) redirect("/");
```

> The layout inlines the email resolution manually (same logic as `resolveUserEmail`). API routes use the helper.

## Client-side token

```ts
"use client";
import { usePrivy } from "@privy-io/react-auth";

const { getAccessToken, authenticated, user } = usePrivy();

// Get Bearer token for API calls:
const token = await getAccessToken();
// Attach: Authorization: `Bearer ${token}`
```

## $1UP Token — Base L2

Contract: `0xF6813C71e620c654Ff6049a485E38D9494eFABdf` | 18 decimals | Base L2

```ts
// src/lib/viem.ts
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

export const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"),
});

export const ONE_UP_TOKEN = {
  address: "0xF6813C71e620c654Ff6049a485E38D9494eFABdf" as `0x${string}`,
  decimals: 18,
  symbol: "1UP",
} as const;
```

Hook: `src/hooks/use1upBalance.ts` — reads `balanceOf` via viem, returns `{ balance, loading, error }`.

## Privy embedded wallets

`createOnLogin: "users-without-wallets"` is set in `PrivyClientProvider.tsx` — every new user automatically gets an embedded wallet on Base. Access via:

```ts
import { useWallets } from "@privy-io/react-auth";
const { wallets } = useWallets();
const embeddedWallet = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
```

## Linking additional auth methods

```ts
import { useLinkAccount } from "@privy-io/react-auth";
const { linkGoogle, linkDiscord, linkPasskey } = useLinkAccount();
```

Unlink only when `linkedAccounts.length > 1` — prevent lockout.
