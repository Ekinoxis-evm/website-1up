import { supabaseAdmin } from "@/lib/supabase";
import { AdminCompetitionsClient } from "@/components/admin/AdminCompetitionsClient";

export default async function AdminCompetitionsPage() {
  const [{ data: allComps }, { data: allPlayers }] = await Promise.all([
    supabaseAdmin.from("competitions").select("*").order("year"),
    supabaseAdmin.from("players").select("*").order("sort_order"),
  ]);
  return <AdminCompetitionsClient competitions={allComps ?? []} players={allPlayers ?? []} />;
}
