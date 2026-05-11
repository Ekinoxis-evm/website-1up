import type { InternationalTournament, Game } from "@/types/database.types";

type IntlWithGame = InternationalTournament & { games: Pick<Game, "id" | "name"> | null };

export function IntlTournamentCard({ t }: { t: IntlWithGame }) {
  return (
    <div className="bg-surface-container flex flex-col">
      <div className="relative aspect-video bg-surface-container-high overflow-hidden">
        {t.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-outline/20" style={{ fontVariationSettings: "'FILL' 1" }}>
              public
            </span>
          </div>
        )}
        {(t.country || t.city) && (
          <span className="absolute top-3 left-3 bg-background/80 flex items-center gap-1 px-2 py-1">
            <span className="material-symbols-outlined text-xs text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
            <span className="font-headline font-bold text-[10px] uppercase tracking-widest text-on-background">
              {[t.city, t.country].filter(Boolean).join(", ")}
            </span>
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1 gap-3">
        {t.games && (
          <p className="font-headline font-bold text-xs uppercase tracking-widest text-secondary">{t.games.name}</p>
        )}
        <h3 className="font-headline font-black text-xl uppercase tracking-tighter leading-tight text-on-surface">
          {t.name}
        </h3>

        <div className="flex flex-wrap gap-4 text-xs font-headline font-bold text-on-surface/60 uppercase tracking-wider">
          {t.date && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              {new Date(t.date).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          )}
          {t.organizer && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">groups</span>
              {t.organizer}
            </span>
          )}
        </div>

        {t.description && (
          <p className="font-body text-sm text-on-surface/60 line-clamp-2">{t.description}</p>
        )}

        <div className="mt-auto pt-2">
          {t.registration_link ? (
            <a
              href={t.registration_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-surface-container-high text-on-surface font-headline font-bold text-sm px-6 py-2.5 hover:bg-surface-container-highest transition-colors flex items-center gap-2"
            >
              VER INSCRIPCIÓN
              <span className="material-symbols-outlined text-sm">open_in_new</span>
            </a>
          ) : (
            <span className="font-headline font-bold text-xs uppercase tracking-widest text-outline/40">
              Próximamente
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
