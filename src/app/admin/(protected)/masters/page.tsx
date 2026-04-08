import { supabaseAdmin as supabase } from "@/lib/supabase";
import { AdminMastersClient } from "@/components/admin/AdminMastersClient";

export default async function AdminMastersPage() {
  const [{ data: masters }, { data: courses }] = await Promise.all([
    supabase.from("masters").select("*").order("sort_order"),
    supabase.from("courses").select("id, name, category, master_id").order("name"),
  ]);
  return <AdminMastersClient masters={masters ?? []} courses={courses ?? []} />;
}
