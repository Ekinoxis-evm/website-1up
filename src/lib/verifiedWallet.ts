import { supabaseAdmin } from "@/lib/supabase";

export type WalletLookup =
  | { ok: true;  wallet: `0x${string}` }
  | { ok: false; reason: "no_profile" | "no_wallet" | "mismatch" };

/**
 * Returns the caller's verified wallet address, lowercased.
 *
 * The credited wallet on any money-moving order MUST be the wallet stored on
 * the caller's `user_profiles` row (synced from Privy by `src/lib/privySync.ts`),
 * never a value taken verbatim from the request body. If the body supplies a
 * `walletAddress`, it must match the profile's wallet case-insensitively —
 * otherwise this returns a `mismatch` to be turned into a 400 by the caller.
 *
 * Fixes audit findings C-1 (wallet IDOR on order creation) and C-2
 * (verifyPassTransfer's expectedFrom hijack).
 */
export async function getVerifiedWallet(
  privyUserId: string,
  bodyWalletAddress?: string | null,
): Promise<WalletLookup> {
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("wallet_address")
    .eq("privy_user_id", privyUserId)
    .single();

  if (!profile) return { ok: false, reason: "no_profile" };

  const wallet = profile.wallet_address?.toLowerCase() ?? null;
  if (!wallet || !/^0x[0-9a-f]{40}$/.test(wallet)) {
    return { ok: false, reason: "no_wallet" };
  }

  if (bodyWalletAddress && bodyWalletAddress.toLowerCase() !== wallet) {
    return { ok: false, reason: "mismatch" };
  }

  return { ok: true, wallet: wallet as `0x${string}` };
}
