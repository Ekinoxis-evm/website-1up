import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { verifyPassTransfer } from "@/lib/passVerifier";
import { revalidatePath } from "next/cache";
import { moveComprobanteToOrder } from "@/lib/blob";
import { getVerifiedWallet } from "@/lib/verifiedWallet";
import { rateLimitByUser, limiters } from "@/lib/rateLimit";
import { canCreateEntryOrder, tournamentEntryFee, paidRegistrationFailureMessage, isValidTreasuryAddress, DEFAULT_ENTRY_METHOD_FLAGS, type ServiceMethodFlags } from "@/lib/tournamentEntry";
import { createCardCheckoutSession, isCardLive } from "@/lib/payments/stripe";
import { sendTournamentRegistrationEmail, sendTournamentEntryTokenAdminEmail, sendTournamentEntryBankEmails } from "@/lib/email";
import { buildGoogleCalendarUrl } from "@/lib/calendar";

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

function revalidateEntryPaths() {
  revalidatePath("/torneos");
  revalidatePath("/torneos/[slug]", "page");
  revalidatePath("/admin/torneos/[slug]/manage", "page");
}

export async function GET(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("privy_user_id", claims.userId)
    .single();
  if (!profile) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const tournamentId = Number(searchParams.get("tournamentId"));

  let query = supabaseAdmin
    .from("tournament_entry_orders")
    .select("id, tournament_id, payment_method, amount_tokens, amount_cop, status, registration_id, rejection_reason, created_at")
    .eq("user_profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (Number.isFinite(tournamentId) && tournamentId > 0) {
    query = query.eq("tournament_id", tournamentId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Same rationale as pass-orders: the token path triggers on-chain RPC calls.
  const rl = await rateLimitByUser(claims.userId, limiters.authMutate);
  if (!rl.success) return rl.response;

  const body = await req.json();
  const { paymentMethod, txHash, walletAddress: bodyWallet, bankAccountId, comprobantePath } = body as {
    tournamentId?: unknown;
    paymentMethod?: string;
    txHash?: string;
    walletAddress?: string;
    bankAccountId?: number;
    comprobantePath?: string;
  };

  const tournamentId = Number(body?.tournamentId);
  if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
    return NextResponse.json({ error: "tournamentId inválido." }, { status: 400 });
  }
  const method = paymentMethod === "bank" ? "bank"
    : paymentMethod === "cash" ? "cash"
    : paymentMethod === "card" ? "card"
    : "token";

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id, nombre, apellidos, email, onboarding_completed_at")
    .eq("privy_user_id", claims.userId)
    .single();
  if (!profile) return NextResponse.json({ error: "Perfil no encontrado. Completa el onboarding primero." }, { status: 404 });
  if (!profile.onboarding_completed_at) {
    return NextResponse.json(
      { error: "Completa tu registro antes de inscribirte en un torneo.", reason: "onboarding_incomplete" },
      { status: 403 },
    );
  }

  const { data: tournament } = await supabaseAdmin
    .from("tournaments")
    .select("id, name, slug, date, location_type, description, status, is_active, is_registration_open, entry_fee_tokens, entry_fee_cop, treasury_address")
    .eq("id", tournamentId)
    .maybeSingle();

  // Which methods this service accepts is admin-configurable; default to today's
  // live behavior (token + wire) if the config row is somehow absent.
  const { data: cfgRow } = await supabaseAdmin
    .from("service_payment_methods")
    .select("token_enabled, wire_enabled, cash_enabled, card_enabled")
    .eq("service", "tournament_entry")
    .maybeSingle();
  const cfg: ServiceMethodFlags = cfgRow ?? DEFAULT_ENTRY_METHOD_FLAGS;

  const gate = canCreateEntryOrder(tournament, method, cfg, { cardLiveEnv: isCardLive() });
  if (!gate.ok) return NextResponse.json({ error: gate.error, reason: gate.reason }, { status: gate.status });
  const fee = tournamentEntryFee(tournament!)!;

  const { data: existingReg } = await supabaseAdmin
    .from("tournament_registrations")
    .select("id, status")
    .eq("tournament_id", tournamentId)
    .eq("user_profile_id", profile.id)
    .neq("status", "cancelled")
    .maybeSingle();
  if (existingReg) {
    return NextResponse.json({ error: "Ya estás inscrito en este torneo.", reason: "already_registered" }, { status: 409 });
  }

  // Friendly fast-path for the one-in-flight rule; the real guarantee is the
  // partial UNIQUE (tournament_id, user_profile_id) WHERE status IN
  // ('pending_bank','confirmed') — its 23505 is translated below.
  const { data: inFlight } = await supabaseAdmin
    .from("tournament_entry_orders")
    .select("id, status")
    .eq("tournament_id", tournamentId)
    .eq("user_profile_id", profile.id)
    .in("status", ["pending_bank", "confirmed"])
    .maybeSingle();
  if (inFlight) {
    const msg = inFlight.status === "pending_bank"
      ? "Ya tienes un pago en revisión para este torneo. Espera la aprobación del equipo."
      : "Ya tienes un pago confirmado para este torneo.";
    return NextResponse.json({ error: msg, reason: "order_in_flight" }, { status: 409 });
  }

  if (method === "card") {
    return handleCardEntry({
      privyUserId:    claims.userId,
      userProfileId:  profile.id,
      userEmail:      profile.email ?? null,
      tournamentId,
      tournamentName: tournament!.name,
      tournamentSlug: tournament!.slug ?? String(tournamentId),
      amountCop:      fee.cop!,
    });
  }

  if (method === "cash") {
    return handleCashEntry({
      privyUserId:    claims.userId,
      userProfileId:  profile.id,
      userName:       profile.nombre ?? "Jugador",
      userEmail:      profile.email ?? null,
      tournamentId,
      tournamentName: tournament!.name,
      tournamentSlug: tournament!.slug ?? String(tournamentId),
      amountCop:      fee.cop!,
    });
  }

  if (method === "bank") {
    return handleBankEntry({
      privyUserId:   claims.userId,
      userProfileId: profile.id,
      userName:      profile.nombre ?? "Jugador",
      userEmail:     profile.email ?? null,
      tournamentId,
      tournamentName: tournament!.name,
      tournamentSlug: tournament!.slug ?? String(tournamentId),
      amountCop:     fee.cop!,
      bankAccountId,
      comprobantePath,
    });
  }

  // ── Token path ──────────────────────────────────────────────────────
  const walletLookup = await getVerifiedWallet(claims.userId, bodyWallet);
  if (!walletLookup.ok) {
    if (walletLookup.reason === "no_wallet")
      return NextResponse.json({ error: "Tu perfil no tiene wallet asociada. Cierra sesión y vuelve a entrar." }, { status: 400 });
    if (walletLookup.reason === "mismatch")
      return NextResponse.json({ error: "La wallet enviada no coincide con tu wallet verificada." }, { status: 400 });
    return NextResponse.json({ error: "Perfil no encontrado." }, { status: 400 });
  }
  const walletAddress = walletLookup.wallet;

  if (!txHash || !TX_HASH_RE.test(txHash)) {
    return NextResponse.json({ error: "txHash inválido." }, { status: 400 });
  }

  const { data: dupTx } = await supabaseAdmin
    .from("tournament_entry_orders")
    .select("id")
    .ilike("tx_hash", txHash)
    .maybeSingle();
  if (dupTx) {
    return NextResponse.json({ error: "Esta transacción ya fue registrada." }, { status: 409 });
  }

  // Entry fees in $1UP go to the tournament's OWN treasury wallet — never the
  // pass treasury. Fail closed if a paid-token tournament has no treasury set:
  // we must never silently send funds to the wrong address.
  const treasury = tournament!.treasury_address;
  if (!isValidTreasuryAddress(treasury)) {
    return NextResponse.json(
      { error: "Este torneo aún no tiene una tesorería configurada para pagos en $1UP. Contacta al equipo 1UP." },
      { status: 503 },
    );
  }

  const result = await verifyPassTransfer(
    txHash as `0x${string}`,
    walletAddress,
    treasury,
    fee.tokens!,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 422 });
  }

  const { data: order, error: insertErr } = await supabaseAdmin
    .from("tournament_entry_orders")
    .insert({
      tournament_id:   tournamentId,
      user_profile_id: profile.id,
      privy_user_id:   claims.userId,
      payment_method:  "token",
      amount_tokens:   fee.tokens,
      wallet_address:  walletAddress,
      tx_hash:         txHash,
      block_number:    Number(result.blockNumber),
      status:          "confirmed",
    })
    .select()
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      const msg = insertErr.message.includes("tx_hash")
        ? "Esta transacción ya fue registrada."
        : "Ya tienes un pago en curso para este torneo.";
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // The slot is only taken now — capacity enforced atomically by the RPC.
  const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc("register_for_tournament", {
    tour_id:   tournamentId,
    user_pid:  profile.id,
    privy_uid: claims.userId,
  });

  const res = (rpcResult ?? { ok: false }) as { ok: boolean; reason?: string };
  if (rpcError || !res.ok) {
    // The payment is already on-chain and verified — keep the order confirmed
    // (registration_id null) as evidence for the manual refund. No refunds in v1.
    revalidateEntryPaths();
    return NextResponse.json(
      { error: paidRegistrationFailureMessage(res.reason), reason: res.reason ?? "rpc_error", orderId: order.id },
      { status: 409 },
    );
  }

  const { data: registration } = await supabaseAdmin
    .from("tournament_registrations")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("user_profile_id", profile.id)
    .eq("status", "registered")
    .maybeSingle();
  if (registration) {
    await supabaseAdmin
      .from("tournament_entry_orders")
      .update({ registration_id: registration.id, updated_at: new Date().toISOString() })
      .eq("id", order.id);
  }

  revalidateEntryPaths();
  revalidatePath("/admin/tournament-registrations");

  const googleUrl = tournament!.date
    ? buildGoogleCalendarUrl({
        name:        tournament!.name,
        date:        tournament!.date,
        location:    tournament!.location_type === "online" ? "Online" : "1UP Gaming Tower, Colombia",
        description: `Inscripción confirmada — ${tournament!.name}`,
      })
    : "";

  const email = await resolveUserEmail(claims.userId).catch(() => null);
  if (email) {
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://1upesports.org";
    sendTournamentRegistrationEmail({
      userEmail:         email,
      userName:          profile.nombre ?? "Jugador",
      tournamentName:    tournament!.name,
      tournamentDate:    tournament!.date,
      locationType:      tournament!.location_type,
      googleCalendarUrl: googleUrl,
      gameName:          null,
      description:       tournament!.description ?? null,
      prizes:            [],
      tournamentUrl:     `${BASE_URL}/torneos/${tournament!.slug ?? tournamentId}`,
      registrantEmail:   email,
      registrantName:    profile.nombre ?? "Jugador",
    }).catch(() => null);
  }

  // Admin copy: a paid entry was received and verified on-chain.
  sendTournamentEntryTokenAdminEmail({
    userName:       profile.nombre ?? "Jugador",
    userEmail:      email ?? profile.email ?? "—",
    tournamentName: tournament!.name,
    tokenAmount:    fee.tokens!,
    txHash,
  }).catch(() => null);

  return NextResponse.json({ ...order, registration_id: registration?.id ?? null, googleCalendarUrl: googleUrl }, { status: 201 });
}

