import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { deleteCourseDoc } from "@/lib/courseDocs";
import { revalidatePath } from "next/cache";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

// H-13: documents feed the enrolled-user curriculum page. Revalidate both
// surfaces on every mutation.
function revalidateCoursesAfterDocMutation() {
  revalidatePath("/admin/courses");
  revalidatePath("/app/academia/[courseId]", "page");
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data, error } = await supabaseAdmin.from("course_session_documents").insert({
    session_id:   body.sessionId,
    label:        body.label,
    storage_path: body.path,
    mime_type:    body.mimeType,
    size_bytes:   body.sizeBytes,
    sort_order:   body.sortOrder ?? 0,
    uploaded_by:  body.uploadedBy ?? null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateCoursesAfterDocMutation();
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  const { data: doc } = await supabaseAdmin
    .from("course_session_documents")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (doc?.storage_path) await deleteCourseDoc(doc.storage_path);
  await supabaseAdmin.from("course_session_documents").delete().eq("id", id);
  revalidateCoursesAfterDocMutation();
  return NextResponse.json({ ok: true });
}
