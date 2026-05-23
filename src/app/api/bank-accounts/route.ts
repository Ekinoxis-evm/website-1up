import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/privy";
import { supabaseAdmin } from "@/lib/supabase";
import { rateLimitByUser, limiters } from "@/lib/rateLimit";

// H-6: the previous shape returned full `account_number` + `holder_document` for
// every active bank account to every authenticated user — a fraud-reconnaissance
// vector. The bulk list is now MASKED (last 4 of account_number, no document).
// Wizards that need the full record after a user selects a bank call the per-id
// route in `./[id]/route.ts`, which is rate-limited per user.
//
// Audit reference: AUDIT.md → H-6.

const maskTail = (s: string | null) => (s ? `••• ${s.slice(-4)}` : null);

export async function GET(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimitByUser(claims.userId, limiters.authMutate);
  if (!rl.success) return rl.response;

  const { data, error } = await supabaseAdmin
    .from("bank_accounts")
    .select("id, bank_name, account_type, account_number, holder_name, sort_order")
    .eq("is_active", true)
    .order("sort_order")
    .order("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const masked = (data ?? []).map((b) => ({
    id:                    b.id,
    bank_name:             b.bank_name,
    account_type:          b.account_type,
    account_number_masked: maskTail(b.account_number),
    holder_name:           b.holder_name,
    sort_order:            b.sort_order,
  }));

  return NextResponse.json(masked);
}