async function handleBankEntry(opts: {
  privyUserId:    string;
  userProfileId:  number;
  userName:       string;
  userEmail:      string | null;
  tournamentId:   number;
  tournamentName: string;
  tournamentSlug: string;
  amountCop:      number;
  bankAccountId:  number | undefined;
  comprobantePath: string | undefined;
}): Promise<NextResponse> {
  const {
    privyUserId, userProfileId, userName, userEmail,
    tournamentId, tournamentName, tournamentSlug, amountCop, bankAccountId, comprobantePath,
  } = opts;

  if (!bankAccountId) return NextResponse.json({ error: "Cuenta bancaria requerida." }, { status: 400 });
  if (!comprobantePath) return NextResponse.json({ error: "Comprobante requerido." }, { status: 400 });
  if (!comprobantePath.startsWith("pending/"))
    return NextResponse.json({ error: "Ruta de comprobante inválida." }, { status: 400 });

  const { data: bankAccount } = await supabaseAdmin
    .from("bank_accounts")
    .select("id, bank_name")
    .eq("id", bankAccountId)
    .eq("is_active", true)
    .single();
  if (!bankAccount) return NextResponse.json({ error: "Cuenta bancaria no disponible." }, { status: 400 });

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from("tournament_entry_orders")
    .insert({
      tournament_id:   tournamentId,
      user_profile_id: userProfileId,
      privy_user_id:   privyUserId,
      payment_method:  "bank",
      amount_cop:      amountCop,
      bank_account_id: bankAccountId,
      comprobante_url: comprobantePath,
      status:          "pending_bank",
    })
    .select("id")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({ error: "Ya tienes un pago en curso para este torneo." }, { status: 409 });
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const ext = comprobantePath.split(".").pop() || "jpg";
  try {
    const finalUrl = await moveComprobanteToOrder(comprobantePath, inserted.id, ext, privyUserId, "entry-");
    await supabaseAdmin.from("tournament_entry_orders").update({ comprobante_url: finalUrl }).eq("id", inserted.id);
  } catch {
    await supabaseAdmin.from("tournament_entry_orders").update({ status: "cancelled" }).eq("id", inserted.id);
    return NextResponse.json({ error: "Error al guardar el comprobante." }, { status: 502 });
  }

  revalidateEntryPaths();

  if (userEmail) {
    const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "https://admin.1upesports.org";
    sendTournamentEntryBankEmails({
      userEmail,
      userName,
      orderId:        inserted.id,
      tournamentName,
      amountCop,
      bankName:       bankAccount.bank_name,
      manageUrl:      `${ADMIN_URL}/torneos/${tournamentSlug}/manage#pagos`,
    }).catch(() => null);
  }

  return NextResponse.json({ id: inserted.id, status: "pending_bank" }, { status: 201 });
}

