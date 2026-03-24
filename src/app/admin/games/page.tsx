import { supabase } from "@/lib/supabase";
import { AdminGamesClient } from "@/components/admin/AdminGamesClient";

export default async function AdminGamesPage() {
  const [{ data: allGames }, { data: allCategories }] = await Promise.all([
    supabase.from("games").select("*").order("sort_order"),
    supabase.from("game_categories").select("*").order("sort_order"),
  ]);
  return <AdminGamesClient games={allGames ?? []} categories={allCategories ?? []} />;
}
