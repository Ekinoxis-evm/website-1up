import { supabaseAdmin } from "@/lib/supabase";
import { AdminPassOrdersClient } from "@/components/admin/AdminPassOrdersClient";

export const metadata = { title: "Compras Pass — Admin" };

export default async function AdminPassOrdersPage() {
  const { data: orders } = await supabaseAdmin
    .from("pass_orders")
    .select("*, user_profiles(nombre, apellidos, email, username)")
    .order("created_at", { ascending: false })
    .limit(200);

  return <AdminPassOrdersClient orders={orders ?? []} />;
}
