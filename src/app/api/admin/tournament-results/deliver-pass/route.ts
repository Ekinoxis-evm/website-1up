// POST /api/admin/tournament-results/deliver-pass
//
// Grants a 1UP Pass to the winner of a tournament_results row, in one atomic
// click. Composes:
//   1) verify the prize for this position has includes_pass = true + pass_days
//   2) compute started_at — stack on top of any currently-active pass, else now
//   3) insert pass_orders row with payment_method='admin_grant', token_amount_paid=0
//   4) link the new order id back on tournament_results.pass_order_id (UNIQUE
//      partial index makes re-clicks idempotent: second attempt fails the link
//      step and we surface that to the operator)
//   5) fire the winner email (best-effort, don't fail the action on email)
//   6) revalidate
//
// The trg_sync_pass_status trigger picks up the INSERT and flips
// user_profiles.pass_status to 'active' automatically — same path as
// manual admin grants. See /api/admin/pass-orders POST for the canonical
// admin_grant insert shape.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { sendTournamentPassPrizeEmail } from "@/lib/email";
import { isValidPassOrderAmount } from "@/lib/passOrders";
import { computePassWindow } from "@/lib/passWindow";

export async function POST(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const adminEmail = await resolveUserEmail(claims.userId);
  if (!await isAdmin(adminEmail)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { resultId } = await req.json() as { resultId: number };
  if (!resultId) return NextResponse.json({ error: "resultId requerido" }, { status: 400 });

  // 1) Fetch the result row + linked tournament + winner profile + pass_config
  const { data: result, error: resultErr } = await supabaseAdmin
    .from("tournament_results")
    .select(`
      id, tournament_id, user_profile_id, position, pass_order_id,
      tournaments ( name, slug ),
      user_profiles ( nombre, apellidos, email, privy_user_id, wallet_address )
    `)
    .eq("id", resultId)
    .single();

  if (resultErr || !result) return NextResponse.json({ error: "Resultado no encontrado." }, { status: 404 });

  if (result.pass_order_id) {
    return NextResponse.json({ error: "El pase ya fue entregado para esta posición." }, { status: 409 });
  }

  const tournament = Array.isArray(result.tournaments) ? result.tournaments[0] : result.tournaments;
  const winner     = Array.isArray(result.user_profiles) ? result.user_profiles[0] : result.user_profiles;
  if (!tournament || !winner) {
    return NextResponse.json({ error: "Datos del torneo o del ganador incompletos." }, { status: 400 });
  }

  // 2) Fetch the configured prize for this position
  const { data: prize } = await supabaseAdmin
    .from("tournament_prizes")
    .select("includes_pass, pass_days")
    .eq("tournament_id", result.tournament_id)
    .eq("position", result.position)
    .maybeSingle();

  if (!prize?.includes_pass || !prize.pass_days || prize.pass_days <= 0) {
    return NextResponse.json({ error: "Esta posición no tiene un Pase 1UP configurado como premio." }, { status: 400 });
  }

  // 3) Compute started_at — stack onto any existing active pass for the same user
  const nowIso = new Date().toISOString();
  const { data: activePass } = await supabaseAdmin
    .from("pass_orders")
    .select("expires_at")
    .eq("user_profile_id", result.user_profile_id)
    .eq("status", "confirmed")
    .gt("expires_at", nowIso)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { startedAt: startBase, expiresAt } = computePassWindow({
    activeExpiresAt: activePass?.expires_at,
    durationDays: prize.pass_days,
  });

  // 4) Read pass_config for recipient_address (treasury wallet)
  const { data: config } = await supabaseAdmin
    .from("pass_config")
    .select("recipient_address, price_token")
    .eq("id", 1)
    .maybeSingle();

  // 5) Sanity-check the predicate that protects the DB CHECK (defense in depth)
  if (!isValidPassOrderAmount("admin_grant", 0)) {
    return NextResponse.json({ error: "Predicate invariant violated." }, { status: 500 });
  }

  // 6) Create the pass_order
  const { data: passOrder, error: passErr } = await supabaseAdmin
    .from("pass_orders")
    .insert({
      user_profile_id:         result.user_profile_id,
      privy_user_id:           winner.privy_user_id,
      email:                   winner.email ?? null,
      wallet_address:          winner.wallet_address ?? "",
      recipient_address:       config?.recipient_address ?? "",
      payment_method:          "admin_grant",
      token_amount_paid:       0,
      token_price_at_purchase: config?.price_token ?? 0,
      duration_days:           prize.pass_days,
      status:                  "confirmed",
      started_at:              startBase.toISOString(),
      paid_at:                 nowIso,
      expires_at:              expiresAt.toISOString(),
      granted_by:              adminEmail,
      reviewed_by:             adminEmail,
      reviewed_at:             nowIso,
      admin_notes:             `Premio torneo: ${tournament.name} · ${result.position}° lugar`,
    })
    .select()
    .single();

  if (passErr || !passOrder) {
    return NextResponse.json({ error: passErr?.message ?? "No se pudo crear la orden del pase." }, { status: 500 });
  }

  // 7) Link the order back on tournament_results. The `.is(pass_order_id, null)`
  // guard makes this idempotent: a PostgREST UPDATE that matches no rows is NOT
  // an error, so we must inspect the affected-row count — an empty result means
  // a concurrent click already linked an order, and we roll ours back.
  const { data: linked, error: linkErr } = await supabaseAdmin
    .from("tournament_results")
    .update({ pass_order_id: passOrder.id })
    .eq("id", resultId)
    .is("pass_order_id", null)
    .select("id");

  if (linkErr || !linked || linked.length === 0) {
    await supabaseAdmin.from("pass_orders").delete().eq("id", passOrder.id);
    return NextResponse.json({ error: "El pase fue entregado simultáneamente por otra acción." }, { status: 409 });
  }

  // 8) Best-effort email — don't fail the request if it bounces
  if (winner.email) {
    const fullName = [winner.nombre, winner.apellidos].filter(Boolean).join(" ").trim() || winner.email;
    sendTournamentPassPrizeEmail({
      userEmail:      winner.email,
      userName:       fullName,
      tournamentName: tournament.name,
      position:       result.position,
      durationDays:   prize.pass_days,
      expiresAt:      expiresAt.toISOString(),
    }).catch(() => null);
  }

  revalidatePath(`/admin/torneos/${tournament.slug}/manage`);
  revalidatePath("/admin/pass-orders");
  revalidatePath("/app/pass");
  return NextResponse.json({ ok: true, passOrderId: passOrder.id, expiresAt: expiresAt.toISOString() });
}
