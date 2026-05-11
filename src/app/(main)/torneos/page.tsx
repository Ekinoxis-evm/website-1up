import { supabase } from "@/lib/supabase";
import type { Tournament, Game } from "@/types/database.types";

type TournamentWithGame = Tournament & { games: Pick<Game, "id" | "name"> | null };

const STATUS_BADGE: Record<Tournament["status"], { label: string; color: string }> = {
  upcoming:  { label: "PRÓXIMO",    color: "bg-secondary text-background"          },
  live:      { label: "EN VIVO",    color: "bg-primary text-background animate-pulse" },
  completed: { label: "FINALIZADO", color: "bg-surface-container-high text-outline" },
};

const LOC_ICON: Record<Tournament["location_type"], string> = {
  presencial: "location_on",
  online:     "wifi",
  mixto:      "sync_alt",
};

const LOC_LABEL: Record<Tournament["location_type"], string> = {
  presencial: "Presencial",
  online:     "Online",
  mixto:      "Mixto",
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.1upesports.org";

function TorneoCard({ t }: { t: TournamentWithGame }) {
  const badge = STATUS_BADGE[t.status];
  return (
    <div className="bg-surface-container flex flex-col">
      {/* Cover */}
      <div className="relative aspect-video bg-surface-container-high overflow-hidden">
        {t.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-outline/20" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
          </div>
        )}
        {/* Status badge */}
        <span className={`absolute top-3 left-3 font-headline font-black text-[10px] uppercase tracking-widest px-2 py-1 ${badge.color}`}>
          {badge.label}
        </span>
        {/* Location badge */}
        <span className="absolute top-3 right-3 bg-background/80 flex items-center gap-1 px-2 py-1">
          <span className="material-symbols-outlined text-xs text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>{LOC_ICON[t.location_type]}</span>
          <span className="font-headline font-bold text-[10px] uppercase tracking-widest text-on-background">{LOC_LABEL[t.location_type]}</span>
        </span>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1 gap-3">
        {t.games && (
          <p className="font-headline font-bold text-xs uppercase tracking-widest text-secondary">{t.games.name}</p>
        )}
        <h3 className="font-headline font-black text-xl uppercase tracking-tighter leading-tight text-on-surface">{t.name}</h3>

        <div className="flex flex-wrap gap-4 text-xs font-headline font-bold text-on-surface/60 uppercase tracking-wider">
          {t.date && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              {new Date(t.date).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          )}
          {t.prize_pool_cop && (
            <span className="flex items-center gap-1 text-secondary">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
              ${t.prize_pool_cop.toLocaleString("es-CO")} COP
            </span>
          )}
          {t.max_participants && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">group</span>
              Máx. {t.max_participants}
            </span>
          )}
        </div>

        {t.description && (
          <p className="font-body text-sm text-on-surface/60 line-clamp-2">{t.description}</p>
        )}

        <div className="mt-auto pt-2">
          {t.is_registration_open ? (
            <a
              href={`${APP_URL}/torneos`}
              className="inline-block bg-primary-container text-white font-headline font-black text-sm px-6 py-2.5 skew-fix hover:neo-shadow-pink transition-all"
            >
              <span className="block skew-content">REGISTRARME</span>
            </a>
          ) : (
            <span className="font-headline font-bold text-xs uppercase tracking-widest text-outline/40">
              {t.status === "completed" ? "Torneo finalizado" : "Registro próximamente"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function TorneosPage() {
  const { data } = await supabase
    .from("tournaments")
    .select("*, games(id, name)")
    .eq("is_active", true)
    .order("sort_order")
    .order("date", { ascending: true });

  const tournaments = (data ?? []) as TournamentWithGame[];
  const upcoming    = tournaments.filter((t) => t.status === "upcoming" || t.status === "live");
  const completed   = tournaments.filter((t) => t.status === "completed");

  return (
    <>
      {/* Hero */}
      <section className="py-24 px-8 md:px-16 bg-background">
        <div className="max-w-5xl">
          <div className="inline-block bg-primary-container px-4 py-1 mb-6 skew-fix">
            <span className="text-white font-black italic skew-content block text-sm tracking-widest font-headline">
              ESPORTS
            </span>
          </div>
          <h1 className="font-headline font-black text-6xl md:text-8xl uppercase tracking-tighter leading-none mb-4">
            TOR<span className="text-primary-container">NEOS</span>
          </h1>
          <div className="h-1 w-24 bg-primary-container mb-8" />
          <p className="font-body text-on-surface/60 text-lg max-w-xl">
            Compite en los torneos oficiales del ecosistema 1UP. Todos los niveles, múltiples juegos,
            premios reales.
          </p>
        </div>
      </section>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="py-16 px-8 md:px-16 bg-surface-container">
          <h2 className="font-headline font-black text-2xl uppercase tracking-tighter mb-8">
            PRÓXIMOS <span className="text-primary-container">TORNEOS</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcoming.map((t) => <TorneoCard key={t.id} t={t} />)}
          </div>
        </section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <section className="py-16 px-8 md:px-16 bg-background">
          <h2 className="font-headline font-black text-2xl uppercase tracking-tighter mb-8">
            HISTORIAL
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-70">
            {completed.map((t) => <TorneoCard key={t.id} t={t} />)}
          </div>
        </section>
      )}

      {/* Empty state */}
      {tournaments.length === 0 && (
        <section className="py-32 px-8 md:px-16 bg-surface-container flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-6xl text-outline/20" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
          <p className="font-headline font-black text-xl uppercase tracking-tighter text-outline/40">Próximamente</p>
          <p className="font-body text-sm text-outline/40">Los torneos de la temporada se anunciarán pronto.</p>
        </section>
      )}
    </>
  );
}
