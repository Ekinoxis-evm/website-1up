import { supabaseAdmin } from "@/lib/supabase";
import { Admin1PassClient } from "@/components/admin/Admin1PassClient";

export const metadata = { title: "1UP Pass — Admin" };

export default async function Admin1PassPage() {
  const [{ data: config }, { data: passOrders }, { data: passes }, { data: treasuryWallets }] =
    await Promise.all([
      supabaseAdmin.from("pass_config").select("*").eq("id", 1).single(),
      supabaseAdmin
        .from("pass_orders")
        .select("id, status, expires_at")
        .eq("status", "confirmed"),
      supabaseAdmin
        .from("passes")
        .select("id, state, source, source_ref, duration_days, activated_at, expires_at, owner_user_profile_id, user_profiles!passes_owner_user_profile_id_fkey(nombre, apellidos, email)")
        .order("issued_at", { ascending: false })
        .limit(500),
      supabaseAdmin
        .from("treasury_wallets")
        .select("id, label, address")
        .eq("is_active", true)
        .order("sort_order")
        .order("id"),
    ]);

  const confirmedCount = passOrders?.length ?? 0;
  const activeNow = (passOrders ?? []).filter(
    (o) => o.expires_at && new Date(o.expires_at) > new Date()
  ).length;

  return (
    <Admin1PassClient
      config={config ?? null}
      confirmedCount={confirmedCount}
      activeNow={activeNow}
      passes={passes ?? []}
      treasuryWallets={treasuryWallets ?? []}
    />
  );
}
