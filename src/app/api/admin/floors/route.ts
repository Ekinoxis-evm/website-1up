import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { floorInfo } from "@/db/schema";
import { verifyToken } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { privyServer } from "@/lib/privy";
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
  const result = await db.insert(floorInfo).values({ floorLabel: body.floorLabel, title: body.title, description: body.description, accentColor: body.accentColor || null, sortOrder: body.sortOrder ?? 0 }).returning();
  revalidatePath("/gaming-tower"); revalidatePath("/admin/floors");
  return NextResponse.json(result[0]);
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const result = await db.update(floorInfo).set({ floorLabel: body.floorLabel, title: body.title, description: body.description, accentColor: body.accentColor || null, sortOrder: body.sortOrder ?? 0 }).where(eq(floorInfo.id, body.id)).returning();
  revalidatePath("/gaming-tower"); revalidatePath("/admin/floors");
  return NextResponse.json(result[0]);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await db.delete(floorInfo).where(eq(floorInfo.id, id));
  revalidatePath("/gaming-tower"); revalidatePath("/admin/floors");
  return NextResponse.json({ ok: true });
}
