import { supabaseAdmin } from "@/lib/supabase";
import { AdminUserProfilesClient } from "@/components/admin/AdminUserProfilesClient";

export default async function AdminUserProfilesPage() {
  // Use service role — user_profiles has RLS enabled
  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false });
  return <AdminUserProfilesClient profiles={data ?? []} />;
}
