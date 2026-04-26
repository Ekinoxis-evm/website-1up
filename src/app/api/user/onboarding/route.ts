import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database.types";

type ProfileInsert = Database["public"]["Tables"]["user_profiles"]["Insert"];

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const TIPOS_DOCUMENTO = ["CC", "CE", "TI", "PP", "NIT"];
const VALID_PHONE_COUNTRIES = [
  "+57","+1","+52","+54","+55","+56","+51","+58","+593","+507","+53","+34","+44","+49",
];
const CURRENT_YEAR = new Date().getFullYear();

export async function POST(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const email = await resolveUserEmail(claims.userId);

  const body = await req.json() as {
    nombre?: string;
    apellidos?: string;
    username?: string;
    phoneCountry?: string;
    phoneNumber?: string;
    tipoDocumento?: string;
    numeroDocumento?: string;
    barrio?: string;
    birthYear?: number;
    gameIds?: number[];
    referralCode?: string;
  };

  const nombre   = body.nombre?.trim() ?? "";
  const apellidos = body.apellidos?.trim() ?? "";
  const barrio   = body.barrio?.trim() ?? "";
  const birthYear = body.birthYear;
  const referralCode = body.referralCode?.trim().toUpperCase() ?? "";

  if (!nombre)       return NextResponse.json({ error: "El nombre es requerido." }, { status: 400 });
  if (!apellidos)    return NextResponse.json({ error: "Los apellidos son requeridos." }, { status: 400 });
  if (!barrio)       return NextResponse.json({ error: "El barrio es requerido." }, { status: 400 });
  if (!birthYear || birthYear < 1930 || birthYear > CURRENT_YEAR - 5)
    return NextResponse.json({ error: "Año de nacimiento inválido." }, { status: 400 });
  if (!referralCode) return NextResponse.json({ error: "El código de referido es requerido." }, { status: 400 });

  if (body.username) {
    const u = body.username.trim().toLowerCase();
    if (u && !USERNAME_RE.test(u))
      return NextResponse.json({ error: "Username inválido (letras, números y _ · 3–20 caracteres)." }, { status: 400 });
  }
  if (body.phoneCountry && !VALID_PHONE_COUNTRIES.includes(body.phoneCountry))
    return NextResponse.json({ error: "Código de país inválido." }, { status: 400 });
  if (body.tipoDocumento && !TIPOS_DOCUMENTO.includes(body.tipoDocumento))
    return NextResponse.json({ error: "Tipo de documento inválido." }, { status: 400 });

  // Validate referral code
  const { data: codeRow } = await supabaseAdmin
    .from("referral_codes")
    .select("id, is_active, max_uses, used_count")
    .eq("code", referralCode)
    .single();

  if (!codeRow || !codeRow.is_active)
    return NextResponse.json({ error: "Código de referido inválido o inactivo." }, { status: 422 });
  if (codeRow.max_uses !== null && codeRow.used_count >= codeRow.max_uses)
    return NextResponse.json({ error: "Este código ya alcanzó su límite de usos." }, { status: 422 });

  // Upsert profile
  const patch: ProfileInsert = {
    privy_user_id:           claims.userId,
    email:                   email ?? null,
    nombre:                  nombre.slice(0, 100),
    apellidos:               apellidos.slice(0, 100),
    barrio:                  barrio.slice(0, 100),
    birth_year:              birthYear,
    referred_by_code:        referralCode,
    onboarding_completed_at: new Date().toISOString(),
    updated_at:              new Date().toISOString(),
    username:      body.username ? body.username.trim().toLowerCase() || null : undefined,
    phone_country: body.phoneCountry || undefined,
    phone_number:  body.phoneNumber ? body.phoneNumber.replace(/[^0-9]/g, "").slice(0, 20) || null : undefined,
    tipo_documento: body.tipoDocumento
      ? (body.tipoDocumento as Database["public"]["Enums"]["tipo_documento"])
      : undefined,
    numero_documento: body.numeroDocumento
      ? body.numeroDocumento.replace(/[^a-zA-Z0-9]/g, "").slice(0, 50) || null
      : undefined,
    game_ids: body.gameIds && Array.isArray(body.gameIds)
      ? body.gameIds.filter((id) => typeof id === "number").slice(0, 20)
      : undefined,
  };

  const { error: upsertError } = await supabaseAdmin
    .from("user_profiles")
    .upsert(patch, { onConflict: "privy_user_id" });

  if (upsertError) {
    if (upsertError.code === "23505")
      return NextResponse.json({ error: "Este username ya está en uso." }, { status: 409 });
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  // Increment referral code usage
  await supabaseAdmin
    .from("referral_codes")
    .update({ used_count: codeRow.used_count + 1, updated_at: new Date().toISOString() })
    .eq("id", codeRow.id);

  revalidatePath("/app");
  revalidatePath("/admin/referral-codes");

  return NextResponse.json({ ok: true }, { status: 201 });
}
