import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/privy";
import { supabaseAdmin } from "@/lib/supabase";
import { assertEnrollment, courseIdFromSession, CourseAccessError } from "@/lib/courseAccess";

// Returns gated session data (links + document metadata) for enrolled users.
// Does NOT return storage paths or signed URLs — use /api/user/course-document for those.
export async function GET(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionId = Number(req.nextUrl.searchParams.get("sessionId"));
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  let courseId: number;
  try {
    courseId = await courseIdFromSession(sessionId);
  } catch (e) {
    if (e instanceof CourseAccessError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  try {
    await assertEnrollment(claims.userId, courseId);
  } catch (e) {
    if (e instanceof CourseAccessError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const { data: session } = await supabaseAdmin
    .from("course_sessions")
    .select("id, title, description, duration_minutes, video_uid, is_published")
    .eq("id", sessionId)
    .eq("is_published", true)
    .single();

  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: links }, { data: docs }] = await Promise.all([
    supabaseAdmin
      .from("course_session_links")
      .select("id, label, url, sort_order")
      .eq("session_id", sessionId)
      .order("sort_order"),
    supabaseAdmin
      .from("course_session_documents")
      .select("id, label, mime_type, size_bytes, sort_order")
      .eq("session_id", sessionId)
      .order("sort_order"),
  ]);

  return NextResponse.json({
    session,
    links:     links ?? [],
    documents: docs ?? [],
  });
}
