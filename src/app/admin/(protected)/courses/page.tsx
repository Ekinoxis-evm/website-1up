import { supabaseAdmin } from "@/lib/supabase";
import { AdminCoursesClient } from "@/components/admin/AdminCoursesClient";

export default async function AdminCoursesPage() {
  const [{ data: courses }, { data: masters }, { data: content }] = await Promise.all([
    supabaseAdmin.from("courses").select("*").order("category").order("sort_order"),
    supabaseAdmin.from("masters").select("id, name").eq("is_active", true).order("name"),
    supabaseAdmin.from("academia_content").select("*").order("course_id").order("sort_order"),
  ]);
  return <AdminCoursesClient courses={courses ?? []} masters={masters ?? []} content={content ?? []} />;
}
