import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, categoryId, gameId, gamertag, message, source } = body;

    if (!name || !email || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await supabaseAdmin.from("recruitment_submissions").insert({
      name:        String(name),
      email:       String(email),
      phone:       String(phone),
      category_id: categoryId ? Number(categoryId) : null,
      game_id:     gameId     ? Number(gameId)     : null,
      gamertag:    gamertag   ? String(gamertag)   : null,
      message:     message    ? String(message)    : null,
      source:      source     ? String(source)     : "home",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[recruitment]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
