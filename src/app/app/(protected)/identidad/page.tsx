import { supabase } from "@/lib/supabase";
import { IdentidadTab } from "@/components/perfil/IdentidadTab";

export const metadata = { title: "Identidad — 1UP App" };

export default async function AppIdentidadPage() {
  const { data: games } = await supabase
    .from("games")
    .select("id, name")
    .order("name", { ascending: true });

  return <IdentidadTab games={games ?? []} />;
}
