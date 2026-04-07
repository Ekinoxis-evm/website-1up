import { supabase } from "@/lib/supabase";
import { AdminMastersClient } from "@/components/admin/AdminMastersClient";

export default async function AdminMastersPage() {
  const { data } = await supabase.from("masters").select("*").order("sort_order");
  return <AdminMastersClient masters={data ?? []} />;
}
