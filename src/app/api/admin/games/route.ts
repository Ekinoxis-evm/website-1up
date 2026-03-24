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
  const { data } = await supabaseAdmin.from("games").insert({
    name:        body.name,
    category_id: body.categoryId,
    image_url:   body.imageUrl || null,
    sort_order:  body.sortOrder ?? 0,
  }).select().single();
  revalidatePath("/"); revalidatePath("/juegos"); revalidatePath("/admin/games");
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data } = await supabaseAdmin.from("games").update({
    name:        body.name,
    category_id: body.categoryId,
    image_url:   body.imageUrl || null,
    sort_order:  body.sortOrder,
  }).eq("id", body.id).select().single();
  revalidatePath("/"); revalidatePath("/juegos"); revalidatePath("/admin/games");
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await supabaseAdmin.from("games").delete().eq("id", id);
  revalidatePath("/"); revalidatePath("/admin/games");
  return NextResponse.json({ ok: true });
}
