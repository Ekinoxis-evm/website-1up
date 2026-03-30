/**
 * /api/checkout — POST
 *
 * Creates a MercadoPago preference for a course or pass purchase.
 * Applies the best active discount the user qualifies for.
 * Requires a valid Privy Bearer token.
 *
 * Body: { courseId: number } | { productType: "pass" }
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { createCoursePreference } from "@/lib/mercadopago";

async function getOrCreateProfile(privyUserId: string, email: string | undefined) {
  // Try to fetch existing profile
  const { data: existing } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("privy_user_id", privyUserId)
    .single();

  if (existing) return existing;

  // Create on first checkout
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
    // Skip comfenalco rule if user is not affiliated
    if (rule.trigger_type === "comfenalco" && !isComfenalcoAffiliate) continue;

    if (rule.discount_pct > best.discountPct) {
      best = { ruleId: rule.id, discountPct: rule.discount_pct };
    }
  }

  return best;
}

export async function POST(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const email = await resolveUserEmail(claims.userId);

  // ── Parse body ─────────────────────────────────────────────────
  const body = await req.json() as { courseId?: unknown; productType?: unknown };
  const courseId = typeof body.courseId === "number" ? body.courseId : null;
  const productType = courseId ? "course" : "pass";

  if (!courseId) {
    return NextResponse.json({ error: "courseId requerido" }, { status: 400 });
  }

  // ── Fetch course ───────────────────────────────────────────────
  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("id, name, price_cop, is_active")
    .eq("id", courseId)
    .single();

  if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  if (!course.is_active) return NextResponse.json({ error: "Curso no disponible" }, { status: 410 });
  if (!course.price_cop) return NextResponse.json({ error: "Curso sin precio configurado" }, { status: 400 });

  // ── User profile + affiliate status ───────────────────────────
  const profile = await getOrCreateProfile(claims.userId, email);
  const isComfenalcoAffiliate = profile?.comfenalco_afiliado === true;

  // ── Fetch applicable discount rules ───────────────────────────
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
  const finalPrice = Math.round(originalPrice * (1 - discountPct / 100));

  if (!profile?.id) {
    return NextResponse.json({ error: "No se pudo obtener el perfil del usuario" }, { status: 500 });
  }

  // ── Create enrollment (pending) ────────────────────────────────
  const { data: enrollment, error: enrollErr } = await supabaseAdmin
    .from("enrollments")
    .insert({
      user_profile_id:      profile.id,
      product_type:         productType,
      course_id:            courseId,
      original_price_cop:   originalPrice,
      discount_rule_id:     ruleId,
      discount_pct_applied: discountPct,
      final_price_cop:      finalPrice,
      payment_status:       "pending",
    })
    .select()
    .single();

  if (enrollErr || !enrollment) {
    console.error("[Checkout] Failed to create enrollment:", enrollErr);
    return NextResponse.json({ error: "Error creando la inscripción" }, { status: 500 });
  }

  // ── Create MercadoPago preference ──────────────────────────────
  try {
    const preference = await createCoursePreference({
      enrollmentId:  enrollment.id,
      courseId:      course.id,
      courseName:    course.name,
      unitPrice:     finalPrice,
      originalPrice: originalPrice,
      discountPct:   discountPct,
      buyerEmail:    email ?? "",
    });

    // Persist preference ID
    await supabaseAdmin
      .from("enrollments")
      .update({ mp_preference_id: preference.preferenceId })
      .eq("id", enrollment.id);

    const isProduction = process.env.NODE_ENV === "production";

    return NextResponse.json({
      enrollmentId:   enrollment.id,
      preferenceId:   preference.preferenceId,
      checkoutUrl:    isProduction ? preference.initPoint : preference.sandboxInitPoint,
      originalPrice,
      finalPrice,
      discountPct,
    });
  } catch (err) {
    // Roll back enrollment if preference creation fails
    await supabaseAdmin.from("enrollments").update({ payment_status: "cancelled" }).eq("id", enrollment.id);
    console.error("[Checkout] MercadoPago error:", err);
    return NextResponse.json({ error: "Error al crear el pago. Intenta más tarde." }, { status: 502 });
  }
}
