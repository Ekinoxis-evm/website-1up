"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { PrizeBadge } from "./PrizeBadge";
import { RegisterButton } from "./RegisterButton";
import { IntlTournamentCard } from "./IntlTournamentCard";
import type { Tournament, TournamentPrize, Game, InternationalTournament } from "@/types/database.types";

export type TournamentFull = Tournament & {
  games:             Pick<Game, "id" | "name"> | null;
  tournament_prizes: TournamentPrize[];
};

export type IntlTournamentFull = InternationalTournament & {
  games: Pick<Game, "id" | "name"> | null;
};

interface Props {
  tournaments:     TournamentFull[];
  intlTournaments: IntlTournamentFull[];
  games:           Pick<Game, "id" | "name">[];
}

const STATUS_BADGE: Record<Tournament["status"], { label: string; color: string }> = {
  upcoming:  { label: "PRÓXIMO",    color: "bg-secondary text-background"             },
  live:      { label: "EN VIVO",    color: "bg-primary text-background animate-pulse" },
  completed: { label: "FINALIZADO", color: "bg-surface-container-high text-outline"   },
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

function TorneoCard({ t, isRegistered, onRegistered }: { t: TournamentFull; isRegistered: boolean; onRegistered?: () => void }) {
  const badge  = STATUS_BADGE[t.status];
  const prizes = t.tournament_prizes ?? [];
  return (
    <div className="bg-surface-container flex flex-col">
      {/* Cover — links to detail page */}
      <Link href={`/torneos/${t.slug ?? t.id}`} className="relative aspect-video bg-surface-container-high overflow-hidden block">
        {t.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-outline/20" style={{ fontVariationSettings: "'FILL' 1" }}>
              emoji_events
            </span>
          </div>
        )}
        <span className={`absolute top-3 left-3 font-headline font-black text-[10px] uppercase tracking-widest px-2 py-1 ${badge.color}`}>
          {badge.label}
        </span>
        <span className="absolute top-3 right-3 bg-background/80 flex items-center gap-1 px-2 py-1">
          <span className="material-symbols-outlined text-xs text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
            {LOC_ICON[t.location_type]}
          </span>
          <span className="font-headline font-bold text-[10px] uppercase tracking-widest text-on-background">
            {LOC_LABEL[t.location_type]}
          </span>
        </span>
      </Link>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1 gap-3">
        {t.games && (
          <p className="font-headline font-bold text-xs uppercase tracking-widest text-secondary">{t.games.name}</p>
        )}
        <Link href={`/torneos/${t.slug ?? t.id}`}>
          <h3 className="font-headline font-black text-xl uppercase tracking-tighter leading-tight text-on-surface hover:text-primary-container transition-colors">
            {t.name}
          </h3>
        </Link>

        <div className="flex flex-wrap gap-4 text-xs font-headline font-bold text-on-surface/60 uppercase tracking-wider">
          {t.date && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              {new Date(t.date).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Bogota" })}
            </span>
          )}
          <PrizeBadge prizes={prizes} />
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

        {t.sponsor_name && (
          <div className="flex items-center gap-2 bg-surface-container-high px-3 py-2">
            {t.sponsor_logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.sponsor_logo_url} alt={t.sponsor_name} className="h-5 w-auto object-contain shrink-0" />
            )}
            <span className="font-headline text-[10px] uppercase tracking-widest text-outline">Patrocinado por</span>
            <span className="font-headline font-black text-[10px] uppercase text-on-surface">{t.sponsor_name}</span>
          </div>
        )}

        <div className="mt-auto pt-2 flex gap-3 items-center flex-wrap">
          <Link
            href={`/torneos/${t.slug ?? t.id}`}
            className="font-headline font-bold text-xs uppercase tracking-widest text-outline hover:text-on-surface transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">open_in_full</span>
            VER MÁS
          </Link>
          {t.is_registration_open && (
            <RegisterButton
              tournamentId={t.id}
              tournamentName={t.name}
              tournamentDate={t.date}
              locationType={t.location_type}
              isRegistered={isRegistered}
              onRegistered={onRegistered}
              compact
            />
          )}
          {!t.is_registration_open && t.status !== "completed" && (
            <span className="font-headline font-bold text-xs uppercase tracking-widest text-outline/40">
              Registro próximamente
            </span>
          )}
          {t.status === "completed" && (
            <span className="font-headline font-bold text-xs uppercase tracking-widest text-outline/40">
              Torneo finalizado
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function TorneosClient({ tournaments, intlTournaments, games }: Props) {
  const { authenticated, getAccessToken } = usePrivy();
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedGame, setSelectedGame]   = useState<string>("");
  const [registeredIds, setRegisteredIds] = useState<number[]>([]);

  useEffect(() => {
    if (!authenticated) return;
    getAccessToken().then((token) => {
      fetch("/api/user/tournament-registrations", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((rows: { tournament_id: number }[]) => setRegisteredIds(rows.map((r) => r.tournament_id)))
        .catch(() => {});
    });
  }, [authenticated, getAccessToken]);

  const months = useMemo(() => {
    const seen = new Set<string>();
    tournaments.forEach((t) => {
      if (t.date) seen.add(t.date.slice(0, 7));
    });
    return [...seen].sort();
  }, [tournaments]);

  const filtered = useMemo(() => {
    return tournaments.filter((t) => {
      if (selectedMonth && (!t.date || !t.date.startsWith(selectedMonth))) return false;
      if (selectedGame  && String(t.game_id) !== selectedGame) return false;
      return true;
    });
  }, [tournaments, selectedMonth, selectedGame]);

  const upcoming  = filtered.filter((t) => t.status === "upcoming" || t.status === "live");
  const completed = filtered.filter((t) => t.status === "completed");

  const hasFilters = selectedMonth || selectedGame;

  function monthLabel(ym: string) {
    const [year, month] = ym.split("-");
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  }

  return (
    <>
      {/* Filter bar */}
      <section className="py-6 px-8 md:px-16 bg-surface-container-high">
        <div className="flex flex-wrap gap-3 items-center">
          <span className="font-headline font-bold text-xs uppercase tracking-widest text-outline">
            Filtrar:
          </span>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-surface-container text-on-background font-headline font-bold text-xs px-3 py-2 border-none focus:outline-none uppercase tracking-widest"
          >
            <option value="">Todos los meses</option>
            {months.map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>

          <select
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value)}
            className="bg-surface-container text-on-background font-headline font-bold text-xs px-3 py-2 border-none focus:outline-none uppercase tracking-widest"
          >
            <option value="">Todos los juegos</option>
            {games.map((g) => (
              <option key={g.id} value={String(g.id)}>{g.name}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={() => { setSelectedMonth(""); setSelectedGame(""); }}
              className="font-headline font-bold text-xs uppercase tracking-widest text-primary hover:text-primary-container transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              Limpiar
            </button>
          )}
        </div>
      </section>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="py-16 px-8 md:px-16 bg-surface-container">
          <h2 className="font-headline font-black text-2xl uppercase tracking-tighter mb-8">
            PRÓXIMOS <span className="text-primary-container">TORNEOS</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcoming.map((t) => (
              <TorneoCard
                key={t.id}
                t={t}
                isRegistered={registeredIds.includes(t.id)}
                onRegistered={() => setRegisteredIds((prev) => [...prev, t.id])}
              />
            ))}
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
            {completed.map((t) => (
              <TorneoCard
                key={t.id}
                t={t}
                isRegistered={registeredIds.includes(t.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {upcoming.length === 0 && completed.length === 0 && (
        <section className="py-32 px-8 md:px-16 bg-surface-container flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-6xl text-outline/20" style={{ fontVariationSettings: "'FILL' 1" }}>
            emoji_events
          </span>
          <p className="font-headline font-black text-xl uppercase tracking-tighter text-outline/40">
            {hasFilters ? "Sin torneos con esos filtros" : "Próximamente"}
          </p>
          {!hasFilters && (
            <p className="font-body text-sm text-outline/40">
              Los torneos de la temporada se anunciarán pronto.
            </p>
          )}
        </section>
      )}

      {/* International tournaments */}
      {intlTournaments.length > 0 && (
        <section className="py-16 px-8 md:px-16 bg-surface-container-high">
          <div className="flex items-center gap-4 mb-8">
            <span className="material-symbols-outlined text-2xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>public</span>
            <h2 className="font-headline font-black text-2xl uppercase tracking-tighter">
              TORNEOS <span className="text-secondary">INTERNACIONALES</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {intlTournaments.map((t) => <IntlTournamentCard key={t.id} t={t} />)}
          </div>
        </section>
      )}

    </>
  );
}
