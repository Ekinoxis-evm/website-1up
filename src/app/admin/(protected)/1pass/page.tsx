import { supabaseAdmin } from "@/lib/supabase";
import { Admin1PassClient } from "@/components/admin/Admin1PassClient";

export const metadata = { title: "1UP Pass — Admin" };

export default async function Admin1PassPage() {
  const [{ data: config }, { data: benefits }, { data: passOrders }] = await Promise.all([
    supabaseAdmin.from("pass_config").select("*").eq("id", 1).single(),
    supabaseAdmin.from("pass_benefits").select("*").order("sort_order").order("id"),
    supabaseAdmin
      .from("pass_orders")
      .select("id, status, expires_at")
      .eq("status", "confirmed"),
  ]);

  const confirmedCount = passOrders?.length ?? 0;
  const activeNow = (passOrders ?? []).filter(
    (o) => o.expires_at && new Date(o.expires_at) > new Date()
  ).length;

  return (
    <Admin1PassClient
      config={config ?? null}
      benefits={benefits ?? []}
      confirmedCount={confirmedCount}
      activeNow={activeNow}
    />
  );
}
