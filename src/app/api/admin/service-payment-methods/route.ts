import { NextRequest, NextResponse } from "next/server";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { isOrderKind } from "@/lib/payments/orderKind";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

export async function GET(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("service_payment_methods")
    .select("*")
    .order("service");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const email = await resolveUserEmail(claims.userId);
  if (!await isAdmin(email)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    service?: string;
    tokenEnabled?: boolean;
    wireEnabled?: boolean;
    cashEnabled?: boolean;
    cardEnabled?: boolean;
  };

  if (!isOrderKind(body.service))
    return NextResponse.json({ error: "service inválido" }, { status: 400 });

  if (
    typeof body.tokenEnabled !== "boolean" ||
    typeof body.wireEnabled !== "boolean" ||
    typeof body.cashEnabled !== "boolean" ||
    typeof body.cardEnabled !== "boolean"
  )
    return NextResponse.json({ error: "Los cuatro métodos son requeridos" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("service_payment_methods")
    .update({
      token_enabled: body.tokenEnabled,
      wire_enabled:  body.wireEnabled,
      cash_enabled:  body.cashEnabled,
      card_enabled:  body.cardEnabled,
      updated_by:    email ?? null,
      updated_at:    new Date().toISOString(),
    })
    .eq("service", body.service)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/admin/payment-methods");
  return NextResponse.json(data);
}
