// POST /api/user/passes/activate — the holder activates an `issued` pass. The
// clock starts now; the duration stacks on top of any currently-active pass.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/privy";
import { revalidatePath } from "next/cache";
import { canActivatePass } from "@/lib/passActivation";
import { computePassWindow } from "@/lib/passWindow";
import { rateLimitByUser, limiters } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimitByUser(claims.userId, limiters.authMutate);
  if (!rl.success) return rl.response;

  const { passId } = await req.json() as { passId?: number };
  if (!passId) return NextResponse.json({ error: "passId requerido" }, { status: 400 });

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("privy_user_id", claims.userId)
    .single();
  if (!profile) return NextResponse.json({ error: "Perfil no encontrado." }, { status: 400 });

  const { data: pass } = await supabaseAdmin
    .from("passes")
    .select("id, owner_user_profile_id, state, duration_days")
    .eq("id", passId)
    .maybeSingle();

  const check = canActivatePass(pass, profile.id);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  // Stack onto the user's currently-active pass, if any. (Edge case: if a user
  // activates two different issued passes within the same instant, both may read
  // the same base and stack onto it rather than chaining — acceptable since the
  // model explicitly allows multiple active passes; the total granted time is
  // preserved either way.)
  const nowIso = new Date().toISOString();
  const { data: activePass } = await supabaseAdmin
    .from("passes")
    .select("expires_at")
    .eq("owner_user_profile_id", profile.id)
    .eq("state", "active")
    .gt("expires_at", nowIso)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { expiresAt } = computePassWindow({
    activeExpiresAt: activePass?.expires_at,
    durationDays: pass!.duration_days,
  });

  // Idempotent: only flip a row that is still `issued` (guards a double-click /
  // concurrent activation). An empty row-count means it was already activated.
  const { data: updated, error: updErr } = await supabaseAdmin
    .from("passes")
    .update({
      state:        "active",
      activated_at: nowIso,
      expires_at:   expiresAt.toISOString(),
      updated_at:   nowIso,
    })
    .eq("id", passId)
    .eq("state", "issued")
    .select("id, state, activated_at, expires_at")
    .maybeSingle();

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "Este pase ya fue activado." }, { status: 409 });

  revalidatePath("/app/pass");
  return NextResponse.json({ ok: true, pass: updated });
}
