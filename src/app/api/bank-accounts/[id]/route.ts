// H-6: per-account endpoint — returns the FULL bank account record for a single id.
// Users hit this only after selecting a bank in the checkout wizard, so the
// total volume per legitimate user is 1-2 calls per checkout. Rate-limited
// (authMutate, 20/min/user) so an attacker that wants to enumerate by walking
// ids gets throttled.

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/privy";
import { supabaseAdmin } from "@/lib/supabase";
import { rateLimitByUser, limiters } from "@/lib/rateLimit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimitByUser(claims.userId, limiters.authMutate);
  if (!rl.success) return rl.response;

  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("bank_accounts")
    .select("id, bank_name, account_type, account_number, holder_name, holder_document, instructions")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error || !data) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  return NextResponse.json(data);
}
