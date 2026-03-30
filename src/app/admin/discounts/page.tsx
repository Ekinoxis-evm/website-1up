import { supabase } from "@/lib/supabase";
import { AdminDiscountsClient } from "@/components/admin/AdminDiscountsClient";

export const metadata = { title: "Descuentos — Admin 1UP" };

export default async function AdminDiscountsPage() {
  const { data } = await supabase
    .from("discount_rules")
    .select("*")
    .order("created_at", { ascending: false });

  return <AdminDiscountsClient rules={data ?? []} />;
}
