import { NextRequest, NextResponse } from "next/server";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

// GET /api/admin/user-detail?id=N — full activity for one user profile
export async function GET(req: NextRequest) {
  if (!await checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id || isNaN(id)) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const [registrations, enrollments, passOrders, tokenOrders, results] = await Promise.all([
    supabaseAdmin
      .from("tournament_registrations")
      .select("id, status, registered_at, tournaments(name, date, status)")
      .eq("user_profile_id", id)
      .order("registered_at", { ascending: false }),
    supabaseAdmin
      .from("enrollments")
      .select("id, payment_status, final_price_cop, created_at, courses(name)")
      .eq("user_profile_id", id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("pass_orders")
      .select("id, status, payment_method, duration_days, started_at, expires_at, created_at")
      .eq("user_profile_id", id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("token_purchase_orders")
      .select("id, status, cop_amount, token_amount, created_at")
      .eq("user_profile_id", id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("tournament_results")
      .select("id, position, points, tournaments(name)")
      .eq("user_profile_id", id),
  ]);

  return NextResponse.json({
    registrations: registrations.data ?? [],
    enrollments:   enrollments.data ?? [],
    passOrders:    passOrders.data ?? [],
    tokenOrders:   tokenOrders.data ?? [],
    results:       results.data ?? [],
  });
}