// Cash entry: the user commits to paying in person; the order lands pending_bank
// (no comprobante) and an admin confirms receipt at the venue. Mirrors the bank
// path minus the upload — the admin's approval is the attestation.
async function handleCashEntry(opts: {
  privyUserId:    string;
  userProfileId:  number;
  userName:       string;
  userEmail:      string | null;
  tournamentId:   number;
  tournamentName: string;
  tournamentSlug: string;
  amountCop:      number;
}): Promise<NextResponse> {
  const {
    privyUserId, userProfileId, userName, userEmail,
    tournamentId, tournamentName, tournamentSlug, amountCop,
  } = opts;

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from("tournament_entry_orders")
    .insert({
      tournament_id:   tournamentId,
      user_profile_id: userProfileId,
      privy_user_id:   privyUserId,
      payment_method:  "cash",
      amount_cop:      amountCop,
      status:          "pending_bank",
    })
    .select("id")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({ error: "Ya tienes un pago en curso para este torneo." }, { status: 409 });
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  revalidateEntryPaths();

  if (userEmail) {
    const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "https://admin.1upesports.org";
    sendTournamentEntryBankEmails({
      userEmail,
      userName,
      orderId:        inserted.id,
      tournamentName,
      amountCop,
      bankName:       "Pago en efectivo (presencial en 1UP Gaming Tower)",
      manageUrl:      `${ADMIN_URL}/torneos/${tournamentSlug}/manage#pagos`,
    }).catch(() => null);
  }

  return NextResponse.json({ id: inserted.id, status: "pending_bank", paymentMethod: "cash" }, { status: 201 });
}

