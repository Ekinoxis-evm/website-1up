import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/privy";
import { supabaseAdmin } from "@/lib/supabase";
import { assertEnrollment, courseIdFromSession, CourseAccessError } from "@/lib/courseAccess";
import { getCourseDocSignedUrl } from "@/lib/courseDocs";

// Returns a 1-hour signed download URL for a course document.
// Requires enrollment in the parent course.
export async function GET(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docId = Number(req.nextUrl.searchParams.get("id"));
  if (!docId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data: doc } = await supabaseAdmin
    .from("course_session_documents")
    .select("id, session_id, storage_path, label, mime_type")
    .eq("id", docId)
    .single();

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let courseId: number;
  try {
    courseId = await courseIdFromSession(doc.session_id);
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

  const url = await getCourseDocSignedUrl(doc.storage_path, 3600);
  return NextResponse.json({ url, label: doc.label, mimeType: doc.mime_type });
}
