import { supabaseAdmin } from "@/lib/supabase";
import { AdminBrandLogosClient } from "@/components/admin/AdminBrandLogosClient";

export default async function AdminBrandLogosPage() {
  const { data } = await supabaseAdmin
    .from("brand_logos")
    .select("*")
    .order("sort_order");
  return <AdminBrandLogosClient logos={data ?? []} />;
}
