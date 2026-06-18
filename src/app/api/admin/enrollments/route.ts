/**
 * /api/admin/enrollments — GET + PATCH
 *
 * GET: enrollment list with course + user profile + bank account data.
 *      Supports ?status=pending|approved|rejected|cancelled filter.
 * PATCH: approve/reject token or bank enrollments (admin only).
 *
 * Admin-only.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { sendCourseOrderApprovedEmail, sendCourseOrderRejectedEmail } from "@/lib/email";
import { getComprobanteSignedUrl } from "@/lib/blob";
import { canReviewEnrollment } from "@/lib/courseEnrollment";

export async function GET(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await isAdmin(await resolveUserEmail(claims.userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const VALID_STATUSES = ["pending", "approved", "rejected", "cancelled"];

  let query = supabaseAdmin
    .from("enrollments")
    .select(`
      id,
      product_type,
      course_id,
      original_price_cop,
      discount_pct_applied,
      final_price_cop,
      payment_method,
      payment_status,
      mp_payment_id,
      paid_at,
      tx_hash,
      approved_tx_hash,
      comprobante_url,
      bank_account_id,
      rejection_reason,
      reviewed_by,
      reviewed_at,
      created_at,
      user_profiles ( email, nombre, apellidos, tipo_documento, numero_documento, comfenalco_afiliado ),
      courses ( name, category ),
      discount_rules ( name, trigger_type ),
      bank_accounts ( bank_name, account_number )
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && VALID_STATUSES.includes(status)) {
    query = query.eq("payment_status", status as "pending" | "approved" | "rejected" | "cancelled");
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = await Promise.all((data ?? []).map(async (enrollment) => {
    if (!enrollment.comprobante_url) return enrollment;
    const signedUrl = await getComprobanteSignedUrl(enrollment.comprobante_url);
    return { ...enrollment, comprobante_url: signedUrl };
  }));
  return NextResponse.json(enriched);
}

export async function PATCH(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminEmail = await resolveUserEmail(claims.userId);
  if (!await isAdmin(adminEmail)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    id?:              number;
    action?:          "approve" | "reject";
    approvedTxHash?:  string;
    rejectionReason?: string;
    note?:            string;
    adminNotes?:      string;
  };

  if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  if (body.action !== "approve" && body.action !== "reject")
    return NextResponse.json({ error: "action debe ser approve o reject" }, { status: 400 });

  const { data: enrollment } = await supabaseAdmin
    .from("enrollments")
    .select(`
      id, payment_method, payment_status, final_price_cop, course_id,
      bank_account_id, comprobante_url,
      user_profile_id,
      user_profiles ( email, nombre, apellidos ),
      courses ( name )
    `)
    .eq("id", body.id)
    .single();

  const gate = canReviewEnrollment(enrollment);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  if (!enrollment) return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 });

  // Cash is admin-attested: confirming it records a payment_events row whose CHECK
  // requires a reason. Demand the note up front so we never half-confirm.
  const isCash   = enrollment!.payment_method === "cash";
  const cashNote = (body.note ?? body.adminNotes ?? "").trim();
  if (body.action === "approve" && isCash && !cashNote) {
    return NextResponse.json(
      { error: "Indica una nota/motivo para confirmar el pago en efectivo (p. ej. recibido en taquilla)." },
      { status: 400 },
    );
  }

  const profile = Array.isArray(enrollment.user_profiles) ? enrollment.user_profiles[0] : enrollment.user_profiles;
  const courseRow = Array.isArray(enrollment.courses) ? enrollment.courses[0] : enrollment.courses;
  const userEmail = profile?.email ?? null;
  const userName  = profile
    ? ([profile.nombre, profile.apellidos].filter(Boolean).join(" ").trim() || userEmail || `#${enrollment.id}`)
    : (userEmail ?? `#${enrollment.id}`);
  const courseName = courseRow?.name ?? "Curso";

  if (body.action === "approve") {
    const updates: Record<string, unknown> = {
      payment_status: "approved",
      paid_at:        new Date().toISOString(),
      reviewed_by:    adminEmail,
      reviewed_at:    new Date().toISOString(),
    };
    if (body.approvedTxHash?.trim()) updates.approved_tx_hash = body.approvedTxHash.trim();

    const { error } = await supabaseAdmin
      .from("enrollments")
      .update(updates)
      .eq("id", body.id)
      .eq("payment_status", "pending");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Record the confirmed payment in the unified ledger (wire or cash). Token
    // enrollments verified on-chain at creation are excluded (the tx already
    // owns the payment_events tx_hash uniqueness on their own path). Best-effort:
    // the enrollment is already the source of truth for course access, so a
    // ledger hiccup must not fail the approval — but log it. The single-confirmed
    // invariant still guards against duplicates.
    if (enrollment!.payment_method === "bank" || isCash) {
      const { error: ledgerErr } = await supabaseAdmin.rpc("apply_payment_event", {
        p_order_kind:        "enrollment",
        p_order_id:          body.id,
        p_method:            isCash ? "cash" : "wire",
        p_amount_cop:        enrollment!.final_price_cop ?? undefined,
        p_bank_account_id:   enrollment!.bank_account_id ?? undefined,
        p_comprobante_url:   enrollment!.comprobante_url ?? undefined,
        p_recorded_by_admin: adminEmail,
        p_reason:            isCash ? cashNote : "Transferencia aprobada por el equipo",
      });
      if (ledgerErr) console.error("apply_payment_event failed for enrollment", body.id, ledgerErr.message);
    }

    if (userEmail) {
      sendCourseOrderApprovedEmail({
        userEmail,
        userName,
        enrollmentId:  enrollment.id,
        courseName,
        finalPriceCop: enrollment.final_price_cop,
      }).catch(() => null);
    }
  } else {
    if (!body.rejectionReason?.trim())
      return NextResponse.json({ error: "rejectionReason requerido para rechazar" }, { status: 400 });

    const reason = body.rejectionReason.trim();

    const { error } = await supabaseAdmin
      .from("enrollments")
      .update({
        payment_status:   "rejected",
        rejection_reason: reason,
        reviewed_by:      adminEmail,
        reviewed_at:      new Date().toISOString(),
      })
      .eq("id", body.id)
      .eq("payment_status", "pending");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (userEmail) {
      sendCourseOrderRejectedEmail({
        userEmail,
        userName,
        enrollmentId:    enrollment.id,
        courseName,
        rejectionReason: reason,
      }).catch(() => null);
    }
  }

  revalidatePath("/academia");
  revalidatePath("/admin/enrollments");
  revalidatePath("/app/academia");
  return NextResponse.json({ ok: true });
}
