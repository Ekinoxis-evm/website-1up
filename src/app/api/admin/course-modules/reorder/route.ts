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

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { courseId, moduleIds }: { courseId: number; moduleIds: number[] } = await req.json();
  const updates = moduleIds.map((id, idx) =>
    supabaseAdmin.from("course_modules").update({ sort_order: idx }).eq("id", id).eq("course_id", courseId)
  );
  await Promise.all(updates);
  revalidatePath(`/app/academia/${courseId}`);
  revalidatePath(`/admin/courses/${courseId}/edit`);
  return NextResponse.json({ ok: true });
}
