import { supabaseAdmin } from "@/lib/supabase";
import { AdminTorneosClient } from "@/components/admin/AdminTorneosClient";

export default async function AdminTorneosPage() {
  const [{ data: tournaments }, { data: games }] = await Promise.all([
    supabaseAdmin.from("tournaments").select("*, games(id, name)").order("sort_order").order("date", { ascending: true }),
    supabaseAdmin.from("games").select("id, name").order("name"),
  ]);
  return <AdminTorneosClient tournaments={tournaments ?? []} games={games ?? []} />;
}
