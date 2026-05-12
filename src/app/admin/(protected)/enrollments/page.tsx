import { supabaseAdmin } from "@/lib/supabase";
import { AdminEnrollmentsClient } from "@/components/admin/AdminEnrollmentsClient";

export const metadata = { title: "Inscripciones — Admin 1UP" };

export default async function AdminEnrollmentsPage() {
  const { data } = await supabaseAdmin
    .from("enrollments")
    .select(`
      id,
      product_type,
      original_price_cop,
      discount_pct_applied,
      final_price_cop,
      payment_method,
      payment_status,
      mp_payment_id,
      paid_at,
      tx_hash,
      approved_tx_hash,
      comprobante_url,
      bank_account_id,
      rejection_reason,
      reviewed_by,
      reviewed_at,
      created_at,
      user_profiles ( email, nombre, apellidos, tipo_documento, numero_documento, comfenalco_afiliado ),
      courses ( name, category ),
      discount_rules ( name, trigger_type ),
      bank_accounts ( bank_name, account_number )
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  return <AdminEnrollmentsClient enrollments={data ?? []} />;
}
