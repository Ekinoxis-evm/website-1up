import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { passBenefits } from "@/db/schema";
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
  const result = await db.insert(passBenefits).values({ title: body.title, description: body.description || null, sortOrder: body.sortOrder ?? 0 }).returning();
  revalidatePath("/gaming-tower"); revalidatePath("/admin/pass-benefits");
  return NextResponse.json(result[0]);
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const result = await db.update(passBenefits).set({ title: body.title, description: body.description || null, sortOrder: body.sortOrder ?? 0 }).where(eq(passBenefits.id, body.id)).returning();
  revalidatePath("/gaming-tower"); revalidatePath("/admin/pass-benefits");
  return NextResponse.json(result[0]);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await db.delete(passBenefits).where(eq(passBenefits.id, id));
  revalidatePath("/gaming-tower"); revalidatePath("/admin/pass-benefits");
  return NextResponse.json({ ok: true });
}
