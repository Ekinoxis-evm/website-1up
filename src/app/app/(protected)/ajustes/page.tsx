import { supabase } from "@/lib/supabase";
import { AjustesClient } from "@/components/perfil/AjustesClient";

export const metadata = { title: "Ajustes — 1UP App" };

export default async function AppAjustesPage() {
  const { data: games } = await supabase
    .from("games")
    .select("id, name")
    .order("name", { ascending: true });

  return <AjustesClient games={games ?? []} />;
}
