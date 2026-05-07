import { supabaseAdmin } from "@/lib/supabase";
import { AdminPassBankOrdersClient } from "@/components/admin/AdminPassBankOrdersClient";

export const metadata = { title: "Pass — Transferencias Bancarias — Admin" };

export default async function AdminPassBankOrdersPage() {
  const { data: orders } = await supabaseAdmin
    .from("pass_orders")
    .select("*, user_profiles(nombre, apellidos, email, username), bank_accounts(bank_name, account_type, account_number, holder_name)")
    .eq("payment_method", "bank")
    .order("created_at", { ascending: false })
    .limit(200);

  return <AdminPassBankOrdersClient orders={orders ?? []} />;
}
