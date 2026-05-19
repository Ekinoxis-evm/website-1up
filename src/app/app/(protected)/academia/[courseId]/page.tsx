import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { verifyCookieToken } from "@/lib/privy";
import { supabaseAdmin } from "@/lib/supabase";
import { AppCourseClient } from "@/components/app/AppCourseClient";

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function AppCoursePage({ params }: Props) {
  const { courseId: courseIdStr } = await params;
  const courseId = Number(courseIdStr);
  if (isNaN(courseId)) notFound();

  const cookieStore = await cookies();
  const claims = await verifyCookieToken(cookieStore.get("privy-token")?.value);
  if (!claims) redirect("/app/login");

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("privy_user_id", claims.userId)
    .single();

  if (!profile) redirect("/app/login");

  // Check enrollment
  const { data: enrollment } = await supabaseAdmin
    .from("enrollments")
    .select("id")
    .eq("user_profile_id", profile.id)
    .eq("course_id", courseId)
    .eq("payment_status", "approved")
    .single();

  if (!enrollment) redirect("/app/academia");

  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("id, name, description, image_url, duration_hours, session_duration_min, intro_video_uid, intro_description, master_id")
    .eq("id", courseId)
    .eq("is_active", true)
    .single();

  if (!course) notFound();

  const { data: modules } = await supabaseAdmin
    .from("course_modules")
    .select("*")
    .eq("course_id", courseId)
    .eq("is_published", true)
    .order("sort_order");

  const moduleIds = (modules ?? []).map(m => m.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sessions: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let links: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let docs: any[] = [];

  if (moduleIds.length > 0) {
    const { data: sessData } = await supabaseAdmin
      .from("course_sessions")
      .select("id, module_id, title, description, duration_minutes, video_uid, is_published, sort_order")
      .in("module_id", moduleIds)
      .eq("is_published", true)
      .order("sort_order");
    sessions = sessData ?? [];

    const sessionIds = (sessions as { id: number }[]).map(s => s.id);
    if (sessionIds.length > 0) {
      const [lRes, dRes] = await Promise.all([
        supabaseAdmin
          .from("course_session_links")
          .select("id, session_id, label, url, sort_order")
          .in("session_id", sessionIds)
          .order("sort_order"),
        supabaseAdmin
          .from("course_session_documents")
          .select("id, session_id, label, mime_type, size_bytes, sort_order")
          .in("session_id", sessionIds)
          .order("sort_order"),
      ]);
      links = lRes.data ?? [];
      docs = dRes.data ?? [];
    }
  }

  // Master name
  let masterName: string | null = null;
  if (course.master_id) {
    const { data: master } = await supabaseAdmin
      .from("masters")
      .select("name")
      .eq("id", course.master_id)
      .single();
    masterName = master?.name ?? null;
  }

  return (
    <AppCourseClient
      course={{ ...course, masterName }}
      modules={modules ?? []}
      sessions={sessions}
      links={links}
      docs={docs}
    />
  );
}
