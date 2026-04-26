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

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    bankName?: string; accountType?: string; accountNumber?: string;
    holderName?: string; holderDocument?: string; instructions?: string;
    isActive?: boolean; sortOrder?: number;
  };

  if (!body.bankName?.trim() || !body.accountNumber?.trim() || !body.holderName?.trim())
    return NextResponse.json({ error: "bankName, accountNumber y holderName son requeridos" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("bank_accounts")
    .insert({
      bank_name:       body.bankName.trim(),
      account_type:    (body.accountType ?? "ahorros") as "ahorros" | "corriente",
      account_number:  body.accountNumber.trim(),
      holder_name:     body.holderName.trim(),
      holder_document: body.holderDocument?.trim() || null,
      instructions:    body.instructions?.trim() || null,
      is_active:       body.isActive ?? true,
      sort_order:      body.sortOrder ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/admin/bank-accounts");
  revalidatePath("/app");
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    id?: number; bankName?: string; accountType?: string; accountNumber?: string;
    holderName?: string; holderDocument?: string; instructions?: string;
    isActive?: boolean; sortOrder?: number;
  };

  if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("bank_accounts")
    .update({
      bank_name:       body.bankName?.trim(),
      account_type:    body.accountType as "ahorros" | "corriente" | undefined,
      account_number:  body.accountNumber?.trim(),
      holder_name:     body.holderName?.trim(),
      holder_document: body.holderDocument?.trim() || null,
      instructions:    body.instructions?.trim() || null,
      is_active:       body.isActive,
      sort_order:      body.sortOrder,
      updated_at:      new Date().toISOString(),
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/admin/bank-accounts");
  revalidatePath("/app");
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json() as { id?: number };
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const { error } = await supabaseAdmin.from("bank_accounts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/admin/bank-accounts");
  revalidatePath("/app");
  return NextResponse.json({ ok: true });
}
