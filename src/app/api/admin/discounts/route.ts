/**
 * /api/admin/discounts — POST | PUT | DELETE
 *
 * CRUD for discount_rules. Admin-only.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return isAdmin(await resolveUserEmail(claims.userId));
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (!body.name?.trim()) return NextResponse.json({ error: "name requerido" }, { status: 400 });
  if (!["comfenalco", "promo_code", "manual", "auto"].includes(body.triggerType)) {
    return NextResponse.json({ error: "triggerType inválido" }, { status: 400 });
  }
  if (!["courses", "pass", "all"].includes(body.appliesTo)) {
    return NextResponse.json({ error: "appliesTo inválido" }, { status: 400 });
  }
  const pct = parseInt(body.discountPct, 10);
  if (isNaN(pct) || pct < 1 || pct > 100) {
    return NextResponse.json({ error: "discountPct debe ser 1–100" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("discount_rules")
    .insert({
      name:         body.name.trim(),
      description:  body.description?.trim() || null,
      trigger_type: body.triggerType,
      discount_pct: pct,
      applies_to:   body.appliesTo,
      is_active:    body.isActive ?? true,
      valid_from:   body.validFrom || null,
      valid_until:  body.validUntil || null,
      created_by:   body.createdBy ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/admin/discounts");
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const pct = parseInt(body.discountPct, 10);
  if (isNaN(pct) || pct < 1 || pct > 100) {
    return NextResponse.json({ error: "discountPct debe ser 1–100" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("discount_rules")
    .update({
      name:         body.name?.trim(),
      description:  body.description?.trim() || null,
      trigger_type: body.triggerType,
      discount_pct: pct,
      applies_to:   body.appliesTo,
      is_active:    body.isActive ?? true,
      valid_from:   body.validFrom || null,
      valid_until:  body.validUntil || null,
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/admin/discounts");
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  await supabaseAdmin.from("discount_rules").delete().eq("id", id);

  revalidatePath("/admin/discounts");
  return NextResponse.json({ ok: true });
}
