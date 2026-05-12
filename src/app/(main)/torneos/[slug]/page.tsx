import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PrizePodium } from "@/components/torneos/PrizeBadge";
import { RegisterButton } from "@/components/torneos/RegisterButton";
import type { Tournament, TournamentPrize, Game } from "@/types/database.types";

type TournamentFull = Tournament & {
  games:             Pick<Game, "id" | "name"> | null;
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
  // Primary: look up by slug
  const { data: bySlug } = await supabase
    .from("tournaments")
    .select("*, games(id, name), tournament_prizes(*)")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (bySlug) return bySlug as TournamentFull;

  // Fallback: numeric ID (supports old QR codes / bookmarks)
  const numericId = Number(slug);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;
  const { data: byId } = await supabase
    .from("tournaments")
    .select("*, games(id, name), tournament_prizes(*)")
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

export default async function TournamentDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const t = await fetchTournament(slug);
  if (!t) notFound();

  const prizes = [...(t.tournament_prizes ?? [])].sort((a, b) => a.position - b.position);

  return (
    <section className="py-12 px-8 md:px-16 bg-background min-h-screen">
      <div className="max-w-4xl">
        <Link
          href="/torneos"
          className="inline-flex items-center gap-1 font-headline font-bold text-xs uppercase tracking-widest text-outline hover:text-primary-container transition-colors mb-8"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          VOLVER A TORNEOS
        </Link>

        <div className="bg-surface-container">
          <div className="relative aspect-video bg-surface-container-high overflow-hidden">
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
          </div>

          <div className="p-8 md:p-10 space-y-8">
            <div className="flex flex-wrap gap-2">
              <span className={`font-headline font-black text-[10px] uppercase tracking-widest px-2 py-1 ${STATUS_BADGE[t.status]}`}>
                {STATUS_LABEL[t.status]}
              </span>
              <span className="font-headline font-black text-[10px] uppercase tracking-widest px-2 py-1 bg-surface-container-high text-outline">
                {LOC_LABEL[t.location_type]}
              </span>
              {t.games && (
                <span className="font-headline font-black text-[10px] uppercase tracking-widest px-2 py-1 bg-surface-container-high text-secondary">
                  {t.games.name}
                </span>
              )}
            </div>

            <div>
              <h1 className="font-headline font-black text-4xl md:text-5xl uppercase tracking-tighter leading-tight text-on-surface">
                {t.name}
              </h1>
              <div className="h-1 w-20 bg-primary-container mt-3" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {t.date && (
                <div>
                  <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Fecha</p>
                  <p className="font-body text-sm text-on-surface">
                    {new Date(t.date).toLocaleDateString("es-CO", {
                      weekday: "long", day: "2-digit", month: "long", year: "numeric",
                      timeZone: "America/Bogota",
                    })}
                  </p>
                  <p className="font-body text-sm text-on-surface/60">
                    {new Date(t.date).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" })}
                  </p>
                </div>
              )}
              {t.max_participants && (
                <div>
                  <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Cupos</p>
                  <p className="font-body text-sm text-on-surface">Máximo {t.max_participants} participantes</p>
                </div>
              )}
            </div>

            {t.description && (
              <div>
                <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-2">Sobre el torneo</p>
                <p className="font-body text-sm text-on-surface/80 leading-relaxed whitespace-pre-line">{t.description}</p>
              </div>
            )}

            {prizes.length > 0 && (
              <div>
                <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-3">Premios</p>
                <PrizePodium prizes={prizes} />
              </div>
            )}

            {/* Sponsor block */}
            {t.sponsor_name && (
              <div className="bg-surface-container-low p-5 flex items-center gap-4">
                {t.sponsor_logo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.sponsor_logo_url} alt={t.sponsor_name} className="h-10 w-auto object-contain shrink-0" />
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
            )}

            {t.is_registration_open && t.status !== "completed" && (
              <div className="pt-2">
                <RegisterButton
                  tournamentId={t.id}
                  tournamentName={t.name}
                  tournamentDate={t.date}
                  locationType={t.location_type}
                  isRegistered={false}
                />
              </div>
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
      </div>
    </section>
  );
}
