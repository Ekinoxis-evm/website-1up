import { supabase } from "@/lib/supabase";
import { AdminDiscountsClient } from "@/components/admin/AdminDiscountsClient";

export const metadata = { title: "Descuentos — Admin 1UP" };

export default async function AdminDiscountsPage() {
  const [{ data: rules }, { data: aliados }] = await Promise.all([
    supabase.from("discount_rules").select("*").order("created_at", { ascending: false }),
    supabase.from("aliados").select("id, name").eq("is_active", true).order("name"),
  ]);

  return <AdminDiscountsClient rules={rules ?? []} aliados={aliados ?? []} />;
}
