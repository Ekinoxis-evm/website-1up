import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { AdminCourseEditor } from "@/components/admin/AdminCourseEditor";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminCourseEditPage({ params }: Props) {
  const { id } = await params;
  const courseId = Number(id);
  if (isNaN(courseId)) notFound();

  const [{ data: course }, { data: masters }, { data: modules }] = await Promise.all([
    supabaseAdmin.from("courses").select("*").eq("id", courseId).single(),
    supabaseAdmin.from("masters").select("id, name").eq("is_active", true).order("name"),
    supabaseAdmin.from("course_modules").select("*").eq("course_id", courseId).order("sort_order"),
  ]);

  if (!course) notFound();

  const moduleIds = (modules ?? []).map(m => m.id);
  let allSessions: import("@/types/database.types").CourseSession[] = [];
  let allLinks: import("@/types/database.types").CourseSessionLink[] = [];
  let allDocs: import("@/types/database.types").CourseSessionDocument[] = [];

  if (moduleIds.length > 0) {
    const { data: sessData } = await supabaseAdmin
      .from("course_sessions")
      .select("*")
      .in("module_id", moduleIds)
      .order("sort_order");
    allSessions = sessData ?? [];

    const sessionIds = allSessions.map(s => s.id);
    if (sessionIds.length > 0) {
      const [{ data: lData }, { data: dData }] = await Promise.all([
        supabaseAdmin.from("course_session_links").select("*").in("session_id", sessionIds).order("sort_order"),
        supabaseAdmin.from("course_session_documents").select("*").in("session_id", sessionIds).order("sort_order"),
      ]);
      allLinks = lData ?? [];
      allDocs = dData ?? [];
    }
  }

  return (
    <AdminCourseEditor
      course={course}
      masters={masters ?? []}
      initialModules={modules ?? []}
      initialSessions={allSessions}
      initialLinks={allLinks}
      initialDocs={allDocs}
    />
  );
}
