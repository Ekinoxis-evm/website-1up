import { supabaseAdmin } from "@/lib/supabase";
import { AdminUserProfilesClient } from "@/components/admin/AdminUserProfilesClient";

export const metadata = { title: "Usuarios — 1UP Gaming Tower" };

export default async function AdminUserProfilesPage() {
  // Service role — user_profiles has RLS enabled
  const [{ data: profiles }, { data: games }] = await Promise.all([
    supabaseAdmin
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("games").select("id, name"),
  ]);

  const gameNames: Record<number, string> = {};
  for (const g of games ?? []) gameNames[g.id] = g.name;

  return <AdminUserProfilesClient profiles={profiles ?? []} gameNames={gameNames} />;
}
