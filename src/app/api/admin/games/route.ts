import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { games } from "@/db/schema";
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
  const result = await db.insert(games).values({ name: body.name, categoryId: body.categoryId, sortOrder: body.sortOrder ?? 0 }).returning();
  revalidatePath("/"); revalidatePath("/admin/games");
  return NextResponse.json(result[0]);
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const result = await db.update(games).set({ name: body.name, categoryId: body.categoryId, sortOrder: body.sortOrder }).where(eq(games.id, body.id)).returning();
  revalidatePath("/"); revalidatePath("/admin/games");
  return NextResponse.json(result[0]);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await db.delete(games).where(eq(games.id, id));
  revalidatePath("/"); revalidatePath("/admin/games");
  return NextResponse.json({ ok: true });
}
