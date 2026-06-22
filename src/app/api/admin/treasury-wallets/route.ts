import { NextRequest, NextResponse } from "next/server";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { isValidTreasuryAddress } from "@/lib/tournamentEntry";
import { revalidatePath } from "next/cache";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

export async function GET(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("treasury_wallets")
    .select("*")
    .order("sort_order")
    .order("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    label?: string; address?: string; chainId?: number;
    isActive?: boolean; sortOrder?: number;
  };

  if (!body.label?.trim())
    return NextResponse.json({ error: "El nombre (label) es requerido" }, { status: 400 });
  // Strip any non-printable-ASCII chars a paste may carry (an EVM address is pure ASCII).
  const address = (body.address ?? "").replace(/[^\x21-\x7E]/g, "");
  if (!isValidTreasuryAddress(address))
    return NextResponse.json({ error: "La dirección debe ser una wallet EVM válida (0x seguido de 40 caracteres)" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("treasury_wallets")
    .insert({
      label:      body.label.trim(),
      address,
      chain_id:   body.chainId ?? 8453,
      is_active:  body.isActive ?? true,
      sort_order: body.sortOrder ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/admin/bank-accounts");
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    id?: number; label?: string; address?: string; chainId?: number;
    isActive?: boolean; sortOrder?: number;
  };

  if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  if (body.label !== undefined && !body.label.trim())
    return NextResponse.json({ error: "El nombre (label) es requerido" }, { status: 400 });
  const address = body.address !== undefined ? body.address.replace(/[^\x21-\x7E]/g, "") : undefined;
  if (address !== undefined && !isValidTreasuryAddress(address))
    return NextResponse.json({ error: "La dirección debe ser una wallet EVM válida (0x seguido de 40 caracteres)" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("treasury_wallets")
    .update({
      label:      body.label?.trim(),
      address,
      chain_id:   body.chainId,
      is_active:  body.isActive,
      sort_order: body.sortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/admin/bank-accounts");
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json() as { id?: number };
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const { error } = await supabaseAdmin.from("treasury_wallets").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/admin/bank-accounts");
  return NextResponse.json({ ok: true });
}
