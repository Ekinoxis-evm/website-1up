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

async function fetchTournament(id: string): Promise<TournamentFull | null> {
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;
  const { data } = await supabase
    .from("tournaments")
    .select("*, games(id, name), tournament_prizes(*)")
    .eq("id", numericId)
    .eq("is_active", true)
    .maybeSingle();
  return (data as TournamentFull | null) ?? null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const t = await fetchTournament(id);
  if (!t) return { title: "Torneo no encontrado — 1UP Gaming Tower" };
  return {
    title:       `${t.name} — Torneos 1UP`,
    description: t.description ?? "Detalles del torneo en el ecosistema 1UP Gaming Tower.",
    openGraph: {
      title:       `${t.name} — Torneos 1UP`,
      description: t.description ?? "Detalles del torneo en el ecosistema 1UP Gaming Tower.",
      url:         `https://1upesports.org/torneos/${t.id}`,
      type:        "website",
      images:      t.image_url ? [{ url: t.image_url }] : [{ url: "/1up.png" }],
    },
    alternates: { canonical: `https://1upesports.org/torneos/${t.id}` },
  };
}

export default async function TournamentDetailPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const t = await fetchTournament(id);
  if (!t) notFound();

  const prizes = [...(t.tournament_prizes ?? [])].sort((a, b) => a.position - b.position);

  return (
    <section className="py-12 px-8 md:px-16 bg-background min-h-screen">
      <div className="max-w-4xl">
        {/* Back link */}
        <Link
          href="/torneos"
          className="inline-flex items-center gap-1 font-headline font-bold text-xs uppercase tracking-widest text-outline hover:text-primary-container transition-colors mb-8"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          VOLVER A TORNEOS
        </Link>

        <div className="bg-surface-container">
          {/* Cover */}
          <div className="relative aspect-video bg-surface-container-high overflow-hidden">
            {t.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-8xl text-outline/20"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  emoji_events
                </span>
              </div>
            )}
          </div>

          <div className="p-8 md:p-10 space-y-8">
            {/* Meta row */}
            <div className="flex flex-wrap gap-2">
              <span
                className={`font-headline font-black text-[10px] uppercase tracking-widest px-2 py-1 ${STATUS_BADGE[t.status]}`}
              >
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

            {/* Title */}
            <div>
              <h1 className="font-headline font-black text-4xl md:text-5xl uppercase tracking-tighter leading-tight text-on-surface">
                {t.name}
              </h1>
              <div className="h-1 w-20 bg-primary-container mt-3" />
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {t.date && (
                <div>
                  <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Fecha</p>
                  <p className="font-body text-sm text-on-surface">
                    {new Date(t.date).toLocaleDateString("es-CO", {
                      weekday: "long",
                      day:     "2-digit",
                      month:   "long",
                      year:    "numeric",
                    })}
                  </p>
                  <p className="font-body text-sm text-on-surface/60">
                    {new Date(t.date).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
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

            {/* Description */}
            {t.description && (
              <div>
                <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-2">Sobre el torneo</p>
                <p className="font-body text-sm text-on-surface/80 leading-relaxed whitespace-pre-line">
                  {t.description}
                </p>
              </div>
            )}

            {/* Prizes podium */}
            {prizes.length > 0 && (
              <div>
                <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-3">Premios</p>
                <PrizePodium prizes={prizes} />
              </div>
            )}

            {/* CTA */}
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
