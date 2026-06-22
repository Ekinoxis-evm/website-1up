import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { PrizePodium } from "@/components/torneos/PrizeBadge";
import { RegisterButton } from "@/components/torneos/RegisterButton";
import { TournamentBracketView } from "@/components/torneos/TournamentBracketView";
import type { Tournament, TournamentPrize, Game, GameCategory, Bracket, BracketParticipant, BracketMatch } from "@/types/database.types";

type TournamentFull = Tournament & {
  games: (Pick<Game, "id" | "name" | "category_id"> & {
    game_categories: Pick<GameCategory, "id" | "name" | "slug"> | null;
  }) | null;
  tournament_prizes: TournamentPrize[];
};

const LOC_LABEL: Record<Tournament["location_type"], string> = {
  presencial: "Presencial",
  online:     "Online",
  mixto:      "Mixto",
};

const STATUS_LABEL: Record<Tournament["status"], string> = {
  upcoming:  "Próximo",
  live:      "En vivo",
  completed: "Finalizado",
};

const STATUS_BADGE: Record<Tournament["status"], string> = {
  upcoming:  "bg-secondary text-background",
  live:      "bg-primary text-background animate-pulse",
  completed: "bg-surface-container-high text-outline",
};

async function fetchTournament(slug: string): Promise<TournamentFull | null> {
  const { data: bySlug } = await supabase
    .from("tournaments")
    .select("*, games(id, name, category_id, game_categories(id, name, slug)), tournament_prizes(*)")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (bySlug) return bySlug as TournamentFull;

  const numericId = Number(slug);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;
  const { data: byId } = await supabase
    .from("tournaments")
    .select("*, games(id, name, category_id, game_categories(id, name, slug)), tournament_prizes(*)")
    .eq("id", numericId)
    .eq("is_active", true)
    .maybeSingle();
  return (byId as TournamentFull | null) ?? null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const t = await fetchTournament(slug);
  if (!t) return { title: "Torneo no encontrado — 1UP Gaming Tower" };
  const canonical = `https://1upesports.org/torneos/${t.slug ?? t.id}`;
  return {
    title:       `${t.name} — Torneos 1UP`,
    description: t.description ?? "Detalles del torneo en el ecosistema 1UP Gaming Tower.",
    openGraph: {
      title:       `${t.name} — Torneos 1UP`,
      description: t.description ?? "Detalles del torneo en el ecosistema 1UP Gaming Tower.",
      url:         canonical,
      type:        "website",
      images:      t.image_url ? [{ url: t.image_url }] : [{ url: "/1up.png" }],
    },
    alternates: { canonical },
  };
}

// Participants come back with `user_profiles` joined (for avatars on the
// match card), which the Supabase-generated Row type doesn't know about —
// `BracketParticipantWithProfile` is the narrowed shape `TournamentBracketView`
// expects via its `BracketData` prop.
type BracketParticipantWithProfile = BracketParticipant & {
  user_profiles: {
    avatar_url: string | null;
    username:   string | null;
    nombre:     string | null;
    apellidos:  string | null;
  } | null;
};

async function fetchBracket(tournamentId: number): Promise<{
  bracket: Bracket;
  participants: BracketParticipantWithProfile[];
  matches: BracketMatch[];
} | null> {
  // Drafts stay private — only show the bracket once the tournament has started.
  const { data: bracket } = await supabase
    .from("brackets")
    .select("*")
    .eq("tournament_id", tournamentId)
    .in("status", ["in_progress", "completed"])
    .maybeSingle();
  if (!bracket) return null;

  const [{ data: participants }, { data: matches }] = await Promise.all([
    // Avatar + username come through here so the bracket's custom matchComponent
    // can render each participant with their profile picture.
    supabase.from("bracket_participants")
      .select("*, user_profiles(avatar_url, username, nombre, apellidos)")
      .eq("bracket_id", bracket.id).order("seed"),
    supabase.from("bracket_matches").select("*").eq("bracket_id", bracket.id)
      .order("bracket_side").order("round").order("match_number"),
  ]);

  return {
    bracket,
    // Cast — the join exists at runtime; the generated Row type doesn't model relations.
    participants: (participants ?? []) as unknown as BracketParticipantWithProfile[],
    matches:      matches ?? [],
  };
}

// ISR: bracket state + registration counts. Admin bracket-action mutations
// call `revalidatePath("/torneos/[slug]", "page")`, so 60s is just a floor.
export const revalidate = 60;

