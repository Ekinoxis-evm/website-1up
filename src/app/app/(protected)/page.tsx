import { WalletTab } from "@/components/perfil/WalletTab";
import { supabaseAdmin } from "@/lib/supabase";
import { tokenPurchaseCashAvailable } from "@/lib/tokenPurchase";

export const metadata = { title: "Wallet — 1UP App" };

export default async function AppWalletPage() {
  // Cash on $1UP purchases is admin-gated per service. Computed server-side
  // (RLS deny-all → service-role only) and threaded into the buy wizard.
  const { data: cfgRow } = await supabaseAdmin
    .from("service_payment_methods")
    .select("cash_enabled")
    .eq("service", "token_purchase")
    .maybeSingle();

  return <WalletTab cashEnabled={tokenPurchaseCashAvailable(cfgRow ?? undefined)} />;
}
