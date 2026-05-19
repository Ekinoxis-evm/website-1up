import { cookies } from "next/headers";
import { verifyCookieToken } from "@/lib/privy";
import { supabaseAdmin } from "@/lib/supabase";
import { AppAcademiaClient } from "@/components/app/AppAcademiaClient";

export const metadata = { title: "Mis Cursos — 1UP App" };

export default async function AppAcademiaPage() {
  const cookieStore = await cookies();
  const claims = await verifyCookieToken(cookieStore.get("privy-token")?.value);

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://1upesports.org";

  if (!claims) {
    return <AppAcademiaClient enrolledCourses={[]} baseUrl={BASE_URL} />;
  }

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("privy_user_id", claims.userId)
    .single();

  if (!profile) return <AppAcademiaClient enrolledCourses={[]} baseUrl={BASE_URL} />;

  const { data: enrollments } = await supabaseAdmin
    .from("enrollments")
    .select("course_id")
    .eq("user_profile_id", profile.id)
    .eq("payment_status", "approved");

  if (!enrollments?.length) return <AppAcademiaClient enrolledCourses={[]} baseUrl={BASE_URL} />;

  const courseIds = enrollments.map((e) => e.course_id).filter((id): id is number => id !== null);

  const [{ data: courses }, { data: content }] = await Promise.all([
    supabaseAdmin.from("courses").select("id, name").in("id", courseIds),
    supabaseAdmin
      .from("academia_content")
      .select("id, title, content_type, url, stream_uid, is_published, sort_order, course_id")
      .in("course_id", courseIds)
      .eq("is_published", true)
      .order("sort_order"),
  ]);

  const enrolledCourses = (courses ?? []).map((c) => ({
    course_id: c.id,
    course_name: c.name,
    content: (content ?? []).filter((item) => item.course_id === c.id),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline font-black text-5xl md:text-7xl text-on-surface leading-none tracking-tighter">
          MIS <span className="text-secondary">CURSOS</span>
        </h1>
        <div className="h-1 w-16 bg-secondary-container mt-3" />
      </div>
      <AppAcademiaClient enrolledCourses={enrolledCourses} baseUrl={BASE_URL} />
    </div>
  );
}
