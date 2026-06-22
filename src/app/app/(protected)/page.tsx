import { WalletTab } from "@/components/perfil/WalletTab";
import { supabaseAdmin } from "@/lib/supabase";
import { tokenPurchaseCashAvailable } from "@/lib/tokenPurchase";

export const metadata = { title: "Wallet — 1UP App" };

export default async function AppWalletPage() {
  // Cash + card on $1UP purchases are admin-gated per service. Computed
  // server-side (RLS deny-all → service-role only) and threaded into the buy
  // wizard. Card additionally requires the PAYMENTS_CARD_LIVE kill-switch.
  const { data: cfgRow } = await supabaseAdmin
    .from("service_payment_methods")
    .select("cash_enabled, card_enabled")
    .eq("service", "token_purchase")
    .maybeSingle();

  const cardEnabled = !!cfgRow?.card_enabled && process.env.PAYMENTS_CARD_LIVE === "true";

  return <WalletTab cashEnabled={tokenPurchaseCashAvailable(cfgRow ?? undefined)} cardEnabled={cardEnabled} />;
}
