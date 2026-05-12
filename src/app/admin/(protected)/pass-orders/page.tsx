import { supabaseAdmin } from "@/lib/supabase";
import { AdminPassOrdersClient } from "@/components/admin/AdminPassOrdersClient";

export const metadata = { title: "Órdenes 1UP Pass — Admin" };

export default async function AdminPassOrdersPage() {
  const { data: orders } = await supabaseAdmin
    .from("pass_orders")
    .select("*, user_profiles(nombre, apellidos, email, username), bank_accounts(bank_name, account_type, account_number, holder_name)")
    .order("created_at", { ascending: false })
    .limit(400);

  return <AdminPassOrdersClient orders={orders ?? []} />;
}
