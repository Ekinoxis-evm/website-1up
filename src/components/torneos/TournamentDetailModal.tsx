"use client";

import { PrizePodium } from "./PrizeBadge";
import { RegisterButton } from "./RegisterButton";
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

interface Props {
  tournament:   TournamentFull;
  onClose:      () => void;
  isRegistered?: boolean;
}

export function TournamentDetailModal({ tournament: t, onClose, isRegistered = false }: Props) {
  const prizes = [...(t.tournament_prizes ?? [])].sort((a, b) => a.position - b.position);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface-container w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Cover */}
        <div className="relative aspect-video bg-surface-container-high overflow-hidden">
          {t.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-symbols-outlined text-6xl text-outline/20" style={{ fontVariationSettings: "'FILL' 1" }}>
                emoji_events
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-background/80 p-1 text-on-background hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="p-8 space-y-6">
          {/* Meta row */}
          <div className="flex flex-wrap gap-3">
            <span className="font-headline font-black text-[10px] uppercase tracking-widest px-2 py-1 bg-secondary text-background">
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
          <h2 className="font-headline font-black text-3xl uppercase tracking-tighter leading-tight text-on-surface">
            {t.name}
          </h2>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            {t.date && (
              <div>
                <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Fecha</p>
                <p className="font-body text-sm text-on-surface">
                  {new Date(t.date).toLocaleDateString("es-CO", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
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
              <p className="font-body text-sm text-on-surface/80 leading-relaxed">{t.description}</p>
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
          {t.is_registration_open && (
            <RegisterButton
              tournamentId={t.id}
              tournamentName={t.name}
              tournamentDate={t.date}
              locationType={t.location_type}
              isRegistered={isRegistered}
            />
          )}

          {t.status === "completed" && (
            <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline/40 text-center">
              Torneo finalizado
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
