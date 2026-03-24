import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { courses } from "@/db/schema";
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
  const result = await db.insert(courses).values({ name: body.name, category: body.category, description: body.description || null, priceCop: body.priceCop || null, durationHours: body.durationHours || null, paymentLink: body.paymentLink || null, sortOrder: body.sortOrder ?? 0 }).returning();
  revalidatePath("/academia"); revalidatePath("/admin/courses");
  return NextResponse.json(result[0]);
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const result = await db.update(courses).set({ name: body.name, category: body.category, description: body.description || null, priceCop: body.priceCop || null, durationHours: body.durationHours || null, paymentLink: body.paymentLink || null, sortOrder: body.sortOrder ?? 0 }).where(eq(courses.id, body.id)).returning();
  revalidatePath("/academia"); revalidatePath("/admin/courses");
  return NextResponse.json(result[0]);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await db.delete(courses).where(eq(courses.id, id));
  revalidatePath("/academia"); revalidatePath("/admin/courses");
  return NextResponse.json({ ok: true });
}
