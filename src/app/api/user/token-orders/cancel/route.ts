import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/privy";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json() as { id?: number };
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("privy_user_id", claims.userId)
    .single();

  if (!profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

  const { data: order } = await supabaseAdmin
    .from("token_purchase_orders")
    .select("id, status")
    .eq("id", id)
    .eq("user_profile_id", profile.id)
    .single();

  if (!order) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  if (order.status !== "pending") return NextResponse.json({ error: "Solo se pueden cancelar órdenes pendientes" }, { status: 409 });

  await supabaseAdmin
    .from("token_purchase_orders")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/admin/token-orders");
  revalidatePath("/app");

  return NextResponse.json({ ok: true });
}
