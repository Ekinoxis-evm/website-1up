import { supabaseAdmin } from "@/lib/supabase";
import { AdminBankAccountsClient } from "@/components/admin/AdminBankAccountsClient";

export default async function AdminBankAccountsPage() {
  const { data } = await supabaseAdmin
    .from("bank_accounts")
    .select("*")
    .order("sort_order")
    .order("id");
  return <AdminBankAccountsClient accounts={data ?? []} />;
}
