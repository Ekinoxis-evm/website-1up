import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/privy";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  const privyUserId = claims?.userId;
  if (!privyUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const tournamentId = Number(body?.tournamentId);
  if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
    return NextResponse.json({ error: "tournamentId inválido." }, { status: 400 });
  }

  const { data: tournament } = await supabaseAdmin
    .from("tournaments")
    .select("status")
    .eq("id", tournamentId)
    .single();

  if (!tournament) return NextResponse.json({ error: "Torneo no encontrado." }, { status: 404 });
  if (tournament.status !== "live") {
    return NextResponse.json({ error: "El torneo no está en curso." }, { status: 400 });
  }

  const { data: registration } = await supabaseAdmin
    .from("tournament_registrations")
    .select("status")
    .eq("privy_user_id", privyUserId)
    .eq("tournament_id", tournamentId)
    .maybeSingle();

  if (!registration) {
    return NextResponse.json({ error: "No estás inscrito en este torneo." }, { status: 404 });
  }
  if (registration.status !== "registered") {
    return NextResponse.json({ error: "Estado de inscripción inválido." }, { status: 409 });
  }

  const { error } = await supabaseAdmin
    .from("tournament_registrations")
    .update({ status: "attended" })
    .eq("privy_user_id", privyUserId)
    .eq("tournament_id", tournamentId)
    .eq("status", "registered");

  if (error) {
    return NextResponse.json({ error: "No se pudo confirmar la asistencia." }, { status: 500 });
  }

  revalidatePath("/admin/tournament-registrations");
  return NextResponse.json({ ok: true });
}
