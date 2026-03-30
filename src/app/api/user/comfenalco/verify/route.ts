/**
 * /api/user/comfenalco/verify — POST
 *
 * Calls the Comfenalco API to verify affiliation and persists the result.
 * Requires a valid Privy Bearer token.
 *
 * Body: { tipoDocumento: "CC" | "CE" | "TI" | "PP" | "NIT", numeroDocumento: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import {
  verifyComfenalcoAffiliate,
  ComfenalcoConfigError,
  ComfenalcoApiError,
  type TipoDocumento,
} from "@/lib/comfenalco";

const TIPOS_DOCUMENTO: TipoDocumento[] = ["CC", "CE", "TI", "PP", "NIT"];

export async function POST(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const email = await resolveUserEmail(claims.userId);

  // ── Validate body ──────────────────────────────────────────────
  const body = await req.json() as { tipoDocumento?: unknown; numeroDocumento?: unknown };

  if (
    typeof body.tipoDocumento !== "string" ||
    !TIPOS_DOCUMENTO.includes(body.tipoDocumento as TipoDocumento)
  ) {
    return NextResponse.json({ error: "tipo_documento inválido" }, { status: 400 });
  }

  if (typeof body.numeroDocumento !== "string" || body.numeroDocumento.trim().length === 0) {
    return NextResponse.json({ error: "numero_documento requerido" }, { status: 400 });
  }

  const tipoDocumento = body.tipoDocumento as TipoDocumento;
  const numeroDocumento = body.numeroDocumento.replace(/[^a-zA-Z0-9]/g, "").slice(0, 50);

  // ── Ensure profile exists ──────────────────────────────────────
  await supabaseAdmin
    .from("user_profiles")
    .upsert(
      { privy_user_id: claims.userId, email: email ?? null },
      { onConflict: "privy_user_id", ignoreDuplicates: true },
    );

  // ── Call Comfenalco API ────────────────────────────────────────
  let isAffiliated = false;
  let message = "";

  try {
    const result = await verifyComfenalcoAffiliate(tipoDocumento, numeroDocumento);
    isAffiliated = result.isAffiliated;
    message = result.message;
  } catch (err) {
    if (err instanceof ComfenalcoConfigError) {
      return NextResponse.json(
        { error: "La integración con Comfenalco no está configurada aún." },
        { status: 503 },
      );
    }
    if (err instanceof ComfenalcoApiError) {
      console.error("[Comfenalco] API error:", err.status, err.message);
      return NextResponse.json(
        { error: "Error al comunicarse con Comfenalco. Intenta más tarde." },
        { status: 502 },
      );
    }
    console.error("[Comfenalco] Unexpected error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  // ── Persist result ─────────────────────────────────────────────
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .update({
      tipo_documento:          tipoDocumento,
      numero_documento:        numeroDocumento,
      comfenalco_afiliado:     isAffiliated,
      comfenalco_verified_at:  new Date().toISOString(),
      updated_at:              new Date().toISOString(),
    })
    .eq("privy_user_id", claims.userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ profile: data, isAffiliated, message });
}
