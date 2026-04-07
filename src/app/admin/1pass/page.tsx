import { supabase, supabaseAdmin } from "@/lib/supabase";
import { Admin1PassClient } from "@/components/admin/Admin1PassClient";

export default async function Admin1PassPage() {
  const [
    { data: benefits },
    { data: discounts },
    { data: enrollments },
  ] = await Promise.all([
    supabase.from("pass_benefits").select("*").order("sort_order"),
    supabase.from("discount_rules")
      .select("*")
      .in("applies_to", ["pass", "all"])
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("enrollments")
      .select("*")
      .eq("product_type", "pass")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <Admin1PassClient
      benefits={benefits ?? []}
      discounts={discounts ?? []}
      enrollments={enrollments ?? []}
    />
  );
}
