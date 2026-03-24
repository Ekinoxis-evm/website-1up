import { supabaseAdmin } from "@/lib/supabase";
import { AdminUsersClient } from "@/components/admin/AdminUsersClient";

export const metadata = { title: "Admins — 1UP Gaming Tower" };

export default async function AdminUsersPage() {
  const { data: dbAdmins } = await supabaseAdmin
    .from("admin_users")
    .select("id, email, added_by, created_at")
    .order("created_at", { ascending: true });

  const envAdmins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return <AdminUsersClient dbAdmins={dbAdmins ?? []} envAdmins={envAdmins} />;
}
