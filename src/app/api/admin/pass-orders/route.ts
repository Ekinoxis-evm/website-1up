import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { sendPassBankApprovedEmail, sendPassBankRejectedEmail } from "@/lib/email";
import { getComprobanteSignedUrl } from "@/lib/blob";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

export async function POST(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const adminEmail = await resolveUserEmail(claims.userId);
  if (!await isAdmin(adminEmail)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    userProfileId: number;
    privyUserId: string;
    walletAddress: string;
    startedAt: string;
    durationDays: number;
    adminNotes?: string;
  };

  const { userProfileId, privyUserId, walletAddress, startedAt, durationDays, adminNotes } = body;
  if (!userProfileId || !privyUserId || !walletAddress || !startedAt || !durationDays) {
    return NextResponse.json({ error: "Faltan campos requeridos." }, { status: 400 });
  }

  const { data: config } = await supabaseAdmin
    .from("pass_config")
    .select("recipient_address, price_token")
    .eq("id", 1)
    .single();

  const startDate = new Date(startedAt);
  const expiresAt = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const now = new Date();

  const { data, error } = await supabaseAdmin
    .from("pass_orders")
    .insert({
      user_profile_id:        userProfileId,
      privy_user_id:          privyUserId,
      wallet_address:         walletAddress,
      recipient_address:      config?.recipient_address ?? "",
      payment_method:         "admin_grant",
      token_amount_paid:      0,
      token_price_at_purchase: config?.price_token ?? 0,
      duration_days:          durationDays,
      status:                 "confirmed",
      started_at:             startDate.toISOString(),
      paid_at:                now.toISOString(),
      expires_at:             expiresAt.toISOString(),
      granted_by:             adminEmail,
      reviewed_by:            adminEmail,
      reviewed_at:            now.toISOString(),
      admin_notes:            adminNotes?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/admin/pass-orders");
  revalidatePath("/app/pass");
  return NextResponse.json(data);
}

export async function GET(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = supabaseAdmin
    .from("pass_orders")
    .select("*, user_profiles(nombre, apellidos, email, username)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) {
    query = query.eq("status", status as "pending_tx" | "confirmed" | "failed" | "expired_unverified");
  }

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
  const email = await resolveUserEmail(claims.userId);
  if (!await isAdmin(email)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, adminNotes, action, rejectionReason } =
    body as { id?: number; adminNotes?: string; action?: "approve" | "reject"; rejectionReason?: string };

  if (!id) return NextResponse.json({ error: "id es requerido." }, { status: 400 });

  // approve or reject bank pass orders
  if (action === "approve" || action === "reject") {
    const { data: order, error: fetchErr } = await supabaseAdmin
      .from("pass_orders")
      .select("*, user_profiles(nombre, apellidos, email)")
      .eq("id", id)
      .eq("payment_method", "bank")
      .eq("status", "pending_bank")
      .single();

    if (fetchErr || !order) return NextResponse.json({ error: "Orden no encontrada o ya procesada." }, { status: 404 });

    const profile = Array.isArray(order.user_profiles) ? order.user_profiles[0] : order.user_profiles;
    const userEmail = profile?.email ?? order.email ?? null;
    const userName  = profile
      ? ([profile.nombre, profile.apellidos].filter(Boolean).join(" ").trim() || userEmail || `#${order.id}`)
      : (userEmail ?? `#${order.id}`);

    if (action === "reject") {
      const reason = rejectionReason?.trim() ?? "";
      const { data, error } = await supabaseAdmin
        .from("pass_orders")
        .update({
          status:           "failed",
          rejection_reason: reason || null,
          admin_notes:      adminNotes ?? null,
          reviewed_by:      email,
          reviewed_at:      new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      if (userEmail) {
        sendPassBankRejectedEmail({
          userEmail,
          userName,
          orderId:         order.id,
          rejectionReason: reason || "Sin motivo especificado.",
        }).catch(() => null);
      }

      revalidatePath("/admin/pass-bank-orders");
      revalidatePath("/app/pass");
      return NextResponse.json(data);
    }

    // approve: calculate expiry stacking from any active pass
    const { data: activeOrder } = await supabaseAdmin
      .from("pass_orders")
      .select("expires_at")
      .eq("user_profile_id", order.user_profile_id)
      .eq("status", "confirmed")
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date();
    const startedAt = now;
    const baseDate = activeOrder?.expires_at ? new Date(activeOrder.expires_at) : now;
    const expiresAt = new Date(baseDate.getTime() + order.duration_days * 24 * 60 * 60 * 1000);

    const { data, error } = await supabaseAdmin
      .from("pass_orders")
      .update({
        status:      "confirmed",
        paid_at:     now.toISOString(),
        started_at:  startedAt.toISOString(),
        expires_at:  expiresAt.toISOString(),
        admin_notes: adminNotes ?? null,
        reviewed_by: email,
        reviewed_at: now.toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (userEmail) {
      sendPassBankApprovedEmail({
        userEmail,
        userName,
        orderId:      order.id,
        tokenAmount:  Number(order.token_amount_paid),
        durationDays: order.duration_days,
        expiresAt:    expiresAt.toISOString(),
      }).catch(() => null);
    }

    revalidatePath("/admin/pass-bank-orders");
    revalidatePath("/app/pass");
    return NextResponse.json(data);
  }

  // default: just update admin notes on any pass order
  const { data, error } = await supabaseAdmin
    .from("pass_orders")
    .update({
      admin_notes: adminNotes ?? null,
      reviewed_by: email,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/admin/pass-orders");
  return NextResponse.json(data);
}
