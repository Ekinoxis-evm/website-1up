import { NextRequest, NextResponse } from "next/server";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

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
  return NextResponse.json(data ?? []);
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
  };

  if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  if (!body.action) return NextResponse.json({ error: "action requerido (approve|reject)" }, { status: 400 });

  const { data: order } = await supabaseAdmin
    .from("token_purchase_orders")
    .select("id, status")
    .eq("id", body.id)
    .single();

  if (!order) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  if (order.status !== "pending") return NextResponse.json({ error: "Solo se pueden gestionar órdenes pendientes" }, { status: 409 });

  if (body.action === "approve") {
    if (!body.txHash?.trim())
      return NextResponse.json({ error: "txHash requerido para aprobar" }, { status: 400 });

    await supabaseAdmin
      .from("token_purchase_orders")
      .update({
        status:           "approved",
        approved_tx_hash: body.txHash.trim(),
        admin_notes:      body.adminNotes?.trim() || null,
        reviewed_by:      adminEmail,
        reviewed_at:      new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      })
      .eq("id", body.id);
  } else {
    if (!body.rejectionReason?.trim())
      return NextResponse.json({ error: "rejectionReason requerido para rechazar" }, { status: 400 });

    await supabaseAdmin
      .from("token_purchase_orders")
      .update({
        status:            "rejected",
        rejection_reason:  body.rejectionReason.trim(),
        admin_notes:       body.adminNotes?.trim() || null,
        reviewed_by:       adminEmail,
        reviewed_at:       new Date().toISOString(),
        updated_at:        new Date().toISOString(),
      })
      .eq("id", body.id);
  }

  revalidatePath("/admin/token-orders");
  revalidatePath("/app");
  return NextResponse.json({ ok: true });
}
