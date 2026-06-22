import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { validatePrizes, type PrizeRow } from "@/lib/tournamentPrizes";
import { parseEntryFeeInput } from "@/lib/tournamentEntry";

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

// GET is public by design (CLAUDE.md) — but must return active tournaments only.
// Without the is_active filter this leaks unpublished/draft tournaments and their
// prize structures to any unauthenticated caller.
export async function GET() {
  const { data } = await supabaseAdmin
    .from("tournaments")
    .select("*, games(id, name), tournament_prizes(*)")
    .eq("is_active", true)
    .order("sort_order")
    .order("date", { ascending: true });
  return NextResponse.json(data ?? []);
}

async function savePrizes(tournamentId: number, prizes: PrizeRow[]) {
  await supabaseAdmin.from("tournament_prizes").delete().eq("tournament_id", tournamentId);
  if (!prizes?.length) return;
  await supabaseAdmin.from("tournament_prizes").insert(
    prizes.map((p) => {
      // For prize_type='pass', includes_pass is implicit. For tokens/cop/both,
      // it's an optional add-on the admin opted into.
      const isPassOnly  = p.prizeType === "pass";
      const includesPass = isPassOnly || !!p.includesPass;
      const passDaysNum  = includesPass && p.passDays != null && p.passDays !== ""
        ? Number(p.passDays)
        : null;
      return {
        tournament_id: tournamentId,
        position:      p.position,
        prize_type:    p.prizeType as "tokens" | "cop" | "both" | "pass",
        amount_tokens: !isPassOnly && (p.prizeType === "tokens" || p.prizeType === "both") && p.amountTokens
          ? parseFloat(p.amountTokens) : null,
        amount_cop:    !isPassOnly && (p.prizeType === "cop" || p.prizeType === "both") && p.amountCop
          ? parseInt(p.amountCop) : null,
        includes_pass: includesPass,
        pass_days:     passDaysNum,
        reward_text:      p.rewardText && p.rewardText.trim() ? p.rewardText.trim() : null,
        reward_image_url: p.rewardImageUrl && p.rewardImageUrl.trim() ? p.rewardImageUrl.trim() : null,
      };
    })
  );
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "name requerido" }, { status: 400 });
  const prizeError = validatePrizes(body.prizes);
  if (prizeError) return NextResponse.json({ error: prizeError }, { status: 400 });
  const feeParse = parseEntryFeeInput(body.entryFeeTokens, body.entryFeeCop, body.treasuryAddress);
  if (!feeParse.ok) return NextResponse.json({ error: feeParse.error }, { status: 400 });
  const baseSlug = slugify(body.name);
  // Ensure uniqueness: append random 4-char suffix if slug already exists
  let slug = baseSlug;
  const { count } = await supabaseAdmin.from("tournaments").select("id", { count: "exact", head: true }).eq("slug", baseSlug);
  if (count && count > 0) slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

  // Status is derived from the bracket lifecycle — every new tournament starts
  // as `upcoming` and only transitions via the bracket: `Iniciar Torneo` → live,
  // last winner → completed. The editor never sets status directly.
  const { data, error } = await supabaseAdmin.from("tournaments").insert({
    name:                 body.name,
    slug,
    game_id:              body.gameId || null,
    date:                 body.date || null,
    prize_pool_cop:       null,
    max_participants:     body.maxParticipants ? parseInt(body.maxParticipants) : null,
    status:               "upcoming",
    location_type:        body.locationType ?? "presencial",
    image_url:            body.imageUrl || null,
    description:          body.description || null,
    is_active:            body.isActive ?? true,
    is_registration_open: body.isRegistrationOpen ?? false,
    sort_order:           body.sortOrder ?? 0,
    sponsor_name:         body.sponsorName || null,
    sponsor_website_url:  body.sponsorWebsiteUrl || null,
    sponsor_logo_url:     body.sponsorLogoUrl || null,
    sponsor_logo_bg:      body.sponsorLogoBg || null,
    entry_fee_tokens:     feeParse.tokens,
    entry_fee_cop:        feeParse.cop,
    treasury_address:     feeParse.treasury,
    bank_account_id:      body.bankAccountId != null ? Number(body.bankAccountId) : null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (body.prizes?.length) await savePrizes(data.id, body.prizes);
  revalidatePath("/torneos");
  revalidatePath("/torneos/[slug]", "page");
  revalidatePath("/admin/torneos");
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  // Soft-cancel path — extends regular updates with bulk-cancellation of active registrations.
  const isCancelling = body.cancelTournament === true;

  // Fee fields follow the sponsor pattern: only written when present in the
  // body, so the cancel path (which omits them) never wipes a configured fee.
  const hasFeeInput = body.entryFeeTokens !== undefined || body.entryFeeCop !== undefined || body.treasuryAddress !== undefined;
  let feeParse: ReturnType<typeof parseEntryFeeInput> = { ok: true, tokens: null, cop: null, treasury: null };

  if (!isCancelling) {
    const prizeError = validatePrizes(body.prizes);
    if (prizeError) return NextResponse.json({ error: prizeError }, { status: 400 });
    if (hasFeeInput) {
      feeParse = parseEntryFeeInput(body.entryFeeTokens, body.entryFeeCop, body.treasuryAddress);
      if (!feeParse.ok) return NextResponse.json({ error: feeParse.error }, { status: 400 });
    }
  }

  // Re-slugify when name changes; keep existing slug otherwise
  const { data: existing } = await supabaseAdmin.from("tournaments").select("name, slug").eq("id", body.id).single();
  let updatedSlug: string | undefined;
  if (body.name && existing && body.name !== existing.name) {
    const baseSlug = slugify(body.name);
    const { count } = await supabaseAdmin.from("tournaments").select("id", { count: "exact", head: true }).eq("slug", baseSlug).neq("id", body.id);
    updatedSlug = (count && count > 0) ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}` : baseSlug;
  }

  // Status is owned by the bracket lifecycle, not the editor — read the current
  // value so we can preserve it on update. The editor only changes metadata
  // (name, prizes, sponsor, dates) and registration on `upcoming` tournaments.
  const { data: current } = await supabaseAdmin
    .from("tournaments").select("status").eq("id", body.id).single();
  const currentStatus = (current?.status ?? "upcoming") as "upcoming" | "live" | "completed";

  // Registration can only be opened while the tournament is still `upcoming`.
  // Anything later (live/completed) forces the flag closed regardless of the body.
  const registrationOpen = isCancelling
    ? false
    : (currentStatus === "upcoming" ? !!body.isRegistrationOpen : false);

  const { data, error } = await supabaseAdmin.from("tournaments").update({
    name:                 body.name,
    ...(updatedSlug ? { slug: updatedSlug } : {}),
    game_id:              body.gameId || null,
    date:                 body.date || null,
    prize_pool_cop:       null,
    max_participants:     body.maxParticipants ? parseInt(body.maxParticipants) : null,
    // Status is owned by /api/admin/brackets — the only exception is the explicit
    // "Cancelar Torneo" action, which is a sanctioned admin-controlled end-of-life.
    ...(isCancelling ? { status: "completed" as const } : {}),
    location_type:        body.locationType,
    image_url:            body.imageUrl || null,
    description:          body.description || null,
    is_active:            body.isActive,
    is_registration_open: registrationOpen,
    sort_order:           body.sortOrder ?? 0,
    sponsor_name:         body.sponsorName !== undefined ? (body.sponsorName || null) : undefined,
    sponsor_website_url:  body.sponsorWebsiteUrl !== undefined ? (body.sponsorWebsiteUrl || null) : undefined,
    sponsor_logo_url:     body.sponsorLogoUrl !== undefined ? (body.sponsorLogoUrl || null) : undefined,
    sponsor_logo_bg:      body.sponsorLogoBg !== undefined ? (body.sponsorLogoBg || null) : undefined,
    bank_account_id:      body.bankAccountId !== undefined ? (body.bankAccountId != null ? Number(body.bankAccountId) : null) : undefined,
    ...(!isCancelling && hasFeeInput && feeParse.ok
      ? { entry_fee_tokens: feeParse.tokens, entry_fee_cop: feeParse.cop, treasury_address: feeParse.treasury }
      : {}),
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
  revalidatePath("/torneos/[slug]", "page");
  revalidatePath("/admin/torneos");
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await supabaseAdmin.from("tournaments").delete().eq("id", id);
  revalidatePath("/torneos");
  revalidatePath("/torneos/[slug]", "page");
  revalidatePath("/admin/torneos");
  return NextResponse.json({ ok: true });
}
