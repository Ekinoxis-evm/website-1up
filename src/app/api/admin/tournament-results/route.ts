import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { pointsFor } from "@/lib/tournamentPoints";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

export async function GET(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const tournamentId = searchParams.get("tournamentId");

  let query = supabaseAdmin
    .from("tournament_results")
    .select("*, user_profiles(nombre, apellidos, username), tournaments(name)")
    .order("position");

  if (tournamentId) query = query.eq("tournament_id", parseInt(tournamentId));

  const { data } = await query;
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const claims = await verifyToken(req.headers.get("authorization"));
  const adminEmail = claims ? await resolveUserEmail(claims.userId) : null;

  const body = await req.json();
  const { tournamentId, userProfileId, position } = body;
  if (!tournamentId || !userProfileId || !position)
    return NextResponse.json({ error: "tournamentId, userProfileId y position son requeridos" }, { status: 400 });

  const points = body.points ?? pointsFor(position);

  const { data, error } = await supabaseAdmin
    .from("tournament_results")
    .upsert({
      tournament_id:   tournamentId,
      user_profile_id: userProfileId,
      position,
      points,
      awarded_by: adminEmail ?? undefined,
    }, { onConflict: "tournament_id,position" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/torneos");
  revalidatePath("/team");
  revalidatePath("/admin/tournament-results");
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await supabaseAdmin.from("tournament_results").delete().eq("id", id);
  revalidatePath("/torneos");
  revalidatePath("/team");
  revalidatePath("/admin/tournament-results");
  return NextResponse.json({ ok: true });
}
