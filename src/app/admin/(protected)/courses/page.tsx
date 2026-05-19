import { supabaseAdmin } from "@/lib/supabase";
import { AdminCoursesClient } from "@/components/admin/AdminCoursesClient";

export default async function AdminCoursesPage() {
  const { data: courses } = await supabaseAdmin
    .from("courses")
    .select("*")
    .order("category")
    .order("sort_order");
  return <AdminCoursesClient courses={courses ?? []} />;
}
