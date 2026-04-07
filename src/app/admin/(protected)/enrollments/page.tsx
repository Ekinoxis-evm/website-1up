import { supabase } from "@/lib/supabase";
import { AdminEnrollmentsClient } from "@/components/admin/AdminEnrollmentsClient";

export const metadata = { title: "Inscripciones — Admin 1UP" };

export default async function AdminEnrollmentsPage() {
  const { data } = await supabase
    .from("enrollments")
    .select(`
      id,
      product_type,
      original_price_cop,
      discount_pct_applied,
      final_price_cop,
      payment_status,
      mp_payment_id,
      paid_at,
      created_at,
      user_profiles ( email, tipo_documento, numero_documento, comfenalco_afiliado ),
      courses ( name, category ),
      discount_rules ( name, trigger_type )
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  return <AdminEnrollmentsClient enrollments={data ?? []} />;
}
