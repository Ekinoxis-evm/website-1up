import { supabaseAdmin } from "@/lib/supabase";
import { AdminPlayersClient } from "@/components/admin/AdminPlayersClient";

export default async function AdminPlayersPage() {
  const { data } = await supabaseAdmin.from("players").select("*").order("sort_order");
  return <AdminPlayersClient players={data ?? []} />;
}
