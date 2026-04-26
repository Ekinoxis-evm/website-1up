/**
 * /api/user/profile — GET (fetch own profile) | PUT (update document fields)
 *
 * Authenticated via Privy Bearer token.
 * Creates the profile row on first GET if it doesn't exist.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import type { TipoDocumento } from "@/lib/comfenalco";

const TIPOS_DOCUMENTO: TipoDocumento[] = ["CC", "CE", "TI", "PP", "NIT"];
const VALID_PHONE_COUNTRIES = [
  "+57","+1","+52","+54","+55","+56","+51","+58","+593","+507","+53","+34","+44","+49",
];
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

async function getPrivyUser(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return null;
  const email = await resolveUserEmail(claims.userId);
  return { userId: claims.userId, email };
}

// ── GET /api/user/profile ────────────────────────────────────────

export async function GET(req: NextRequest) {
  const user = await getPrivyUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Upsert on first access — ensures profile exists
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      { privy_user_id: user.userId, email: user.email ?? null },
      { onConflict: "privy_user_id", ignoreDuplicates: true },
    )
    .select()
    .single();

  if (error) {
    // Row already exists — fetch it
    const { data: existing } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("privy_user_id", user.userId)
      .single();
    return NextResponse.json(existing);
  }

  return NextResponse.json(data);
}

// ── PUT /api/user/profile ────────────────────────────────────────

export async function PUT(req: NextRequest) {
  const user = await getPrivyUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    tipoDocumento?: string;
    numeroDocumento?: string;
    nombre?: string;
    apellidos?: string;
    username?: string;
    phoneCountry?: string;
    phoneNumber?: string;
    gameIds?: number[];
    barrio?: string;
    birthDate?: string;
    referralCode?: string;
  };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.tipoDocumento !== undefined) {
    if (body.tipoDocumento && !TIPOS_DOCUMENTO.includes(body.tipoDocumento as TipoDocumento)) {
      return NextResponse.json({ error: "tipo_documento inválido" }, { status: 400 });
    }
    patch.tipo_documento = (body.tipoDocumento || null) as "CC" | "CE" | "TI" | "PP" | "NIT" | null;
  }
  if (body.numeroDocumento !== undefined) {
    patch.numero_documento = body.numeroDocumento?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 50) || null;
  }
  if (body.nombre !== undefined) {
    patch.nombre = body.nombre?.trim().slice(0, 100) || null;
  }
  if (body.apellidos !== undefined) {
    patch.apellidos = body.apellidos?.trim().slice(0, 100) || null;
  }
  if (body.username !== undefined) {
    const uname = body.username?.trim().toLowerCase() || null;
    if (uname && !USERNAME_RE.test(uname)) {
      return NextResponse.json({ error: "Username inválido. Solo letras minúsculas, números y _ (3–20 caracteres)." }, { status: 400 });
    }
    patch.username = uname;
  }
  if (body.phoneCountry !== undefined) {
    if (body.phoneCountry && !VALID_PHONE_COUNTRIES.includes(body.phoneCountry)) {
      return NextResponse.json({ error: "Código de país inválido." }, { status: 400 });
    }
    patch.phone_country = body.phoneCountry || null;
  }
  if (body.phoneNumber !== undefined) {
    patch.phone_number = body.phoneNumber?.replace(/[^0-9]/g, "").slice(0, 20) || null;
  }
  if (body.gameIds !== undefined) {
    if (!Array.isArray(body.gameIds) || body.gameIds.some((id) => typeof id !== "number")) {
      return NextResponse.json({ error: "gameIds inválido." }, { status: 400 });
    }
    patch.game_ids = body.gameIds.slice(0, 20);
  }
  if (body.barrio !== undefined) {
    patch.barrio = body.barrio?.trim().slice(0, 100) || null;
  }
  if (body.birthDate !== undefined) {
    if (body.birthDate) {
      const parts = body.birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!parts) return NextResponse.json({ error: "Formato de fecha inválido." }, { status: 400 });
      const y = parseInt(parts[1]), m = parseInt(parts[2]), d = parseInt(parts[3]);
      const date = new Date(y, m - 1, d);
      if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d)
        return NextResponse.json({ error: "Fecha de nacimiento inválida." }, { status: 400 });
      if (y < 1930) return NextResponse.json({ error: "Año de nacimiento muy antiguo." }, { status: 400 });
      const minAge = new Date(); minAge.setFullYear(minAge.getFullYear() - 5);
      if (date > minAge) return NextResponse.json({ error: "Debes tener al menos 5 años." }, { status: 400 });
    }
    patch.birth_date = body.birthDate || null;
  }
  if (body.referralCode !== undefined && body.referralCode) {
    const code = body.referralCode.trim().toUpperCase();
    const { data: existing } = await supabaseAdmin
      .from("user_profiles")
      .select("referred_by_code")
      .eq("privy_user_id", user.userId)
      .single();
    if (existing?.referred_by_code)
      return NextResponse.json({ error: "Ya tienes un código de referido asignado." }, { status: 409 });
    const { data: codeRow } = await supabaseAdmin
      .from("referral_codes")
      .select("id, is_active, max_uses, used_count")
      .eq("code", code)
      .single();
    if (!codeRow || !codeRow.is_active)
      return NextResponse.json({ error: "Código inválido o inactivo." }, { status: 422 });
    if (codeRow.max_uses !== null && codeRow.used_count >= codeRow.max_uses)
      return NextResponse.json({ error: "Este código ya alcanzó su límite de usos." }, { status: 422 });
    patch.referred_by_code = code;
    await supabaseAdmin
      .from("referral_codes")
      .update({ used_count: codeRow.used_count + 1, updated_at: new Date().toISOString() })
      .eq("id", codeRow.id);
  }

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .update(patch)
    .eq("privy_user_id", user.userId)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Este username ya está en uso." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
