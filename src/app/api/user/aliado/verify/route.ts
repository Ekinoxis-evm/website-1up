import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/privy";

/**
 * POST /api/user/aliado/verify
 * Body: { aliado_id: number, numero_documento: string }
 *
 * Checks if the user is a member of the aliado's database.
 * On success, adds aliado_id to user_profiles.verified_aliados.
 * Returns HTTP 503 if aliado has no api_url configured.
 */
export async function POST(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { aliado_id, numero_documento } = await req.json();
  if (!aliado_id || !numero_documento) {
    return NextResponse.json({ error: "aliado_id and numero_documento are required" }, { status: 400 });
  }

  // Fetch aliado config
  const { data: aliado } = await supabaseAdmin
    .from("aliados")
    .select("id, name, api_url, api_key, is_active")
    .eq("id", aliado_id)
    .single();

  if (!aliado || !aliado.is_active) {
    return NextResponse.json({ error: "Aliado not found or inactive" }, { status: 404 });
  }

  if (!aliado.api_url) {
    return NextResponse.json(
      { error: `Integración con ${aliado.name} pendiente de configuración.`, pending: true },
      { status: 503 }
    );
  }

  // Call aliado's API
  let verified = false;
  try {
    const response = await fetch(aliado.api_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(aliado.api_key ? { Authorization: `Bearer ${aliado.api_key}` } : {}),
      },
      body: JSON.stringify({ numero_documento }),
    });
    if (response.ok) {
      const data = await response.json();
      // Aliado APIs should return { afiliado: true/false } or similar
      verified = data?.afiliado === true || data?.member === true || data?.verified === true;
    }
  } catch {
    return NextResponse.json({ error: "Error connecting to aliado API" }, { status: 502 });
  }

  if (!verified) {
    return NextResponse.json({ afiliado: false, aliado: aliado.name });
  }

  // Get current user profile
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id, verified_aliados")
    .eq("privy_user_id", claims.userId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  // Add aliado_id if not already present
  const current: number[] = Array.isArray(profile.verified_aliados)
    ? (profile.verified_aliados as unknown as number[])
    : [];
  if (!current.includes(aliado_id)) {
    await supabaseAdmin
      .from("user_profiles")
      .update({ verified_aliados: [...current, aliado_id], updated_at: new Date().toISOString() })
      .eq("id", profile.id);
  }

  return NextResponse.json({ afiliado: true, aliado: aliado.name });
}
