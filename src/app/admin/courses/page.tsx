import { supabase } from "@/lib/supabase";
import { AdminCoursesClient } from "@/components/admin/AdminCoursesClient";

export default async function AdminCoursesPage() {
  const { data } = await supabase.from("courses").select("*").order("category").order("sort_order");
  return <AdminCoursesClient courses={data ?? []} />;
}
