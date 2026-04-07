import { supabase } from "@/lib/supabase";
import { AdminCompetitionsClient } from "@/components/admin/AdminCompetitionsClient";

export default async function AdminCompetitionsPage() {
  const [{ data: allComps }, { data: allPlayers }] = await Promise.all([
    supabase.from("competitions").select("*").order("year"),
    supabase.from("players").select("*").order("sort_order"),
  ]);
  return <AdminCompetitionsClient competitions={allComps ?? []} players={allPlayers ?? []} />;
}
