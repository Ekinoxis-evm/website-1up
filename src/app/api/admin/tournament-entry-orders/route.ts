import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { getComprobanteSignedUrl } from "@/lib/blob";
import { canReviewEntryOrder } from "@/lib/tournamentEntry";
import { sendTournamentEntryApprovedEmail, sendTournamentEntryRejectedEmail } from "@/lib/email";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

function revalidateEntryPaths() {
  revalidatePath("/torneos");
  revalidatePath("/torneos/[slug]", "page");
  revalidatePath("/admin/torneos/[slug]/manage", "page");
  revalidatePath("/admin/tournament-registrations");
}

export async function GET(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tournamentId = Number(searchParams.get("tournamentId"));
  const status = searchParams.get("status");

  let query = supabaseAdmin
    .from("tournament_entry_orders")
    .select("*, user_profiles(nombre, apellidos, email, username, avatar_url), tournaments(name, slug, entry_fee_tokens, entry_fee_cop)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (Number.isFinite(tournamentId) && tournamentId > 0) query = query.eq("tournament_id", tournamentId);
  if (status) query = query.eq("status", status as "pending_bank" | "confirmed" | "rejected" | "cancelled");

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = await Promise.all((data ?? []).map(async (order) => {
    if (!order.comprobante_url) return order;
    const signedUrl = await getComprobanteSignedUrl(order.comprobante_url);
    return { ...order, comprobante_url: signedUrl };
  }));
  return NextResponse.json(enriched);
}

export async function PATCH(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const adminEmail = await resolveUserEmail(claims.userId);
  if (!await isAdmin(adminEmail)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, action, rejectionReason } = body as {
    id?: number;
    action?: "approve" | "reject";
    rejectionReason?: string;
  };

  if (!id) return NextResponse.json({ error: "id es requerido." }, { status: 400 });
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action debe ser approve o reject." }, { status: 400 });
  }

  const { data: order } = await supabaseAdmin
    .from("tournament_entry_orders")
    .select("*, user_profiles(nombre, email), tournaments(name, slug)")
    .eq("id", id)
    .maybeSingle();

  const gate = canReviewEntryOrder(order);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const now = new Date().toISOString();
  const userEmail      = order!.user_profiles?.email ?? null;
  const userName       = order!.user_profiles?.nombre ?? "Jugador";
  const tournamentName = order!.tournaments?.name ?? "Torneo";
  const BASE_URL       = process.env.NEXT_PUBLIC_BASE_URL ?? "https://1upesports.org";
  const tournamentUrl  = `${BASE_URL}/torneos/${order!.tournaments?.slug ?? order!.tournament_id}`;

  if (action === "reject") {
    const { data, error } = await supabaseAdmin
      .from("tournament_entry_orders")
      .update({
        status:           "rejected",
        rejection_reason: rejectionReason?.trim() || null,
        reviewed_by:      adminEmail,
        reviewed_at:      now,
        updated_at:       now,
      })
      .eq("id", id)
      .eq("status", "pending_bank")
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (userEmail) {
      sendTournamentEntryRejectedEmail({
        userEmail,
        userName,
        tournamentName,
        rejectionReason: rejectionReason?.trim() || "No pudimos validar el comprobante de pago.",
      }).catch(() => null);
    }

    revalidateEntryPaths();
    return NextResponse.json(data);
  }

  // ── Approve: the slot is only taken now, via the same atomic RPC ────
  const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc("register_for_tournament", {
    tour_id:   order!.tournament_id,
    user_pid:  order!.user_profile_id,
    privy_uid: order!.privy_user_id,
  });
  if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 });

  const res = rpcResult as { ok: boolean; reason?: string };
  if (!res.ok) {
    // No refunds in v1 — when the tournament filled (or closed) before this
    // comprobante was approved, the order stays pending and the admin must
    // resolve it manually: reject the order and refund the user off-platform.
    const msgs: Record<string, string> = {
      full:               "El torneo está lleno — no hay cupo para este jugador. La orden queda pendiente: recházala e indica el reembolso manual al usuario.",
      already_registered: "El jugador ya está inscrito en este torneo. Verifica si pagó dos veces — la orden queda pendiente para que la rechaces con motivo.",
      closed:             "El registro del torneo está cerrado. La orden queda pendiente: recházala y gestiona el reembolso manual.",
      not_active:         "El torneo ya no acepta inscripciones. La orden queda pendiente: recházala y gestiona el reembolso manual.",
      not_found:          "Torneo no encontrado.",
    };
    return NextResponse.json(
      { error: msgs[res.reason ?? ""] ?? "No se pudo inscribir al jugador. Gestiona el caso manualmente.", reason: res.reason, manualRefund: true },
      { status: 409 },
    );
  }

  const { data: registration } = await supabaseAdmin
    .from("tournament_registrations")
    .select("id")
    .eq("tournament_id", order!.tournament_id)
    .eq("user_profile_id", order!.user_profile_id)
    .eq("status", "registered")
    .maybeSingle();

  const { data, error } = await supabaseAdmin
    .from("tournament_entry_orders")
    .update({
      status:          "confirmed",
      registration_id: registration?.id ?? null,
      reviewed_by:     adminEmail,
      reviewed_at:     now,
      updated_at:      now,
    })
    .eq("id", id)
    .eq("status", "pending_bank")
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (userEmail) {
    sendTournamentEntryApprovedEmail({
      userEmail,
      userName,
      tournamentName,
      tournamentUrl,
    }).catch(() => null);
  }

  revalidateEntryPaths();
  return NextResponse.json(data);
}
