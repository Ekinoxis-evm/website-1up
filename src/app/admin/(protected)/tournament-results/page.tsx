import { supabaseAdmin } from "@/lib/supabase";
import { AdminTournamentResultsClient } from "@/components/admin/AdminTournamentResultsClient";

export default async function AdminTournamentResultsPage() {
  const [{ data: tournaments }, { data: results }] = await Promise.all([
    supabaseAdmin
      .from("tournaments")
      .select("id, name, status, date")
      .in("status", ["completed", "live"])
      .order("date", { ascending: false }),
    supabaseAdmin
      .from("tournament_results")
      .select("*, user_profiles(nombre, apellidos, username), tournaments(name)")
      .order("tournament_id")
      .order("position"),
  ]);

  return <AdminTournamentResultsClient tournaments={tournaments ?? []} results={results ?? []} />;
}
