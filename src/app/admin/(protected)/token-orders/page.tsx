import { supabaseAdmin } from "@/lib/supabase";
import { AdminTokenOrdersClient } from "@/components/admin/AdminTokenOrdersClient";
import { getComprobanteSignedUrl } from "@/lib/blob";

export default async function AdminTokenOrdersPage() {
  const { data } = await supabaseAdmin
    .from("token_purchase_orders")
    .select("*, user_profiles(nombre, apellidos), bank_accounts(bank_name, account_type, account_number)")
    .order("created_at", { ascending: false })
    .limit(200);

  const enriched = await Promise.all(
    (data ?? []).map(async (o) => {
      if (!o.comprobante_url) return o;
      const signed = await getComprobanteSignedUrl(o.comprobante_url);
      return { ...o, comprobante_url: signed ?? o.comprobante_url } as typeof o;
    })
  );

  return <AdminTokenOrdersClient orders={enriched} />;
}
