import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { isAddress } from "viem";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

export async function GET(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("pass_config")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const email = await resolveUserEmail(claims.userId);
  if (!await isAdmin(email)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { priceToken, recipientAddress, durationDays, isActive } = body;

  if (priceToken !== undefined && (typeof priceToken !== "number" || priceToken <= 0)) {
    return NextResponse.json({ error: "priceToken debe ser un número positivo." }, { status: 400 });
  }
  if (recipientAddress !== undefined && !isAddress(recipientAddress)) {
    return NextResponse.json({ error: "recipientAddress no es una dirección válida." }, { status: 400 });
  }
  if (durationDays !== undefined && (typeof durationDays !== "number" || durationDays < 1)) {
    return NextResponse.json({ error: "durationDays debe ser al menos 1." }, { status: 400 });
  }

  const update: Record<string, unknown> = { updated_by: email };
  if (priceToken      !== undefined) update.price_token        = priceToken;
  if (recipientAddress !== undefined) update.recipient_address = recipientAddress;
  if (durationDays    !== undefined) update.duration_days      = durationDays;
  if (isActive        !== undefined) update.is_active          = isActive;

  const { data, error } = await supabaseAdmin
    .from("pass_config")
    .update(update)
    .eq("id", 1)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/app/pass");
  revalidatePath("/admin/1pass");

  return NextResponse.json(data);
}
