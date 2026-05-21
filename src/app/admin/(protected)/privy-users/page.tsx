import { redirect } from "next/navigation";

// Merged into the unified Usuarios view (user_profiles now holds the
// complete Privy identity data — wallet, linked accounts, provider).
export default function AdminPrivyUsersPage() {
  redirect("/admin/user-profiles");
}
