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
