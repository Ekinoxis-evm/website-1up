import { supabaseAdmin } from "@/lib/supabase";
import { AdminTournamentBracketsClient } from "@/components/admin/AdminTournamentBracketsClient";

export default async function AdminTournamentBracketsPage() {
  const { data: tournaments } = await supabaseAdmin
    .from("tournaments")
    .select("id, name, status, is_registration_open, max_participants")
    .eq("is_active", true)
    .order("sort_order");

  return <AdminTournamentBracketsClient tournaments={tournaments ?? []} />;
}
