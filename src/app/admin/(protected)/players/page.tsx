import { supabase } from "@/lib/supabase";
import { AdminPlayersClient } from "@/components/admin/AdminPlayersClient";

export default async function AdminPlayersPage() {
  const { data } = await supabase.from("players").select("*").order("sort_order");
  return <AdminPlayersClient players={data ?? []} />;
}
