import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { courseIdFromSession } from "@/lib/courseAccess";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { moduleId, sessionIds }: { moduleId: number; sessionIds: number[] } = await req.json();
  const updates = sessionIds.map((id, idx) =>
    supabaseAdmin.from("course_sessions").update({ sort_order: idx }).eq("id", id).eq("module_id", moduleId)
  );
  await Promise.all(updates);
  if (sessionIds[0]) {
    const courseId = await courseIdFromSession(sessionIds[0]);
    revalidatePath(`/app/academia/${courseId}`);
    revalidatePath(`/admin/courses/${courseId}/edit`);
  }
  return NextResponse.json({ ok: true });
}
