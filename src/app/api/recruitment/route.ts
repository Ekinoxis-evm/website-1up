import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { rateLimitByIp, limiters } from "@/lib/rateLimit";

// M-A6.1: anon recruitment form. Length caps + email validation block both
// storage-bloat abuse and stored-content vectors (XSS / phishing payloads
// living in the admin viewer). Lengths intentionally match the DB column
// limits in supabase/migrations/00000000000000_baseline.sql.
const MAX = {
  name:     200,
  email:    300,
  phone:     50,
  gamertag: 100,
  message: 2000,
};

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_RE = /^[+0-9()\-\s]{6,50}$/;

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(req: NextRequest) {
  // H-4: anon endpoint — strict per-IP rate limit (5/min) to block form spam.
  const rl = await rateLimitByIp(req, limiters.anonStrict);
  if (!rl.success) return rl.response;

  try {
    const body = await req.json();
    const name     = clean(body?.name,     MAX.name);
    const email    = clean(body?.email,    MAX.email).toLowerCase();
    const phone    = clean(body?.phone,    MAX.phone);
    const gamertag = clean(body?.gamertag, MAX.gamertag);
    const message  = clean(body?.message,  MAX.message);
    const source   = clean(body?.source,    50) || "home";

    if (!name)             return NextResponse.json({ error: "Nombre requerido."   }, { status: 400 });
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Email inválido." }, { status: 400 });
    if (!PHONE_RE.test(phone)) return NextResponse.json({ error: "Teléfono inválido." }, { status: 400 });

    const categoryId = Number(body?.categoryId);
    const gameId     = Number(body?.gameId);

    await supabaseAdmin.from("recruitment_submissions").insert({
      name,
      email,
      phone,
      category_id: Number.isFinite(categoryId) && categoryId > 0 ? categoryId : null,
      game_id:     Number.isFinite(gameId)     && gameId     > 0 ? gameId     : null,
      gamertag:    gamertag || null,
      message:     message  || null,
      source,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[recruitment]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
