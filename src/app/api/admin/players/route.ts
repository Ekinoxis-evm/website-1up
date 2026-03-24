import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { players } from "@/db/schema";
import { verifyToken, privyServer } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  const user = await privyServer.getUser(claims.userId).catch(() => null);
  return isAdmin(user?.email?.address);
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const result = await db.insert(players).values({
    gamertag: body.gamertag, realName: body.realName, role: body.role || null,
    instagramUrl: body.instagramUrl || null, tiktokUrl: body.tiktokUrl || null,
    kickUrl: body.kickUrl || null, youtubeUrl: body.youtubeUrl || null,
    sortOrder: body.sortOrder ?? 0, isActive: body.isActive ?? true,
  }).returning();
  revalidatePath("/team"); revalidatePath("/admin/players");
  return NextResponse.json(result[0]);
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const result = await db.update(players).set({
    gamertag: body.gamertag, realName: body.realName, role: body.role || null,
    instagramUrl: body.instagramUrl || null, tiktokUrl: body.tiktokUrl || null,
    kickUrl: body.kickUrl || null, youtubeUrl: body.youtubeUrl || null,
    sortOrder: body.sortOrder ?? 0, isActive: body.isActive ?? true,
  }).where(eq(players.id, body.id)).returning();
  revalidatePath("/team"); revalidatePath("/admin/players");
  return NextResponse.json(result[0]);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await db.delete(players).where(eq(players.id, id));
  revalidatePath("/team"); revalidatePath("/admin/players");
  return NextResponse.json({ ok: true });
}
