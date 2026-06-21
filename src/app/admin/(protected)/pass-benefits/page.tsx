import { supabaseAdmin } from "@/lib/supabase";
import { AdminPassBenefitsClient } from "@/components/admin/AdminPassBenefitsClient";

export default async function AdminPassBenefitsPage() {
  const { data } = await supabaseAdmin.from("pass_benefits").select("*").order("sort_order");
  return <AdminPassBenefitsClient benefits={data ?? []} />;
}
