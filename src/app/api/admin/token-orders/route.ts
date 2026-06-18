import { NextRequest, NextResponse } from "next/server";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { sendTokenOrderApprovedEmail, sendTokenOrderRejectedEmail } from "@/lib/email";
import { getComprobanteSignedUrl } from "@/lib/blob";
import { verifyTokenTransfer } from "@/lib/tokenTransferVerifier";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

export async function GET(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = new URL(req.url).searchParams.get("status");

  let query = supabaseAdmin
    .from("token_purchase_orders")
    .select("*, user_profiles(nombre, apellidos), bank_accounts(bank_name, account_type, account_number)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) query = query.eq("status", status as "pending" | "approved" | "rejected" | "cancelled");

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

  const body = await req.json() as {
    id?: number;
    action?: "approve" | "reject";
    txHash?: string;
    rejectionReason?: string;
    adminNotes?: string;
    note?: string;
  };

  if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  if (!body.action) return NextResponse.json({ error: "action requerido (approve|reject)" }, { status: 400 });

  const { data: order } = await supabaseAdmin
    .from("token_purchase_orders")
    .select("id, status, email, wallet_address, token_amount, cop_amount, payment_method, bank_account_id, comprobante_url, user_profile_id, user_profiles(nombre, apellidos, email)")
    .eq("id", body.id)
    .single();

  if (!order) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  if (order.status !== "pending") return NextResponse.json({ error: "Solo se pueden gestionar órdenes pendientes" }, { status: 409 });

  // Cash is admin-attested: confirming it records a payment_events row whose
  // CHECK requires a reason. Demand the note up front so we never half-confirm.
  const isCash   = order.payment_method === "cash";
  const cashNote = (body.note ?? body.adminNotes ?? "").trim();
  if (body.action === "approve" && isCash && !cashNote) {
    return NextResponse.json(
      { error: "Indica una nota/motivo para confirmar el pago en efectivo (p. ej. recibido en taquilla)." },
      { status: 400 },
    );
  }

  const profile = Array.isArray(order.user_profiles) ? order.user_profiles[0] : order.user_profiles;
  const userEmail = profile?.email ?? order.email ?? null;
  const userName  = profile
    ? ([profile.nombre, profile.apellidos].filter(Boolean).join(" ").trim() || userEmail || `#${order.id}`)
    : (userEmail ?? `#${order.id}`);

  if (body.action === "approve") {
    if (!body.txHash?.trim())
      return NextResponse.json({ error: "txHash requerido para aprobar" }, { status: 400 });

    const txHash = body.txHash.trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash))
      return NextResponse.json({ error: "txHash inválido" }, { status: 400 });

    // H-3: server-side on-chain verification before flipping the order to
    // approved. The treasury (`pass_config.recipient_address`) is the sender;
    // the user's verified wallet (`order.wallet_address`, derived server-side
    // post C-1) is the recipient; amount must be >= `order.token_amount`; tx
    // must be successful and deep enough to be reorg-safe.
    const { data: passConfig, error: cfgErr } = await supabaseAdmin
      .from("pass_config")
      .select("recipient_address")
      .eq("id", 1)
      .single();

    if (cfgErr || !passConfig?.recipient_address) {
      return NextResponse.json(
        { error: "Treasury wallet no configurada en pass_config." },
        { status: 500 },
      );
    }

    if (!order.wallet_address || !/^0x[0-9a-fA-F]{40}$/.test(order.wallet_address)) {
      return NextResponse.json(
        { error: "La orden no tiene una wallet destino válida." },
        { status: 400 },
      );
    }

    const tokenAmount = Number(order.token_amount);
    if (!Number.isFinite(tokenAmount) || tokenAmount <= 0) {
      return NextResponse.json(
        { error: "Monto de tokens inválido en la orden." },
        { status: 400 },
      );
    }

    const verify = await verifyTokenTransfer(
      txHash as `0x${string}`,
      passConfig.recipient_address,
      order.wallet_address,
      tokenAmount,
    );

    if (!verify.ok) {
      return NextResponse.json(
        { error: `Verificación on-chain falló: ${verify.reason}`, code: verify.code },
        { status: 422 },
      );
    }

    await supabaseAdmin
      .from("token_purchase_orders")
      .update({
        status:           "approved",
        approved_tx_hash: txHash,
        admin_notes:      body.adminNotes?.trim() || null,
        reviewed_by:      adminEmail,
        reviewed_at:      new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      })
      .eq("id", body.id);

    // Record the COP receipt in the unified ledger. The on-chain $1UP send above
    // is the fulfillment; this is the money-in side. cash = admin-attested with
    // the mandatory note; bank = best-effort wire write mirroring courses.
    // Best-effort: the order is already the source of truth, so a ledger hiccup
    // must not fail the approval — but log it. The single-confirmed invariant in
    // the RPC still guards against duplicates.
    const { error: ledgerErr } = await supabaseAdmin.rpc("apply_payment_event", {
      p_order_kind:        "token_purchase",
      p_order_id:          order.id,
      p_method:            isCash ? "cash" : "wire",
      p_amount_cop:        order.cop_amount ?? undefined,
      p_bank_account_id:   isCash ? undefined : (order.bank_account_id ?? undefined),
      p_comprobante_url:   isCash ? undefined : (order.comprobante_url ?? undefined),
      p_recorded_by_admin: adminEmail,
      p_reason:            isCash ? cashNote : "Transferencia aprobada por el equipo",
    });
    if (ledgerErr) console.error("apply_payment_event failed for token order", order.id, ledgerErr.message);

    if (userEmail) {
      sendTokenOrderApprovedEmail({
        userEmail,
        userName,
        orderId:       order.id,
        tokenAmount:   Number(order.token_amount),
        walletAddress: order.wallet_address,
        txHash,
      }).catch(() => null);
    }
  } else {
    if (!body.rejectionReason?.trim())
      return NextResponse.json({ error: "rejectionReason requerido para rechazar" }, { status: 400 });

    const reason = body.rejectionReason.trim();

    await supabaseAdmin
      .from("token_purchase_orders")
      .update({
        status:            "rejected",
        rejection_reason:  reason,
        admin_notes:       body.adminNotes?.trim() || null,
        reviewed_by:       adminEmail,
        reviewed_at:       new Date().toISOString(),
        updated_at:        new Date().toISOString(),
      })
      .eq("id", body.id);

    if (userEmail) {
      sendTokenOrderRejectedEmail({
        userEmail,
        userName,
        orderId:         order.id,
        copAmount:       Number(order.cop_amount),
        rejectionReason: reason,
      }).catch(() => null);
    }
  }

  revalidatePath("/admin/token-orders");
  revalidatePath("/app");
  return NextResponse.json({ ok: true });
}
