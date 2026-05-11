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

  const { searchParams } = new URL(req.url);
  const tournamentId = searchParams.get("tournamentId");

  let query = supabaseAdmin
    .from("tournament_registrations")
    .select("*, user_profiles(nombre, apellidos, username, numero_documento), tournaments(name, date)")
    .order("registered_at", { ascending: false });

  if (tournamentId) query = query.eq("tournament_id", parseInt(tournamentId));

  const { data } = await query;
  return NextResponse.json(data ?? []);
}

export async function PATCH(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, status, notes } = body;
  if (!id || !status) return NextResponse.json({ error: "id y status requeridos" }, { status: 400 });

  const update: Record<string, unknown> = { status };
  if (notes !== undefined) update.notes = notes;

  const { data, error } = await supabaseAdmin
    .from("tournament_registrations")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/admin/tournament-registrations");
  revalidatePath("/torneos");
  return NextResponse.json(data);
}
