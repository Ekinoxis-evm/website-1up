import { supabaseAdmin } from "@/lib/supabase";
import { AdminAliadosClient } from "@/components/admin/AdminAliadosClient";

export default async function AdminAliadosPage() {
  const { data } = await supabaseAdmin
    .from("aliados")
    .select("*")
    .order("sort_order")
    .order("name");
  return <AdminAliadosClient aliados={data ?? []} />;
}
