import { supabaseAdmin } from "@/lib/supabase";
import { AdminSiteImagesClient } from "@/components/admin/AdminSiteImagesClient";

export default async function AdminSiteImagesPage() {
  const { data } = await supabaseAdmin
    .from("site_content")
    .select("key, image_url, updated_at")
    .in("key", ["equipment_highlight", "learning_path"])
    .order("key");

  return <AdminSiteImagesClient items={data ?? []} />;
}
