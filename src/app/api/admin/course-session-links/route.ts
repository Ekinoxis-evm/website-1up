import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

// H-13: course-session edits feed both the admin editor and the per-course
// curriculum page in the user portal. Revalidate both surfaces on every mutation.
function revalidateCoursesAfterSessionMutation() {
  revalidatePath("/admin/courses");
  revalidatePath("/app/academia/[courseId]", "page");
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data, error } = await supabaseAdmin.from("course_session_links").insert({
    session_id: body.sessionId,
    label:      body.label,
    url:        body.url,
    sort_order: body.sortOrder ?? 0,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateCoursesAfterSessionMutation();
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data, error } = await supabaseAdmin.from("course_session_links").update({
    label:      body.label,
    url:        body.url,
    sort_order: body.sortOrder ?? 0,
  }).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateCoursesAfterSessionMutation();
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await supabaseAdmin.from("course_session_links").delete().eq("id", id);
  revalidateCoursesAfterSessionMutation();
  return NextResponse.json({ ok: true });
}
