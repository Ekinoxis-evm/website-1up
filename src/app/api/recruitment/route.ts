import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recruitmentSubmissions } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, categoryId, gameId, gamertag, message, source } = body;

    if (!name || !email || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await db.insert(recruitmentSubmissions).values({
      name:       String(name),
      email:      String(email),
      phone:      String(phone),
      categoryId: categoryId ? Number(categoryId) : null,
      gameId:     gameId     ? Number(gameId)     : null,
      gamertag:   gamertag   ? String(gamertag)   : null,
      message:    message    ? String(message)    : null,
      source:     source     ? String(source)     : "home",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[recruitment]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
