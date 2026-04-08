import { supabase } from "@/lib/supabase";
import { AdminSocialLinksClient } from "@/components/admin/AdminSocialLinksClient";

export default async function AdminSocialLinksPage() {
  const { data } = await supabase.from("social_links").select("*").order("sort_order");
  return <AdminSocialLinksClient links={data ?? []} />;
}
