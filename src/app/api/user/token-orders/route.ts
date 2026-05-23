import { NextRequest, NextResponse } from "next/server";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { supabaseAdmin } from "@/lib/supabase";
import { moveComprobanteToOrder } from "@/lib/blob";
import { revalidatePath } from "next/cache";
import { sendTokenOrderEmails } from "@/lib/email";
import { getVerifiedWallet } from "@/lib/verifiedWallet";

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
    nombre?: string;
    celular?: string;
  };

  const { walletAddress: bodyWallet, copAmount, bankAccountId, comprobantePath } = body;

  const walletLookup = await getVerifiedWallet(user.userId, bodyWallet);
  if (!walletLookup.ok) {
    if (walletLookup.reason === "no_wallet")
      return NextResponse.json({ error: "Tu perfil no tiene wallet asociada. Cierra sesión y vuelve a entrar." }, { status: 400 });
    if (walletLookup.reason === "mismatch")
      return NextResponse.json({ error: "La wallet enviada no coincide con tu wallet verificada." }, { status: 400 });
    return NextResponse.json({ error: "Perfil no encontrado." }, { status: 400 });
  }
  const walletAddress = walletLookup.wallet;

  if (!copAmount || !Number.isInteger(copAmount) || copAmount < 1000 || copAmount % 1000 !== 0)
    return NextResponse.json({ error: "Monto COP inválido (mínimo 1,000, múltiplo de 1,000)" }, { status: 400 });

  if (!bankAccountId)
    return NextResponse.json({ error: "Cuenta bancaria requerida" }, { status: 400 });

  if (!comprobantePath)
    return NextResponse.json({ error: "Comprobante requerido" }, { status: 400 });

  if (!comprobantePath.startsWith("pending/"))
    return NextResponse.json({ error: "Ruta de comprobante inválida" }, { status: 400 });

  const { data: bankAccount } = await supabaseAdmin
    .from("bank_accounts")
    .select("id")
    .eq("id", bankAccountId)
    .eq("is_active", true)
    .single();

  if (!bankAccount)
    return NextResponse.json({ error: "Cuenta no disponible" }, { status: 400 });

  // Ensure profile exists, pull nombre/phone if available
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      { privy_user_id: user.userId, email: user.email ?? null },
      { onConflict: "privy_user_id", ignoreDuplicates: true },
    )
    .select("id, nombre, apellidos, phone_number")
    .single();

  const profileId: number | null = profile?.id ?? (
    await supabaseAdmin
      .from("user_profiles")
      .select("id, nombre, apellidos, phone_number")
      .eq("privy_user_id", user.userId)
      .single()
      .then((r) => r.data?.id ?? null)
  );

  if (!profileId)
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 500 });

  const profileNombre = profile
    ? [profile.nombre, profile.apellidos].filter(Boolean).join(" ").trim() || null
    : null;
  const profileCelular = profile?.phone_number ?? null;

  const tokenAmount = copAmount / 1000;
  const ext = comprobantePath.split(".").pop() || "jpg";

  const { data: order, error: insertError } = await supabaseAdmin
    .from("token_purchase_orders")
    .insert({
      user_profile_id:  profileId,
      privy_user_id:    user.userId,
      email:            user.email ?? "",
      nombre:           profileNombre ?? "",
      celular_contacto: profileCelular ?? "",
      wallet_address:   walletAddress,
      cop_amount:       copAmount,
      token_amount:     tokenAmount,
      exchange_rate_cop: 1000,
      bank_account_id:  bankAccountId,
      comprobante_url:  comprobantePath,
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
    // M-A5.3: pin the pending object to the caller's namespace.
    const finalUrl = await moveComprobanteToOrder(comprobantePath, order.id, ext, user.userId);
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

  if (user.email) {
    const { data: bankAccount } = await supabaseAdmin
      .from("bank_accounts")
      .select("bank_name")
      .eq("id", bankAccountId)
      .single();

    sendTokenOrderEmails({
      userEmail:    user.email,
      userName:     profileNombre ?? user.email,
      orderId:      order.id,
      copAmount:    copAmount,
      tokenAmount:  tokenAmount,
      walletAddress,
      bankName:     bankAccount?.bank_name ?? "—",
    }).catch(() => null);
  }

  return NextResponse.json({ id: order.id }, { status: 201 });
}
