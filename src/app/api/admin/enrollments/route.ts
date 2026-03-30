/**
 * /api/admin/enrollments — GET
 *
 * Read-only enrollment list with course + user profile data.
 * Supports ?status=pending|approved|rejected|cancelled filter.
 * Admin-only.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";

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
      payment_status,
      mp_payment_id,
      paid_at,
      created_at,
      user_profiles ( email, tipo_documento, numero_documento, comfenalco_afiliado ),
      courses ( name, category ),
      discount_rules ( name, trigger_type )
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && VALID_STATUSES.includes(status)) {
    query = query.eq("payment_status", status as "pending" | "approved" | "rejected" | "cancelled");
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}
