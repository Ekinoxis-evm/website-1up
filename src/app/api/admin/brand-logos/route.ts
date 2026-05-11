import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

export async function GET() {
  const { data } = await supabaseAdmin
    .from("brand_logos")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.name || !body.logoUrl) return NextResponse.json({ error: "name y logoUrl requeridos" }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("brand_logos").insert({
    name:        body.name,
    logo_url:    body.logoUrl,
    website_url: body.websiteUrl || null,
    sort_order:  body.sortOrder ?? 0,
    is_active:   body.isActive ?? true,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/");
  revalidatePath("/admin/brand-logos");
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data } = await supabaseAdmin.from("brand_logos").update({
    name:        body.name,
    logo_url:    body.logoUrl,
    website_url: body.websiteUrl || null,
    sort_order:  body.sortOrder ?? 0,
    is_active:   body.isActive ?? true,
  }).eq("id", body.id).select().single();
  revalidatePath("/");
  revalidatePath("/admin/brand-logos");
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await supabaseAdmin.from("brand_logos").delete().eq("id", id);
  revalidatePath("/");
  revalidatePath("/admin/brand-logos");
  return NextResponse.json({ ok: true });
}
