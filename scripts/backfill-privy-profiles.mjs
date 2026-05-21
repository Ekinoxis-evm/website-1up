// One-time backfill — populate user_profiles with Privy identity data
// (wallet_address, auth_provider, linked_accounts, privy_created_at).
// Run with: node scripts/backfill-privy-profiles.mjs

import { readFileSync } from "fs";
import { resolve } from "path";
import { PrivyClient } from "@privy-io/server-auth";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), ".env.local"), "utf-8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const privy = new PrivyClient(env.NEXT_PUBLIC_PRIVY_APP_ID, env.PRIVY_APP_SECRET);
const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function extract(user) {
  const accounts = user.linkedAccounts ?? [];
  const wallets = accounts.filter((a) => a.type === "wallet");
  const embedded = wallets.find((w) => w.walletClientType === "privy");
  const walletAddress = (embedded ?? wallets[0])?.address ?? null;
  const authProvider = user.google ? "google" : user.email ? "email" : (accounts[0]?.type ?? null);
  const linkedAccounts = accounts.map((a) => ({
    type: String(a.type),
    ...(a.address ? { address: String(a.address) } : {}),
    ...(a.email ? { email: String(a.email) } : {}),
    ...(a.username ? { username: String(a.username) } : {}),
    ...(a.walletClientType ? { walletClientType: String(a.walletClientType) } : {}),
  }));
  return {
    wallet_address: walletAddress,
    auth_provider: authProvider,
    linked_accounts: linkedAccounts,
    privy_created_at: user.createdAt ? new Date(user.createdAt).toISOString() : null,
    last_synced_at: new Date().toISOString(),
  };
}

const { data: profiles, error } = await supa
  .from("user_profiles")
  .select("id, privy_user_id");

if (error) {
  console.error("Failed to load profiles:", error.message);
  process.exit(1);
}

console.log(`Backfilling ${profiles.length} profiles…`);
let ok = 0, fail = 0;

for (const p of profiles) {
  try {
    const user = await privy.getUser(p.privy_user_id);
    const patch = extract(user);
    const { error: upErr } = await supa
      .from("user_profiles")
      .update(patch)
      .eq("id", p.id);
    if (upErr) throw new Error(upErr.message);
    ok++;
    console.log(`  ✓ #${p.id} ${patch.wallet_address ?? "(no wallet)"} ${patch.auth_provider ?? ""}`);
  } catch (e) {
    fail++;
    console.log(`  ✗ #${p.id} ${p.privy_user_id} — ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 150)); // be gentle to the Privy API
}

console.log(`\nDone. ${ok} synced, ${fail} failed.`);
process.exit(0);
