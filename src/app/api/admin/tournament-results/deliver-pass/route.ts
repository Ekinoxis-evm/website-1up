// POST /api/admin/tournament-results/deliver-pass
//
// Issues a 1UP Pass to the winner of a tournament_results row as a *claimable*
// asset (v2.39.0 claim-later model). It does NOT activate the pass — the winner
// taps "Activar" in their app whenever they want, and the duration counts from
// that day. Composes:
//   1) verify the prize for this position has includes_pass + pass_days
//   2) insert a `passes` row in state='issued' (source='tournament_prize')
//   3) link it on tournament_results.pass_id (UNIQUE partial index makes
//      re-clicks idempotent: an empty row-count means a concurrent click won —
//      roll ours back and return 409)
//   4) email the winner that a pass is waiting to be activated (best-effort)
//   5) revalidate
//
// pass_status stays unchanged until the winner activates (an `issued` pass is
// not `active`). Activation lives at POST /api/user/passes/activate.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { sendTournamentPassPrizeEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const adminEmail = await resolveUserEmail(claims.userId);
  if (!await isAdmin(adminEmail)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { resultId } = await req.json() as { resultId: number };
  if (!resultId) return NextResponse.json({ error: "resultId requerido" }, { status: 400 });

  // 1) Fetch the result row + linked tournament + winner profile
  const { data: result, error: resultErr } = await supabaseAdmin
    .from("tournament_results")
    .select(`
      id, tournament_id, user_profile_id, position, pass_id,
      tournaments ( name, slug ),
      user_profiles ( nombre, apellidos, email, wallet_address )
    `)
    .eq("id", resultId)
    .single();

  if (resultErr || !result) return NextResponse.json({ error: "Resultado no encontrado." }, { status: 404 });

  if (result.pass_id) {
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

  // 3) Issue the pass as a claimable asset (not activated)
  const { data: pass, error: passErr } = await supabaseAdmin
    .from("passes")
    .insert({
      owner_user_profile_id: result.user_profile_id,
      owner_wallet_address:  winner.wallet_address ?? null,
      source:                "tournament_prize",
      source_ref:            `${tournament.name} · ${result.position}° lugar`,
      duration_days:         prize.pass_days,
      state:                 "issued",
      issued_by:             adminEmail,
    })
    .select("id")
    .single();

  if (passErr || !pass) {
    return NextResponse.json({ error: passErr?.message ?? "No se pudo emitir el pase." }, { status: 500 });
  }

  // 4) Link the pass on tournament_results. The `.is(pass_id, null)` guard makes
  // this idempotent: a PostgREST UPDATE matching no rows returns error:null, so
  // we inspect the affected-row count — an empty result means a concurrent click
  // already linked a pass, and we roll ours back.
  const { data: linked, error: linkErr } = await supabaseAdmin
    .from("tournament_results")
    .update({ pass_id: pass.id })
    .eq("id", resultId)
    .is("pass_id", null)
    .select("id");

  if (linkErr || !linked || linked.length === 0) {
    // Roll back the orphan. If the delete itself fails, surface it with the id
    // rather than swallowing — a silent orphan would let a re-click issue a 2nd pass.
    const { error: rbErr } = await supabaseAdmin.from("passes").delete().eq("id", pass.id);
    if (rbErr) {
      console.error("deliver-pass: failed to roll back orphaned pass", pass.id, rbErr.message);
      return NextResponse.json({ error: `Conflicto al vincular el pase (pase huérfano ${pass.id} — contacta soporte).` }, { status: 500 });
    }
    return NextResponse.json({ error: "El pase fue entregado simultáneamente por otra acción." }, { status: 409 });
  }

  // 5) Best-effort email — tell the winner a pass is waiting to be activated
  if (winner.email) {
    const fullName = [winner.nombre, winner.apellidos].filter(Boolean).join(" ").trim() || winner.email;
    sendTournamentPassPrizeEmail({
      userEmail:      winner.email,
      userName:       fullName,
      tournamentName: tournament.name,
      position:       result.position,
      durationDays:   prize.pass_days,
    }).catch(() => null);
  }

  revalidatePath(`/admin/torneos/${tournament.slug}/manage`);
  revalidatePath("/app/pass");
  return NextResponse.json({ ok: true, passId: pass.id });
}
