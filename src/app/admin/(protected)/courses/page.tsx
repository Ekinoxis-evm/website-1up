import { supabase } from "@/lib/supabase";
import { AdminCoursesClient } from "@/components/admin/AdminCoursesClient";

export default async function AdminCoursesPage() {
  const [{ data: courses }, { data: masters }, { data: content }] = await Promise.all([
    supabase.from("courses").select("*").order("category").order("sort_order"),
    supabase.from("masters").select("id, name").eq("is_active", true).order("name"),
    supabase.from("academia_content").select("*").order("course_id").order("sort_order"),
  ]);
  return <AdminCoursesClient courses={courses ?? []} masters={masters ?? []} content={content ?? []} />;
}
