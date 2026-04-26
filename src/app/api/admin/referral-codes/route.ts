import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

export async function GET(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("referral_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code, description, maxUses } = await req.json() as {
    code?: string;
    description?: string;
    maxUses?: number | null;
  };

  const cleaned = code?.trim().toUpperCase();
  if (!cleaned) return NextResponse.json({ error: "El código es requerido." }, { status: 400 });
  if (!/^[A-Z0-9_]{2,30}$/.test(cleaned))
    return NextResponse.json({ error: "El código solo puede tener letras mayúsculas, números y _ (2–30 caracteres)." }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("referral_codes")
    .insert({ code: cleaned, description: description?.trim() || null, max_uses: maxUses ?? null })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Este código ya existe." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/admin/referral-codes");
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, description, isActive, maxUses } = await req.json() as {
    id?: number;
    description?: string;
    isActive?: boolean;
    maxUses?: number | null;
  };

  if (!id) return NextResponse.json({ error: "id requerido." }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (description !== undefined) patch.description = description?.trim() || null;
  if (isActive    !== undefined) patch.is_active   = isActive;
  if (maxUses     !== undefined) patch.max_uses    = maxUses;

  const { data, error } = await supabaseAdmin
    .from("referral_codes")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/admin/referral-codes");
  return NextResponse.json(data);
}
