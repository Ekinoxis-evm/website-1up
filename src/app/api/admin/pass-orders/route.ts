import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
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
  return NextResponse.json(data ?? []);
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
      .select("*")
      .eq("id", id)
      .eq("payment_method", "bank")
      .eq("status", "pending_bank")
      .single();

    if (fetchErr || !order) return NextResponse.json({ error: "Orden no encontrada o ya procesada." }, { status: 404 });

    if (action === "reject") {
      const { data, error } = await supabaseAdmin
        .from("pass_orders")
        .update({
          status:           "failed",
          rejection_reason: rejectionReason ?? null,
          admin_notes:      adminNotes ?? null,
          reviewed_by:      email,
          reviewed_at:      new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      revalidatePath("/admin/pass-bank-orders");
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

    const baseDate = activeOrder?.expires_at ? new Date(activeOrder.expires_at) : new Date();
    const expiresAt = new Date(baseDate.getTime() + order.duration_days * 24 * 60 * 60 * 1000);

    const { data, error } = await supabaseAdmin
      .from("pass_orders")
      .update({
        status:      "confirmed",
        paid_at:     new Date().toISOString(),
        expires_at:  expiresAt.toISOString(),
        admin_notes: adminNotes ?? null,
        reviewed_by: email,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
