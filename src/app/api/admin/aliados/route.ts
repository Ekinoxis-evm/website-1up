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

export async function GET(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabaseAdmin.from("aliados").select("*").order("sort_order").order("name");
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data } = await supabaseAdmin.from("aliados").insert({
    name:            body.name,
    nit:             body.nit       || null,
    email:           body.email     || null,
    api_url:         body.apiUrl    || null,
    api_key:         body.apiKey    || null,
    logo_url:        body.logoUrl   || null,
    website_url:     body.websiteUrl || null,
    sort_order:      body.sortOrder ?? 0,
    show_in_banner:  body.showInBanner ?? false,
    is_active:       body.isActive  ?? true,
  }).select().single();
  revalidatePath("/");
  revalidatePath("/admin/aliados");
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data } = await supabaseAdmin.from("aliados").update({
    name:            body.name,
    nit:             body.nit       || null,
    email:           body.email     || null,
    api_url:         body.apiUrl    || null,
    api_key:         body.apiKey    || null,
    logo_url:        body.logoUrl   || null,
    website_url:     body.websiteUrl || null,
    sort_order:      body.sortOrder ?? 0,
    show_in_banner:  body.showInBanner ?? false,
    is_active:       body.isActive  ?? true,
  }).eq("id", body.id).select().single();
  revalidatePath("/");
  revalidatePath("/admin/aliados");
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await supabaseAdmin.from("aliados").delete().eq("id", id);
  revalidatePath("/");
  revalidatePath("/admin/aliados");
  return NextResponse.json({ ok: true });
}
