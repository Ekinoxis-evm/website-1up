import { NextRequest, NextResponse } from "next/server";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { supabaseAdmin } from "@/lib/supabase";
import { moveComprobanteToOrder } from "@/lib/blob";
import { isAddress } from "viem";
import { revalidatePath } from "next/cache";

async function getPrivyUser(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return null;
  const email = await resolveUserEmail(claims.userId);
  return { userId: claims.userId, email };
}

export async function GET(req: NextRequest) {
  const user = await getPrivyUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("privy_user_id", user.userId)
    .single();

  if (!profile) return NextResponse.json([]);

  const { data, error } = await supabaseAdmin
    .from("token_purchase_orders")
    .select("*, bank_accounts(bank_name, account_type, account_number)")
    .eq("user_profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const user = await getPrivyUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    walletAddress?: string;
    copAmount?: number;
    bankAccountId?: number;
    comprobantePath?: string;
    comprobanteUrl?: string;
    nombre?: string;
    celular?: string;
  };

  const { walletAddress, copAmount, bankAccountId, comprobantePath, comprobanteUrl, nombre, celular } = body;

  if (!walletAddress || !isAddress(walletAddress))
    return NextResponse.json({ error: "Wallet inválida" }, { status: 400 });

  if (!copAmount || !Number.isInteger(copAmount) || copAmount < 1000 || copAmount % 1000 !== 0)
    return NextResponse.json({ error: "Monto COP inválido (mínimo 1,000, múltiplo de 1,000)" }, { status: 400 });

  if (!bankAccountId)
    return NextResponse.json({ error: "Cuenta bancaria requerida" }, { status: 400 });

  if (!comprobantePath || !comprobanteUrl)
    return NextResponse.json({ error: "Comprobante requerido" }, { status: 400 });

  if (!nombre?.trim())
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  if (!celular?.trim())
    return NextResponse.json({ error: "Celular requerido" }, { status: 400 });

  const { data: bankAccount } = await supabaseAdmin
    .from("bank_accounts")
    .select("id")
    .eq("id", bankAccountId)
    .eq("is_active", true)
    .single();

  if (!bankAccount)
    return NextResponse.json({ error: "Cuenta no disponible" }, { status: 400 });

  // Ensure profile exists
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      { privy_user_id: user.userId, email: user.email ?? null },
      { onConflict: "privy_user_id", ignoreDuplicates: true },
    )
    .select("id")
    .single();

  const profileId: number | null = profile?.id ?? (
    await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .eq("privy_user_id", user.userId)
      .single()
      .then((r) => r.data?.id ?? null)
  );

  if (!profileId)
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 500 });

  const tokenAmount = copAmount / 1000;
  const ext = comprobantePath.split(".").pop() || "jpg";

  const { data: order, error: insertError } = await supabaseAdmin
    .from("token_purchase_orders")
    .insert({
      user_profile_id:  profileId,
      privy_user_id:    user.userId,
      email:            user.email ?? "",
      nombre:           nombre.trim(),
      celular_contacto: celular.trim(),
      wallet_address:   walletAddress.toLowerCase(),
      cop_amount:       copAmount,
      token_amount:     tokenAmount,
      exchange_rate_cop: 1000,
      bank_account_id:  bankAccountId,
      comprobante_url:  comprobanteUrl,
      status:           "pending",
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505")
      return NextResponse.json({ error: "Ya tienes una orden pendiente." }, { status: 409 });
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Move comprobante from pending/ to final path
  try {
    const finalUrl = await moveComprobanteToOrder(comprobantePath, order.id, ext);
    await supabaseAdmin
      .from("token_purchase_orders")
      .update({ comprobante_url: finalUrl })
      .eq("id", order.id);
  } catch {
    await supabaseAdmin
      .from("token_purchase_orders")
      .update({ status: "cancelled" })
      .eq("id", order.id);
    return NextResponse.json({ error: "Error al guardar el comprobante. Intenta de nuevo." }, { status: 502 });
  }

  revalidatePath("/admin/token-orders");
  revalidatePath("/app");

  return NextResponse.json({ id: order.id }, { status: 201 });
}
