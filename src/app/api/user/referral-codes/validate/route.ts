import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim().toUpperCase();
  if (!code) return NextResponse.json({ valid: false, reason: "Código vacío." });

  const { data } = await supabaseAdmin
    .from("referral_codes")
    .select("is_active, max_uses, used_count")
    .eq("code", code)
    .single();

  if (!data)            return NextResponse.json({ valid: false, reason: "Código no encontrado." });
  if (!data.is_active)  return NextResponse.json({ valid: false, reason: "Código inactivo." });
  if (data.max_uses !== null && data.used_count >= data.max_uses)
    return NextResponse.json({ valid: false, reason: "Código sin usos disponibles." });

  return NextResponse.json({ valid: true });
}
