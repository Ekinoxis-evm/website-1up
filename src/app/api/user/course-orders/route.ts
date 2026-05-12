/**
 * /api/user/course-orders — POST
 *
 * Course enrollment via $1UP token or bank transfer.
 * Token path: on-chain verification, auto-confirmed.
 * Bank path: upload comprobante, pending admin review.
 *
 * Body — token: { courseId, paymentMethod: "token", txHash, walletAddress }
 * Body — bank:  { courseId, paymentMethod: "bank",  bankAccountId, comprobantePath, comprobanteUrl }
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { verifyPassTransfer } from "@/lib/passVerifier";
import { moveComprobanteToOrder } from "@/lib/blob";
import { revalidatePath } from "next/cache";
import { sendCourseOrderPlacedEmail, sendCourseOrderConfirmedEmail } from "@/lib/email";

async function getOrCreateProfile(privyUserId: string, email: string | undefined) {
  const { data: existing } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("privy_user_id", privyUserId)
    .single();

  if (existing) return existing;

  const { data: created } = await supabaseAdmin
    .from("user_profiles")
    .insert({ privy_user_id: privyUserId, email: email ?? null })
    .select()
    .single();

  return created;
}

function selectBestDiscount(
  rules: Array<{ id: number; discount_pct: number; trigger_type: string }>,
  isComfenalcoAffiliate: boolean,
): { ruleId: number | null; discountPct: number } {
  let best = { ruleId: null as number | null, discountPct: 0 };
  for (const rule of rules) {
    if (rule.trigger_type === "comfenalco" && !isComfenalcoAffiliate) continue;
    if (rule.discount_pct > best.discountPct) {
      best = { ruleId: rule.id, discountPct: rule.discount_pct };
    }
  }
  return best;
}

export async function POST(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const email = await resolveUserEmail(claims.userId);

  const body = await req.json() as {
    courseId?:        number;
    paymentMethod?:   "token" | "bank";
    txHash?:          string;
    walletAddress?:   string;
    bankAccountId?:   number;
    comprobantePath?: string;
  };

  const { courseId, paymentMethod } = body;

  if (!courseId || typeof courseId !== "number")
    return NextResponse.json({ error: "courseId requerido" }, { status: 400 });

  if (paymentMethod !== "token" && paymentMethod !== "bank")
    return NextResponse.json({ error: "paymentMethod debe ser token o bank" }, { status: 400 });

  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("id, name, price_cop, price_token, is_active")
    .eq("id", courseId)
    .single();

  if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  if (!course.is_active) return NextResponse.json({ error: "Curso no disponible" }, { status: 410 });
  if (!course.price_cop) return NextResponse.json({ error: "Curso sin precio configurado" }, { status: 400 });

  const profile = await getOrCreateProfile(claims.userId, email ?? undefined);
  if (!profile?.id)
    return NextResponse.json({ error: "No se pudo obtener el perfil del usuario" }, { status: 500 });

  const isComfenalcoAffiliate = profile.comfenalco_afiliado === true;

  const now = new Date().toISOString();
  const { data: rules } = await supabaseAdmin
    .from("discount_rules")
    .select("id, discount_pct, trigger_type")
    .eq("is_active", true)
    .or(`applies_to.eq.courses,applies_to.eq.all`)
    .or(`valid_from.is.null,valid_from.lte.${now}`)
    .or(`valid_until.is.null,valid_until.gte.${now}`);

  const { ruleId, discountPct } = selectBestDiscount(rules ?? [], isComfenalcoAffiliate);
  const originalPrice = course.price_cop;
  const finalPrice    = Math.round(originalPrice * (1 - discountPct / 100));

  const displayName = ([profile.nombre, profile.apellidos].filter(Boolean).join(" ").trim() || email || `#${profile.id}`);

  // ── TOKEN PATH ────────────────────────────────────────────────
  if (paymentMethod === "token") {
    if (!course.price_token)
      return NextResponse.json({ error: "Este curso no acepta pagos con $1UP" }, { status: 400 });

    const { txHash, walletAddress } = body;

    if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash))
      return NextResponse.json({ error: "txHash inválido" }, { status: 400 });
    if (!walletAddress)
      return NextResponse.json({ error: "walletAddress es requerido" }, { status: 400 });

    const { data: existing } = await supabaseAdmin
      .from("enrollments")
      .select("id")
      .eq("tx_hash", txHash)
      .maybeSingle();

    if (existing)
      return NextResponse.json({ error: "Esta transacción ya fue registrada." }, { status: 409 });

    const { data: config } = await supabaseAdmin.from("pass_config").select("*").eq("id", 1).single();
    if (!config?.recipient_address)
      return NextResponse.json({ error: "Wallet de recepción no configurada." }, { status: 500 });

    const result = await verifyPassTransfer(
      txHash as `0x${string}`,
      walletAddress,
      config.recipient_address,
      course.price_token,
    );

    if (!result.ok)
      return NextResponse.json({ error: result.reason }, { status: 422 });

    const { data: enrollment, error: insertErr } = await supabaseAdmin
      .from("enrollments")
      .insert({
        user_profile_id:      profile.id,
        product_type:         "course",
        course_id:            courseId,
        original_price_cop:   originalPrice,
        discount_rule_id:     ruleId,
        discount_pct_applied: discountPct,
        final_price_cop:      finalPrice,
        payment_method:       "token",
        payment_status:       "approved",
        tx_hash:              txHash,
        paid_at:              result.paidAt.toISOString(),
      })
      .select()
      .single();

    if (insertErr || !enrollment)
      return NextResponse.json({ error: insertErr?.message ?? "Error creando inscripción" }, { status: 500 });

    revalidatePath("/academia");
    revalidatePath("/admin/enrollments");
    revalidatePath("/app/academia");

    if (email) {
      sendCourseOrderConfirmedEmail({
        userEmail:    email,
        userName:     displayName,
        enrollmentId: enrollment.id,
        courseName:   course.name,
        tokenAmount:  course.price_token,
        txHash,
      }).catch(() => null);
    }

    return NextResponse.json({
      enrollmentId:  enrollment.id,
      status:        "approved",
      paymentMethod: "token",
      txHash,
    }, { status: 201 });
  }

  // ── BANK PATH ─────────────────────────────────────────────────
  const { bankAccountId, comprobantePath } = body;

  if (!bankAccountId)
    return NextResponse.json({ error: "Cuenta bancaria requerida" }, { status: 400 });
  if (!comprobantePath)
    return NextResponse.json({ error: "Comprobante requerido" }, { status: 400 });
  if (!comprobantePath.startsWith("pending/"))
    return NextResponse.json({ error: "Ruta de comprobante inválida" }, { status: 400 });

  const { data: bankAccount } = await supabaseAdmin
    .from("bank_accounts")
    .select("id, bank_name")
    .eq("id", bankAccountId)
    .eq("is_active", true)
    .single();

  if (!bankAccount)
    return NextResponse.json({ error: "Cuenta no disponible" }, { status: 400 });

  const { data: enrollment, error: insertErr } = await supabaseAdmin
    .from("enrollments")
    .insert({
      user_profile_id:      profile.id,
      product_type:         "course",
      course_id:            courseId,
      original_price_cop:   originalPrice,
      discount_rule_id:     ruleId,
      discount_pct_applied: discountPct,
      final_price_cop:      finalPrice,
      payment_method:       "bank",
      payment_status:       "pending",
      bank_account_id:      bankAccountId,
      comprobante_url:      comprobantePath,
    })
    .select()
    .single();

  if (insertErr || !enrollment)
    return NextResponse.json({ error: insertErr?.message ?? "Error creando inscripción" }, { status: 500 });

  const ext = comprobantePath.split(".").pop() || "jpg";
  try {
    const finalUrl = await moveComprobanteToOrder(comprobantePath, enrollment.id, ext);
    await supabaseAdmin
      .from("enrollments")
      .update({ comprobante_url: finalUrl })
      .eq("id", enrollment.id);
  } catch {
    await supabaseAdmin
      .from("enrollments")
      .update({ payment_status: "cancelled" })
      .eq("id", enrollment.id);
    return NextResponse.json({ error: "Error al guardar el comprobante." }, { status: 502 });
  }

  revalidatePath("/academia");
  revalidatePath("/admin/enrollments");
  revalidatePath("/app/academia");

  if (email) {
    sendCourseOrderPlacedEmail({
      userEmail:     email,
      userName:      displayName,
      enrollmentId:  enrollment.id,
      courseName:    course.name,
      finalPriceCop: finalPrice,
      bankName:      bankAccount.bank_name,
    }).catch(() => null);
  }

  return NextResponse.json({
    enrollmentId:  enrollment.id,
    status:        "pending",
    paymentMethod: "bank",
  }, { status: 201 });
}
