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

async function lookupWallet(userProfileId: number): Promise<string | null> {
  const { data: pass } = await supabaseAdmin
    .from("pass_orders")
    .select("wallet_address")
    .eq("user_profile_id", userProfileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pass?.wallet_address) return pass.wallet_address;

  const { data: token } = await supabaseAdmin
    .from("token_purchase_orders")
    .select("wallet_address")
    .eq("user_profile_id", userProfileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return token?.wallet_address ?? null;
}

export async function GET(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const tournamentId = searchParams.get("tournamentId");
  const walletFor    = searchParams.get("walletFor");

  if (walletFor) {
    const wallet = await lookupWallet(parseInt(walletFor));
    return NextResponse.json({ wallet });
  }

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

  const { data: existingPrize } = await supabaseAdmin
    .from("tournament_prizes")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("position", position)
    .maybeSingle();
  const prizeStatus: "pending" | "no_prize" = existingPrize ? "pending" : "no_prize";

  const { data, error } = await supabaseAdmin
    .from("tournament_results")
    .upsert({
      tournament_id:   tournamentId,
      user_profile_id: userProfileId,
      position,
      points,
      awarded_by:      adminEmail ?? undefined,
      prize_status:    prizeStatus,
    }, { onConflict: "tournament_id,position" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/torneos");
  revalidatePath("/team");
  revalidatePath("/admin/tournament-results");
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const claims = await verifyToken(req.headers.get("authorization"));
  const adminEmail = claims ? await resolveUserEmail(claims.userId) : null;

  const body = await req.json();
  const { id, prizeStatus, prizeTxHash, prizeComprobanteUrl } = body;
  if (!id || !prizeStatus)
    return NextResponse.json({ error: "id y prizeStatus son requeridos" }, { status: 400 });

  if (prizeStatus === "sent" && !prizeTxHash && !prizeComprobanteUrl)
    return NextResponse.json({ error: "Para marcar como entregado se requiere tx_hash o comprobante" }, { status: 400 });

  const update: Record<string, unknown> = { prize_status: prizeStatus };
  if (prizeStatus === "sent") {
    update.prize_sent_at = new Date().toISOString();
    update.prize_sent_by = adminEmail ?? null;
    if (prizeTxHash)         update.prize_tx_hash         = prizeTxHash;
    if (prizeComprobanteUrl) update.prize_comprobante_url = prizeComprobanteUrl;
  } else {
    update.prize_sent_at         = null;
    update.prize_sent_by         = null;
    update.prize_tx_hash         = null;
    update.prize_comprobante_url = null;
  }

  const { data, error } = await supabaseAdmin
    .from("tournament_results")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/torneos");
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
