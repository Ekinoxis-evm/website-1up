import { supabaseAdmin } from "@/lib/supabase";
import { AdminTorneosIntlClient } from "@/components/admin/AdminTorneosIntlClient";

export default async function AdminTorneosIntlPage() {
  const [{ data: tournaments }, { data: games }] = await Promise.all([
    supabaseAdmin
      .from("international_tournaments")
      .select("*, games(id, name)")
      .order("sort_order")
      .order("date", { ascending: true }),
    supabaseAdmin.from("games").select("id, name").order("name"),
  ]);
  return <AdminTorneosIntlClient tournaments={tournaments ?? []} games={games ?? []} />;
}
