import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return isAdmin(await resolveUserEmail(claims.userId));
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data } = await supabaseAdmin.from("floor_info").insert({
    floor_label:  body.floorLabel,
    title:        body.title,
    description:  body.description,
    accent_color: body.accentColor || null,
    sort_order:   body.sortOrder ?? 0,
  }).select().single();
  revalidatePath("/gaming-tower"); revalidatePath("/admin/floors");
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data } = await supabaseAdmin.from("floor_info").update({
    floor_label:  body.floorLabel,
    title:        body.title,
    description:  body.description,
    accent_color: body.accentColor || null,
    sort_order:   body.sortOrder ?? 0,
  }).eq("id", body.id).select().single();
  revalidatePath("/gaming-tower"); revalidatePath("/admin/floors");
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await supabaseAdmin.from("floor_info").delete().eq("id", id);
  revalidatePath("/gaming-tower"); revalidatePath("/admin/floors");
  return NextResponse.json({ ok: true });
}
