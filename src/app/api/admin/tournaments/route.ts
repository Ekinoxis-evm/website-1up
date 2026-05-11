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

export async function GET() {
  const { data } = await supabaseAdmin
    .from("tournaments")
    .select("*, games(id, name)")
    .eq("is_active", true)
    .order("sort_order")
    .order("date", { ascending: true });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data } = await supabaseAdmin.from("tournaments").insert({
    name:                 body.name,
    game_id:              body.gameId || null,
    date:                 body.date || null,
    prize_pool_cop:       body.prizePoolCop ? parseInt(body.prizePoolCop) : null,
    max_participants:     body.maxParticipants ? parseInt(body.maxParticipants) : null,
    status:               body.status ?? "upcoming",
    location_type:        body.locationType ?? "presencial",
    image_url:            body.imageUrl || null,
    description:          body.description || null,
    is_active:            body.isActive ?? true,
    is_registration_open: body.isRegistrationOpen ?? false,
    sort_order:           body.sortOrder ?? 0,
  }).select().single();
  revalidatePath("/torneos");
  revalidatePath("/admin/torneos");
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data } = await supabaseAdmin.from("tournaments").update({
    name:                 body.name,
    game_id:              body.gameId || null,
    date:                 body.date || null,
    prize_pool_cop:       body.prizePoolCop ? parseInt(body.prizePoolCop) : null,
    max_participants:     body.maxParticipants ? parseInt(body.maxParticipants) : null,
    status:               body.status,
    location_type:        body.locationType,
    image_url:            body.imageUrl || null,
    description:          body.description || null,
    is_active:            body.isActive,
    is_registration_open: body.isRegistrationOpen,
    sort_order:           body.sortOrder ?? 0,
  }).eq("id", body.id).select().single();
  revalidatePath("/torneos");
  revalidatePath("/admin/torneos");
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await supabaseAdmin.from("tournaments").delete().eq("id", id);
  revalidatePath("/torneos");
  revalidatePath("/admin/torneos");
  return NextResponse.json({ ok: true });
}
