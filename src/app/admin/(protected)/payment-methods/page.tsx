import { supabaseAdmin } from "@/lib/supabase";
import { AdminPaymentMethodsClient } from "@/components/admin/AdminPaymentMethodsClient";

export default async function AdminPaymentMethodsPage() {
  const { data } = await supabaseAdmin
    .from("service_payment_methods")
    .select("*")
    .order("service");

  return <AdminPaymentMethodsClient rows={data ?? []} />;
}
