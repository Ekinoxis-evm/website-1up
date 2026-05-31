// POST /api/admin/passes/revoke — admin revokes a pass (the undo for a
// mistaken delivery). Sets state='revoked' and unlinks any tournament_results
// row so the prize can be re-delivered. The passes trigger recomputes the
// owner's pass_status (a revoked pass no longer counts as active/expired).
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { canRevokePass } from "@/lib/passActivation";

export async function POST(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const adminEmail = await resolveUserEmail(claims.userId);
  if (!await isAdmin(adminEmail)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { passId, reason } = await req.json() as { passId?: number; reason?: string };
  if (!passId) return NextResponse.json({ error: "passId requerido" }, { status: 400 });

  const { data: pass } = await supabaseAdmin
    .from("passes")
    .select("id, state")
    .eq("id", passId)
    .maybeSingle();

  const check = canRevokePass(pass);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const nowIso = new Date().toISOString();
  // State-guarded update for idempotency: only flip a not-yet-revoked row.
  const { data: updated, error: updErr } = await supabaseAdmin
    .from("passes")
    .update({
      state:         "revoked",
      revoked_at:    nowIso,
      revoked_by:    adminEmail,
      revoke_reason: reason?.trim() || null,
      updated_at:    nowIso,
    })
    .eq("id", passId)
    .neq("state", "revoked")
    .select("id")
    .maybeSingle();

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "Este pase ya fue revocado." }, { status: 409 });

  // Unlink any podium row so the prize can be re-delivered.
  await supabaseAdmin
    .from("tournament_results")
    .update({ pass_id: null })
    .eq("pass_id", passId);

  revalidatePath("/app/pass");
  revalidatePath("/admin/pass-orders");
  return NextResponse.json({ ok: true });
}
