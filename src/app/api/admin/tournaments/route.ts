import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

export async function GET() {
  const { data } = await supabaseAdmin
    .from("tournaments")
    .select("*, games(id, name), tournament_prizes(*)")
    .order("sort_order")
    .order("date", { ascending: true });
  return NextResponse.json(data ?? []);
}

type PrizeRow = { position: number; prizeType: string; amountTokens: string; amountCop: string };

async function savePrizes(tournamentId: number, prizes: PrizeRow[]) {
  await supabaseAdmin.from("tournament_prizes").delete().eq("tournament_id", tournamentId);
  if (!prizes?.length) return;
  await supabaseAdmin.from("tournament_prizes").insert(
    prizes.map((p) => ({
      tournament_id: tournamentId,
      position:      p.position,
      prize_type:    p.prizeType as "tokens" | "cop" | "both",
      amount_tokens: (p.prizeType === "tokens" || p.prizeType === "both") && p.amountTokens
        ? parseFloat(p.amountTokens) : null,
      amount_cop:    (p.prizeType === "cop" || p.prizeType === "both") && p.amountCop
        ? parseInt(p.amountCop) : null,
    }))
  );
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "name requerido" }, { status: 400 });
  const baseSlug = slugify(body.name);
  // Ensure uniqueness: append random 4-char suffix if slug already exists
  let slug = baseSlug;
  const { count } = await supabaseAdmin.from("tournaments").select("id", { count: "exact", head: true }).eq("slug", baseSlug);
  if (count && count > 0) slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

  const { data, error } = await supabaseAdmin.from("tournaments").insert({
    name:                 body.name,
    slug,
    game_id:              body.gameId || null,
    date:                 body.date || null,
    prize_pool_cop:       null,
    max_participants:     body.maxParticipants ? parseInt(body.maxParticipants) : null,
    status:               body.status ?? "upcoming",
    location_type:        body.locationType ?? "presencial",
    image_url:            body.imageUrl || null,
    description:          body.description || null,
    is_active:            body.isActive ?? true,
    is_registration_open: body.isRegistrationOpen ?? false,
    sort_order:           body.sortOrder ?? 0,
    sponsor_name:         body.sponsorName || null,
    sponsor_website_url:  body.sponsorWebsiteUrl || null,
    sponsor_logo_url:     body.sponsorLogoUrl || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (body.prizes?.length) await savePrizes(data.id, body.prizes);
  revalidatePath("/torneos");
  revalidatePath("/admin/torneos");
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  // Soft-cancel path — extends regular updates with bulk-cancellation of active registrations.
  const isCancelling = body.cancelTournament === true;

  // Re-slugify when name changes; keep existing slug otherwise
  const { data: existing } = await supabaseAdmin.from("tournaments").select("name, slug").eq("id", body.id).single();
  let updatedSlug: string | undefined;
  if (body.name && existing && body.name !== existing.name) {
    const baseSlug = slugify(body.name);
    const { count } = await supabaseAdmin.from("tournaments").select("id", { count: "exact", head: true }).eq("slug", baseSlug).neq("id", body.id);
    updatedSlug = (count && count > 0) ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}` : baseSlug;
  }

  const { data, error } = await supabaseAdmin.from("tournaments").update({
    name:                 body.name,
    ...(updatedSlug ? { slug: updatedSlug } : {}),
    game_id:              body.gameId || null,
    date:                 body.date || null,
    prize_pool_cop:       null,
    max_participants:     body.maxParticipants ? parseInt(body.maxParticipants) : null,
    status:               body.status,
    location_type:        body.locationType,
    image_url:            body.imageUrl || null,
    description:          body.description || null,
    is_active:            body.isActive,
    is_registration_open: isCancelling ? false : body.isRegistrationOpen,
    sort_order:           body.sortOrder ?? 0,
    sponsor_name:         body.sponsorName !== undefined ? (body.sponsorName || null) : undefined,
    sponsor_website_url:  body.sponsorWebsiteUrl !== undefined ? (body.sponsorWebsiteUrl || null) : undefined,
    sponsor_logo_url:     body.sponsorLogoUrl !== undefined ? (body.sponsorLogoUrl || null) : undefined,
  }).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!isCancelling) await savePrizes(body.id, body.prizes ?? []);

  if (isCancelling) {
    await supabaseAdmin
      .from("tournament_registrations")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("tournament_id", body.id)
      .eq("status", "registered");
  }

  revalidatePath("/torneos");
  revalidatePath("/admin/torneos");
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await supabaseAdmin.from("tournaments").delete().eq("id", id);
  revalidatePath("/torneos");
  revalidatePath("/admin/torneos");
  return NextResponse.json({ ok: true });
}
