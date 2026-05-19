import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/privy";
import { signStreamToken } from "@/lib/stream";
import { assertEnrollment, courseIdFromSession, CourseAccessError } from "@/lib/courseAccess";
import { supabaseAdmin } from "@/lib/supabase";

// Returns a signed CF Stream token for a course session video.
// Requires the user to be enrolled (payment_status = approved) in the parent course.
export async function POST(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await req.json();

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
    .select("video_uid, is_published")
    .eq("id", sessionId)
    .single();

  if (!session?.is_published || !session.video_uid) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const token = await signStreamToken(session.video_uid);
  return NextResponse.json({ token });
}
