import { privyServer } from "@/lib/privy";
import { supabaseAdmin } from "@/lib/supabase";

const SYNC_TTL_MS = 60 * 60 * 1000; // re-sync at most once per hour

type LinkedAccountSnapshot = {
  type: string;
  address?: string;
  email?: string;
  username?: string;
  walletClientType?: string;
};

/**
 * Pull a user's identity data from Privy and persist it onto their
 * user_profiles row: embedded wallet address, auth provider, linked
 * accounts snapshot, and the Privy account creation date.
 *
 * Best-effort — never throws. A sync failure must not break the caller.
 * The row must already exist (callers upsert it first).
 */
export async function syncPrivyProfile(privyUserId: string): Promise<void> {
  try {
    const user = await privyServer.getUser(privyUserId);
    if (!user) return;

    const accounts = (user.linkedAccounts ?? []) as unknown as Array<Record<string, unknown>>;

    const wallets = accounts.filter((a) => a.type === "wallet");
    const embedded = wallets.find((w) => w.walletClientType === "privy");
    const walletAddress =
      ((embedded ?? wallets[0])?.address as string | undefined) ?? null;

    const authProvider = user.google
      ? "google"
      : user.email
        ? "email"
        : ((accounts[0]?.type as string | undefined) ?? null);

    const linkedAccounts: LinkedAccountSnapshot[] = accounts.map((a) => ({
      type: String(a.type),
      ...(a.address ? { address: String(a.address) } : {}),
      ...(a.email ? { email: String(a.email) } : {}),
      ...(a.username ? { username: String(a.username) } : {}),
      ...(a.walletClientType ? { walletClientType: String(a.walletClientType) } : {}),
    }));

    await supabaseAdmin
      .from("user_profiles")
      .update({
        wallet_address: walletAddress,
        auth_provider: authProvider,
        linked_accounts: linkedAccounts,
        privy_created_at: user.createdAt ? new Date(user.createdAt).toISOString() : null,
        last_synced_at: new Date().toISOString(),
      })
      .eq("privy_user_id", privyUserId);
  } catch {
    // best-effort — swallow so the calling request is unaffected
  }
}

/**
 * Sync only if the profile has never been synced or the last sync is
 * older than SYNC_TTL_MS. Use this on hot paths (e.g. profile GET) to
 * keep data fresh without a Privy call on every request.
 */
export async function maybeSyncPrivyProfile(
  privyUserId: string,
  lastSyncedAt: string | null | undefined,
): Promise<void> {
  if (lastSyncedAt && Date.now() - new Date(lastSyncedAt).getTime() < SYNC_TTL_MS) {
    return;
  }
  await syncPrivyProfile(privyUserId);
}
