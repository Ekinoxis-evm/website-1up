import { supabaseAdmin } from "@/lib/supabase";
import { AdminTokenOrdersClient } from "@/components/admin/AdminTokenOrdersClient";

export default async function AdminTokenOrdersPage() {
  const { data } = await supabaseAdmin
    .from("token_purchase_orders")
    .select("*, user_profiles(nombre, apellidos), bank_accounts(bank_name, account_type, account_number)")
    .order("created_at", { ascending: false })
    .limit(200);
  return <AdminTokenOrdersClient orders={data ?? []} />;
}
