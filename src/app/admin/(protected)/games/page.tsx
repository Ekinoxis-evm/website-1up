import { supabaseAdmin } from "@/lib/supabase";
import { AdminGamesClient } from "@/components/admin/AdminGamesClient";

export default async function AdminGamesPage() {
  const [{ data: allGames }, { data: allCategories }] = await Promise.all([
    supabaseAdmin.from("games").select("*").order("sort_order"),
    supabaseAdmin.from("game_categories").select("*").order("sort_order"),
  ]);
  return <AdminGamesClient games={allGames ?? []} categories={allCategories ?? []} />;
}