export default async function TournamentDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const t = await fetchTournament(slug);
  if (!t) notFound();

  const prizes = [...(t.tournament_prizes ?? [])].sort((a, b) => a.position - b.position);
  const bracketData = await fetchBracket(t.id);

  // Cash entry is offered only when the admin enabled it for tournament entry
  // AND the tournament has a COP fee (cash is collected in pesos at the venue).
  // service_payment_methods is service-role only (RLS denies anon) — read it with
  // the admin client (safe: this is a Server Component).
  const { data: methodCfg } = await supabaseAdmin
    .from("service_payment_methods")
    .select("cash_enabled, card_enabled")
    .eq("service", "tournament_entry")
    .maybeSingle();
  const cashEnabled = !!methodCfg?.cash_enabled && (t.entry_fee_cop ?? 0) > 0;
  // Card (Stripe Checkout) needs a COP fee, the admin toggle, AND the live flag.
  // The server enforces all three — this mirrors it so the option only shows when
  // a POST would actually succeed.
  const cardEnabled = !!methodCfg?.card_enabled && (t.entry_fee_cop ?? 0) > 0 && process.env.PAYMENTS_CARD_LIVE === "true";

  // When the tournament has a designated bank account, the entry server uses it
  // (the body's bankAccountId is ignored). Resolve its public-safe details here
  // so the wizard shows that account instead of a picker. Masked number only —
  // the wizard fetches the full record on demand via /api/bank-accounts/[id].
  let designatedBank: { id: number; bankName: string; accountNumberMasked: string | null } | null = null;
  if (t.bank_account_id) {
    const { data: bank } = await supabaseAdmin
      .from("bank_accounts")
      .select("id, bank_name, account_number")
      .eq("id", t.bank_account_id)
      .eq("is_active", true)
      .maybeSingle();
    if (bank) {
      designatedBank = {
        id:                  bank.id,
        bankName:            bank.bank_name,
        accountNumberMasked: bank.account_number ? `••• ${bank.account_number.slice(-4)}` : null,
      };
    }
  }

  const dateLong = t.date
    ? new Date(t.date).toLocaleDateString("es-CO", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "America/Bogota",
      })
    : null;
  const dateTime = t.date
    ? new Date(t.date).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" })
    : null;

  return (
    <div className="bg-background min-h-screen pb-20">
      {/* Back link */}
      <div className="px-8 md:px-16 pt-8">
        <Link
          href="/torneos"
          className="inline-flex items-center gap-1 font-headline font-bold text-xs uppercase tracking-widest text-outline hover:text-primary-container transition-colors"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Volver a torneos
        </Link>
      </div>

      {/* Hero — cover image + key info side by side */}
      <section className="px-8 md:px-16 pt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <div className="relative aspect-video bg-surface-container overflow-hidden">
            {t.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-8xl text-outline/20" style={{ fontVariationSettings: "'FILL' 1" }}>
                  emoji_events
                </span>
              </div>
            )}
            <span className={`absolute top-4 left-4 font-headline font-black text-[10px] uppercase tracking-widest px-3 py-1 ${STATUS_BADGE[t.status]}`}>
              {STATUS_LABEL[t.status]}
            </span>
          </div>
        </div>

        {/* Info card */}
        <div className="lg:col-span-2 bg-surface-container p-6 flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            <span className="font-headline font-black text-[10px] uppercase tracking-widest px-2 py-1 bg-surface-container-high text-outline">
              {LOC_LABEL[t.location_type]}
            </span>
            {t.games && (
              <span className="font-headline font-black text-[10px] uppercase tracking-widest px-2 py-1 bg-surface-container-high text-secondary">
                {t.games.name}
              </span>
            )}
            {t.games?.game_categories && (
              <span className="font-headline font-black text-[10px] uppercase tracking-widest px-2 py-1 bg-surface-container text-on-surface-variant">
                {t.games.game_categories.name}
              </span>
            )}
          </div>

          <div>
            <h1 className="font-headline font-black text-3xl md:text-4xl uppercase tracking-tighter leading-none text-on-surface">
              {t.name}
            </h1>
            <div className="h-1 w-20 bg-primary-container mt-3" />
          </div>

          <div className="grid grid-cols-2 gap-px bg-outline-variant">
            <div className="bg-surface px-3 py-3">
              <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-1">Fecha</p>
              <p className="font-body text-sm text-on-surface capitalize">{dateLong ?? "Por confirmar"}</p>
              {dateTime && <p className="font-body text-xs text-outline mt-0.5">{dateTime}</p>}
            </div>
            <div className="bg-surface px-3 py-3">
              <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-1">Cupos</p>
              <p className="font-body text-sm text-on-surface">
                {t.max_participants ? `Máximo ${t.max_participants}` : "Sin límite definido"}
              </p>
            </div>
            {((t.entry_fee_tokens ?? 0) > 0 || (t.entry_fee_cop ?? 0) > 0) && (
              <div className="bg-surface px-3 py-3 col-span-2">
                <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-1">Inscripción</p>
                <p className="font-body text-sm text-on-surface">
                  {[
                    (t.entry_fee_tokens ?? 0) > 0 ? `${Number(t.entry_fee_tokens).toLocaleString("es-CO")} $1UP` : null,
                    (t.entry_fee_cop ?? 0) > 0 ? `$${Number(t.entry_fee_cop).toLocaleString("es-CO")} COP` : null,
                  ].filter(Boolean).join(" · ")}
                </p>
                <p className="font-body text-xs text-outline mt-0.5">El cupo se asigna al confirmarse el pago.</p>
              </div>
            )}
          </div>

          <div className="mt-auto">
            {t.is_registration_open && t.status !== "completed" && (
              <RegisterButton
                tournamentId={t.id}
                tournamentName={t.name}
                tournamentDate={t.date}
                locationType={t.location_type}
                isRegistered={false}
                entryFeeTokens={t.entry_fee_tokens}
                entryFeeCop={t.entry_fee_cop}
                treasuryAddress={t.treasury_address}
                cashEnabled={cashEnabled}
                cardEnabled={cardEnabled}
                designatedBank={designatedBank}
              />
            )}
            {!t.is_registration_open && t.status !== "completed" && (
              <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline/40">
                Registro próximamente
              </p>
            )}
            {t.status === "completed" && (
              <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline/40">
                Torneo finalizado
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Description */}
      {t.description && (
        <section className="px-8 md:px-16 pt-10">
          <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-3">Sobre el torneo</p>
          <p className="font-body text-sm md:text-base text-on-surface/80 leading-relaxed whitespace-pre-line max-w-3xl">
            {t.description}
          </p>
        </section>
      )}

      {/* Prizes */}
      {prizes.length > 0 && (
        <section className="px-8 md:px-16 pt-10">
          <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-4">Premios</p>
          <PrizePodium prizes={prizes} />
        </section>
      )}

      {/* Sponsor */}
      {t.sponsor_name && (
        <section className="px-8 md:px-16 pt-10">
          <div className="bg-surface-container p-5 flex items-center gap-4 max-w-md">
            {t.sponsor_logo_url && (
              <div className={`h-16 w-16 shrink-0 rounded-full overflow-hidden flex items-center justify-center ${
                t.sponsor_logo_bg === "white" ? "bg-white"
                  : t.sponsor_logo_bg === "black" ? "bg-black"
                  : ""
              }`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.sponsor_logo_url} alt={t.sponsor_name} className="h-full w-full object-contain p-2" />
              </div>
            )}
            <div>
              <p className="font-headline text-[10px] uppercase tracking-widest text-outline mb-0.5">Patrocinador</p>
              {t.sponsor_website_url ? (
                <a href={t.sponsor_website_url} target="_blank" rel="noopener noreferrer"
                  className="font-headline font-black text-sm text-primary-container hover:underline">
                  {t.sponsor_name}
                </a>
              ) : (
                <p className="font-headline font-black text-sm text-on-surface">{t.sponsor_name}</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Bracket */}
      {bracketData && (
        <section className="px-8 md:px-16 pt-12">
          <div className="flex items-center gap-3 mb-4">
            <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline">Bracket</p>
            <span className={`font-headline font-black text-[10px] uppercase tracking-widest px-2 py-0.5 ${
              bracketData.bracket.status === "completed"
                ? "bg-surface-container-high text-outline"
                : "bg-primary text-background animate-pulse"
            }`}>
              {bracketData.bracket.status === "completed" ? "Finalizado" : "En vivo"}
            </span>
          </div>
          <div className="bg-surface-container p-4 md:p-6">
            <TournamentBracketView data={bracketData} />
          </div>
        </section>
      )}
    </div>
  );
}