// Card (Stripe Checkout): create the order pending_bank, then a hosted Checkout
// Session. The webhook (checkout.session.completed) is the source of truth — it
// confirms the order + registers the player. We return the URL to redirect to.
async function handleCardEntry(opts: {
  privyUserId:    string;
  userProfileId:  number;
  userEmail:      string | null;
  tournamentId:   number;
  tournamentName: string;
  tournamentSlug: string;
  amountCop:      number;
}): Promise<NextResponse> {
  const { privyUserId, userProfileId, userEmail, tournamentId, tournamentName, tournamentSlug, amountCop } = opts;

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from("tournament_entry_orders")
    .insert({
      tournament_id:   tournamentId,
      user_profile_id: userProfileId,
      privy_user_id:   privyUserId,
      payment_method:  "card",
      amount_cop:      amountCop,
      status:          "pending_bank",
    })
    .select("id")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({ error: "Ya tienes un pago en curso para este torneo." }, { status: 409 });
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://1upesports.org";
  try {
    const { url } = await createCardCheckoutSession({
      orderKind:     "tournament_entry",
      orderId:       inserted.id,
      amountCop,
      productName:   `Inscripción — ${tournamentName}`,
      customerEmail: userEmail,
      successUrl:    `${BASE_URL}/torneos/${tournamentSlug}?pago=ok`,
      cancelUrl:     `${BASE_URL}/torneos/${tournamentSlug}?pago=cancelado`,
    });
    revalidateEntryPaths();
    return NextResponse.json({ id: inserted.id, checkoutUrl: url, status: "pending_bank", paymentMethod: "card" }, { status: 201 });
  } catch {
    // Couldn't start the session — cancel the dangling order so it doesn't block retries.
    await supabaseAdmin.from("tournament_entry_orders").update({ status: "cancelled" }).eq("id", inserted.id);
    return NextResponse.json({ error: "No se pudo iniciar el pago con tarjeta. Intenta de nuevo." }, { status: 502 });
  }
}
