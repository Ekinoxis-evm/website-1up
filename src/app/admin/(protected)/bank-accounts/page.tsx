import { supabaseAdmin } from "@/lib/supabase";
import { AdminBankAccountsClient } from "@/components/admin/AdminBankAccountsClient";

export default async function AdminBankAccountsPage() {
  const [{ data: accounts }, { data: passConfig }, { data: wallets }] = await Promise.all([
    supabaseAdmin.from("bank_accounts").select("*").order("sort_order").order("id"),
    supabaseAdmin.from("pass_config").select("recipient_address, updated_by").eq("id", 1).single(),
    supabaseAdmin.from("treasury_wallets").select("*").order("sort_order").order("id"),
  ]);
  return (
    <AdminBankAccountsClient
      accounts={accounts ?? []}
      treasuryAddress={passConfig?.recipient_address ?? ""}
      wallets={wallets ?? []}
    />
  );
}
