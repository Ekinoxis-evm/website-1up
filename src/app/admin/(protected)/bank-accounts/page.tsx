import { supabaseAdmin } from "@/lib/supabase";
import { AdminBankAccountsClient } from "@/components/admin/AdminBankAccountsClient";

export default async function AdminBankAccountsPage() {
  const [{ data: accounts }, { data: wallets }] = await Promise.all([
    supabaseAdmin.from("bank_accounts").select("*").order("sort_order").order("id"),
    supabaseAdmin.from("treasury_wallets").select("*").order("sort_order").order("id"),
  ]);
  return (
    <AdminBankAccountsClient
      accounts={accounts ?? []}
      wallets={wallets ?? []}
    />
  );
}
