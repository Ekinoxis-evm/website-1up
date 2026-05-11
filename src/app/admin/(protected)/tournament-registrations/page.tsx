import { supabaseAdmin } from "@/lib/supabase";
import { AdminTournamentRegistrationsClient } from "@/components/admin/AdminTournamentRegistrationsClient";

export default async function AdminTournamentRegistrationsPage() {
  const [{ data: registrations }, { data: tournaments }] = await Promise.all([
    supabaseAdmin
      .from("tournament_registrations")
      .select("*, user_profiles(nombre, apellidos, username, numero_documento), tournaments(name, date)")
      .order("registered_at", { ascending: false }),
    supabaseAdmin
      .from("tournaments")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  return (
    <AdminTournamentRegistrationsClient
      registrations={registrations ?? []}
      tournaments={tournaments ?? []}
    />
  );
}
