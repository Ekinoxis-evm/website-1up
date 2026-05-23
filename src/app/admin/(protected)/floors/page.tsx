import { supabaseAdmin } from "@/lib/supabase";
import { AdminFloorsClient } from "@/components/admin/AdminFloorsClient";

export default async function AdminFloorsPage() {
  const { data } = await supabaseAdmin.from("floor_info").select("*").order("sort_order");
  return <AdminFloorsClient floors={data ?? []} />;
}
