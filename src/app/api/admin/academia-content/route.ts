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
  const body = await req.json();
  const { data } = await supabaseAdmin.from("academia_content").insert({
    course_id:    body.courseId,
    content_type: body.contentType,
    title:        body.title,
    description:  body.description || null,
    url:          body.url || null,
    sort_order:   body.sortOrder ?? 0,
    is_published: body.isPublished ?? false,
  }).select().single();
  revalidatePath("/admin/academia-content");
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data } = await supabaseAdmin.from("academia_content").update({
    course_id:    body.courseId,
    content_type: body.contentType,
    title:        body.title,
    description:  body.description || null,
    url:          body.url || null,
    sort_order:   body.sortOrder ?? 0,
    is_published: body.isPublished ?? false,
  }).eq("id", body.id).select().single();
  revalidatePath("/admin/academia-content");
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await supabaseAdmin.from("academia_content").delete().eq("id", id);
  revalidatePath("/admin/academia-content");
  return NextResponse.json({ ok: true });
}
