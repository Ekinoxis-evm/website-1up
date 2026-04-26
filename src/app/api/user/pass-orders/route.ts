import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { verifyPassTransfer } from "@/lib/passVerifier";
import { revalidatePath } from "next/cache";

async function getOrCreateProfile(privyUserId: string, email: string | undefined) {
  const { data: existing } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("privy_user_id", privyUserId)
    .single();

  if (existing) return existing;

  const { data: created } = await supabaseAdmin
    .from("user_profiles")
    .insert({ privy_user_id: privyUserId, email: email ?? null })
    .select()
    .single();

  return created;
}

export async function GET(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("privy_user_id", claims.userId)
    .single();

  if (!profile) return NextResponse.json([]);

  const { data, error } = await supabaseAdmin
    .from("pass_orders")
    .select("*")
    .eq("user_profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { txHash, walletAddress } = body as { txHash?: string; walletAddress?: string };

  if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return NextResponse.json({ error: "txHash inválido." }, { status: 400 });
  }
  if (!walletAddress) {
    return NextResponse.json({ error: "walletAddress es requerido." }, { status: 400 });
  }

  // Duplicate tx_hash guard
  const { data: existing } = await supabaseAdmin
    .from("pass_orders")
    .select("id")
    .eq("tx_hash", txHash)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Esta transacción ya fue registrada." }, { status: 409 });
  }

  // Fetch pass config
  const { data: config, error: cfgErr } = await supabaseAdmin
    .from("pass_config")
    .select("*")
    .eq("id", 1)
    .single();

  if (cfgErr || !config) {
    return NextResponse.json({ error: "Configuración del pass no disponible." }, { status: 500 });
  }
  if (!config.is_active) {
    return NextResponse.json({ error: "La venta del 1UP Pass está desactivada temporalmente." }, { status: 400 });
  }

  // Verify on-chain transfer
  const result = await verifyPassTransfer(
    txHash as `0x${string}`,
    walletAddress,
    config.recipient_address,
    config.price_token,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 422 });
  }

  const email = await resolveUserEmail(claims.userId);
  const profile = await getOrCreateProfile(claims.userId, email ?? undefined);

  if (!profile) {
    return NextResponse.json({ error: "No se pudo crear el perfil de usuario." }, { status: 500 });
  }

  // Stacking expiry: if user has an active confirmed pass, extend from its expiry
  const { data: activeOrder } = await supabaseAdmin
    .from("pass_orders")
    .select("expires_at")
    .eq("user_profile_id", profile.id)
    .eq("status", "confirmed")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const baseDate = activeOrder?.expires_at
    ? new Date(activeOrder.expires_at)
    : result.paidAt;

  const expiresAt = new Date(baseDate.getTime() + config.duration_days * 24 * 60 * 60 * 1000);

  const { data: order, error: insertErr } = await supabaseAdmin
    .from("pass_orders")
    .insert({
      user_profile_id:       profile.id,
      privy_user_id:         claims.userId,
      email:                 email ?? null,
      wallet_address:        walletAddress,
      tx_hash:               txHash,
      status:                "confirmed",
      token_price_at_purchase: config.price_token,
      token_amount_paid:     config.price_token,
      recipient_address:     config.recipient_address,
      duration_days:         config.duration_days,
      discount_pct_applied:  0,
      block_number:          Number(result.blockNumber),
      paid_at:               result.paidAt.toISOString(),
      expires_at:            expiresAt.toISOString(),
      last_verified_at:      new Date().toISOString(),
      verification_attempts: 1,
    })
    .select()
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({ error: "Esta transacción ya fue registrada." }, { status: 409 });
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  revalidatePath("/app/pass");
  revalidatePath("/admin/1pass");
  revalidatePath("/admin/pass-orders");

  return NextResponse.json(order, { status: 201 });
}
