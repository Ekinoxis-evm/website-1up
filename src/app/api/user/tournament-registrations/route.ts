import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { revalidatePath } from "next/cache";
import { sendTournamentRegistrationEmail } from "@/lib/email";
import { buildGoogleCalendarUrl } from "@/lib/calendar";

async function getPrivyUserId(req: NextRequest): Promise<string | null> {
  const claims = await verifyToken(req.headers.get("authorization"));
  return claims?.userId ?? null;
}

export async function GET(req: NextRequest) {
  const privyUserId = await getPrivyUserId(req);
  if (!privyUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("tournament_registrations")
    .select("tournament_id, status, registered_at, tournaments(id, name, date, location_type, image_url, status, games(id, name))")
    .eq("privy_user_id", privyUserId)
    .neq("status", "cancelled")
    .order("registered_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const privyUserId = await getPrivyUserId(req);
  if (!privyUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { tournamentId } = body;
  if (!tournamentId) return NextResponse.json({ error: "tournamentId requerido" }, { status: 400 });

  // Resolve user_profile_id
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id, nombre, apellidos")
    .eq("privy_user_id", privyUserId)
    .single();
  if (!profile) return NextResponse.json({ error: "Perfil no encontrado. Completa el onboarding primero." }, { status: 404 });

  // Atomic registration via RPC (checks capacity + uniqueness)
  const { data: result, error: rpcError } = await supabaseAdmin.rpc("register_for_tournament", {
    tour_id:   tournamentId,
    user_pid:  profile.id,
    privy_uid: privyUserId,
  });

  if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 });

  const res = result as { ok: boolean; reason?: string };
  if (!res.ok) {
    const msgs: Record<string, string> = {
      closed:             "El registro para este torneo está cerrado.",
      not_active:         "Este torneo no acepta inscripciones ahora.",
      full:               "El torneo está lleno.",
      already_registered: "Ya estás inscrito en este torneo.",
      not_found:          "Torneo no encontrado.",
    };
    const status = res.reason === "full" || res.reason === "already_registered" ? 409 : 400;
    return NextResponse.json({ error: msgs[res.reason ?? ""] ?? "No se pudo completar la inscripción.", reason: res.reason }, { status });
  }

  // Fetch tournament for email + calendar
  const { data: tournament } = await supabaseAdmin
    .from("tournaments")
    .select("name, date, location_type, description, max_participants, games(name), tournament_prizes(*)")
    .eq("id", tournamentId)
    .single();

  // Fetch user email
  let userEmail = "";
  try {
    const email = await resolveUserEmail(privyUserId);
    userEmail = email ?? "";
  } catch { /* optional */ }

  const userName = profile.nombre ?? "Jugador";
  const googleUrl = tournament?.date
    ? buildGoogleCalendarUrl({
        name:        tournament.name,
        date:        tournament.date,
        location:    tournament.location_type === "online" ? "Online" : "1UP Gaming Tower, Colombia",
        description: `Inscripción confirmada — ${tournament.name}`,
      })
    : "";

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://1upesports.org";

  if (userEmail && tournament) {
    await sendTournamentRegistrationEmail({
      userEmail,
      userName,
      tournamentName:    tournament.name,
      tournamentDate:    tournament.date,
      locationType:      tournament.location_type,
      googleCalendarUrl: googleUrl,
      gameName:          (tournament.games as { name: string } | null)?.name ?? null,
      description:       tournament.description ?? null,
      prizes:            (tournament.tournament_prizes ?? []) as Array<{ position: number; prize_type: string; amount_tokens: number | null; amount_cop: number | null }>,
      tournamentUrl:     `${BASE_URL}/torneos/${tournamentId}`,
      registrantEmail:   userEmail,
      registrantName:    userName,
    });
  }

  revalidatePath("/torneos");
  revalidatePath("/admin/tournament-registrations");

  return NextResponse.json({ ok: true, googleCalendarUrl: googleUrl });
}

export async function DELETE(req: NextRequest) {
  const privyUserId = await getPrivyUserId(req);
  if (!privyUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { tournamentId } = body;
  if (!tournamentId) return NextResponse.json({ error: "tournamentId requerido" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("tournament_registrations")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("privy_user_id", privyUserId)
    .eq("tournament_id", tournamentId)
    .eq("status", "registered");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/torneos");
  return NextResponse.json({ ok: true });
}
