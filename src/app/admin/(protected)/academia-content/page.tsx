import { supabaseAdmin } from "@/lib/supabase";
import { AdminAcademiaContentClient } from "@/components/admin/AdminAcademiaContentClient";

export default async function AdminAcademiaContentPage() {
  const [{ data: content }, { data: courses }] = await Promise.all([
    supabaseAdmin.from("academia_content").select("*").order("course_id").order("sort_order"),
    supabaseAdmin.from("courses").select("*").eq("is_active", true).order("name"),
  ]);
  return <AdminAcademiaContentClient content={content ?? []} courses={courses ?? []} />;
}
