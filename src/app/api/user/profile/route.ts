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

  const body = await req.json() as { tipoDocumento?: string; numeroDocumento?: string };

  // Validate tipo_documento
  if (body.tipoDocumento && !TIPOS_DOCUMENTO.includes(body.tipoDocumento as TipoDocumento)) {
    return NextResponse.json({ error: "tipo_documento inválido" }, { status: 400 });
  }

  // Sanitize numero_documento — alphanumeric only
  const numDoc = body.numeroDocumento?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 50) ?? null;

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .update({
      tipo_documento:   (body.tipoDocumento ?? null) as "CC" | "CE" | "TI" | "PP" | "NIT" | null,
      numero_documento: numDoc,
      updated_at:       new Date().toISOString(),
    })
    .eq("privy_user_id", user.userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
