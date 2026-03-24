import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { competitions } from "@/db/schema";
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
  const result = await db.insert(competitions).values({ tournamentName: body.tournamentName, country: body.country, city: body.city || null, year: body.year, result: body.result, playerId: body.playerId || null }).returning();
  revalidatePath("/team"); revalidatePath("/admin/competitions");
  return NextResponse.json(result[0]);
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const result = await db.update(competitions).set({ tournamentName: body.tournamentName, country: body.country, city: body.city || null, year: body.year, result: body.result, playerId: body.playerId || null }).where(eq(competitions.id, body.id)).returning();
  revalidatePath("/team"); revalidatePath("/admin/competitions");
  return NextResponse.json(result[0]);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await db.delete(competitions).where(eq(competitions.id, id));
  revalidatePath("/team"); revalidatePath("/admin/competitions");
  return NextResponse.json({ ok: true });
}
