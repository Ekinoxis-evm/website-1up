import { supabase } from "@/lib/supabase";
import { JuegosDisplay } from "@/components/juegos/JuegosDisplay";

export const metadata = { title: "Juegos — 1UP Gaming Tower" };

export default async function JuegosPage() {
  const [{ data: categories }, { data: games }] = await Promise.all([
    supabase.from("game_categories").select("*").order("sort_order"),
    supabase.from("games").select("*").order("sort_order"),
  ]);

  return <JuegosDisplay categories={categories ?? []} games={games ?? []} />;
}
