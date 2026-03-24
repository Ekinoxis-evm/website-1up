import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, privyServer } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  const user = await privyServer.getUser(claims.userId).catch(() => null);
  return isAdmin(user?.email?.address);
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data } = await supabaseAdmin.from("competitions").insert({
    tournament_name: body.tournamentName,
    country:         body.country,
    city:            body.city || null,
    year:            body.year,
    result:          body.result,
    player_id:       body.playerId || null,
  }).select().single();
  revalidatePath("/team"); revalidatePath("/admin/competitions");
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data } = await supabaseAdmin.from("competitions").update({
    tournament_name: body.tournamentName,
    country:         body.country,
    city:            body.city || null,
    year:            body.year,
    result:          body.result,
    player_id:       body.playerId || null,
  }).eq("id", body.id).select().single();
  revalidatePath("/team"); revalidatePath("/admin/competitions");
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await supabaseAdmin.from("competitions").delete().eq("id", id);
  revalidatePath("/team"); revalidatePath("/admin/competitions");
  return NextResponse.json({ ok: true });
}
