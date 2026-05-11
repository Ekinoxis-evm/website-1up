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

export async function GET(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabaseAdmin
    .from("international_tournaments")
    .select("*, games(id, name)")
    .order("sort_order")
    .order("date", { ascending: true });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "name requerido" }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("international_tournaments").insert({
    name:              body.name,
    organizer:         body.organizer || null,
    date:              body.date || null,
    country:           body.country || null,
    city:              body.city || null,
    game_id:           body.gameId || null,
    registration_link: body.registrationLink || null,
    image_url:         body.imageUrl || null,
    description:       body.description || null,
    is_active:         body.isActive ?? true,
    sort_order:        body.sortOrder ?? 0,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/torneos");
  revalidatePath("/admin/torneos-internacionales");
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data, error } = await supabaseAdmin.from("international_tournaments").update({
    name:              body.name,
    organizer:         body.organizer || null,
    date:              body.date || null,
    country:           body.country || null,
    city:              body.city || null,
    game_id:           body.gameId || null,
    registration_link: body.registrationLink || null,
    image_url:         body.imageUrl || null,
    description:       body.description || null,
    is_active:         body.isActive,
    sort_order:        body.sortOrder ?? 0,
  }).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/torneos");
  revalidatePath("/admin/torneos-internacionales");
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await supabaseAdmin.from("international_tournaments").delete().eq("id", id);
  revalidatePath("/torneos");
  revalidatePath("/admin/torneos-internacionales");
  return NextResponse.json({ ok: true });
}
