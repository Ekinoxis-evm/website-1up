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

function revalidate(courseId: number) {
  revalidatePath(`/app/academia/${courseId}`);
  revalidatePath(`/admin/courses/${courseId}/edit`);
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data, error } = await supabaseAdmin.from("course_modules").insert({
    course_id:    body.courseId,
    title:        body.title,
    description:  body.description ?? null,
    sort_order:   body.sortOrder ?? 0,
    is_published: body.isPublished ?? false,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidate(body.courseId);
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data, error } = await supabaseAdmin.from("course_modules").update({
    title:        body.title,
    description:  body.description ?? null,
    sort_order:   body.sortOrder ?? 0,
    is_published: body.isPublished ?? false,
  }).eq("id", body.id).select("*, course_id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidate(data.course_id);
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  const { data: mod } = await supabaseAdmin.from("course_modules").select("course_id").eq("id", id).single();
  await supabaseAdmin.from("course_modules").delete().eq("id", id);
  if (mod) revalidate(mod.course_id);
  return NextResponse.json({ ok: true });
}
