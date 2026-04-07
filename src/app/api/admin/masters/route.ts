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

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data } = await supabaseAdmin.from("masters").insert({
    name:          body.name,
    specialty:     body.specialty || null,
    bio:           body.bio || null,
    photo_url:     body.photoUrl || null,
    instagram_url: body.instagramUrl || null,
    tiktok_url:    body.tiktokUrl || null,
    twitter_url:   body.twitterUrl || null,
    youtube_url:   body.youtubeUrl || null,
    linkedin_url:  body.linkedinUrl || null,
    topics:        body.topics ?? [],
    sort_order:    body.sortOrder ?? 0,
    is_active:     body.isActive ?? true,
  }).select().single();
  revalidatePath("/masters"); revalidatePath("/academia"); revalidatePath("/admin/masters");
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data } = await supabaseAdmin.from("masters").update({
    name:          body.name,
    specialty:     body.specialty || null,
    bio:           body.bio || null,
    photo_url:     body.photoUrl || null,
    instagram_url: body.instagramUrl || null,
    tiktok_url:    body.tiktokUrl || null,
    twitter_url:   body.twitterUrl || null,
    youtube_url:   body.youtubeUrl || null,
    linkedin_url:  body.linkedinUrl || null,
    topics:        body.topics ?? [],
    sort_order:    body.sortOrder ?? 0,
    is_active:     body.isActive ?? true,
  }).eq("id", body.id).select().single();
  revalidatePath("/masters"); revalidatePath("/academia"); revalidatePath("/admin/masters");
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await supabaseAdmin.from("masters").delete().eq("id", id);
  revalidatePath("/masters"); revalidatePath("/academia"); revalidatePath("/admin/masters");
  return NextResponse.json({ ok: true });
}
