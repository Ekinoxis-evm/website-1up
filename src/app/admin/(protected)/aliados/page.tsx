import { supabaseAdmin as supabase } from "@/lib/supabase";
import { AdminAliadosClient } from "@/components/admin/AdminAliadosClient";

export default async function AdminAliadosPage() {
  const { data } = await supabase.from("aliados").select("*").order("name");
  return <AdminAliadosClient aliados={data ?? []} />;
}
