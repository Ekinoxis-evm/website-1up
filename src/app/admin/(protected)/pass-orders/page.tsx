import { supabaseAdmin } from "@/lib/supabase";
import { AdminPassOrdersClient } from "@/components/admin/AdminPassOrdersClient";
import { AdminPassesList } from "@/components/admin/AdminPassesList";
import { getComprobanteSignedUrl } from "@/lib/blob";

export const metadata = { title: "Órdenes 1UP Pass — Admin" };

export default async function AdminPassOrdersPage() {
  const [{ data: orders }, { data: profiles }, { data: config }, { data: passes }] = await Promise.all([
    supabaseAdmin
      .from("pass_orders")
      .select("*, user_profiles(nombre, apellidos, email, username), bank_accounts(bank_name, account_type, account_number, holder_name)")
      .order("created_at", { ascending: false })
      .limit(400),
    supabaseAdmin
      .from("user_profiles")
      .select("id, nombre, apellidos, email, privy_user_id, wallet_address")
      .not("onboarding_completed_at", "is", null)
      .order("nombre"),
    supabaseAdmin.from("pass_config").select("duration_days").eq("id", 1).single(),
    supabaseAdmin
      .from("passes")
      .select("id, state, source, source_ref, duration_days, activated_at, expires_at, owner_user_profile_id, user_profiles!passes_owner_user_profile_id_fkey(nombre, apellidos, email)")
      .order("issued_at", { ascending: false })
      .limit(500),
  ]);

  const enriched = await Promise.all(
    (orders ?? []).map(async (o) => {
      if (!o.comprobante_url) return o;
      const signed = await getComprobanteSignedUrl(o.comprobante_url);
      return { ...o, comprobante_url: signed ?? o.comprobante_url } as typeof o;
    })
  );

  return (
    <div className="space-y-6">
      <AdminPassOrdersClient
        orders={enriched}
        profiles={profiles ?? []}
        defaultDuration={config?.duration_days ?? 30}
      />
      <AdminPassesList passes={passes ?? []} />
    </div>
  );
}
