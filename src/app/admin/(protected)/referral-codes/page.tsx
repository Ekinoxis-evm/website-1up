import { supabaseAdmin } from "@/lib/supabase";
import { AdminReferralCodesClient } from "@/components/admin/AdminReferralCodesClient";

export const metadata = { title: "Códigos de Referido — Admin" };

export default async function AdminReferralCodesPage() {
  const { data: codes } = await supabaseAdmin
    .from("referral_codes")
    .select("*")
    .order("created_at", { ascending: false });

  return <AdminReferralCodesClient codes={codes ?? []} />;
}
