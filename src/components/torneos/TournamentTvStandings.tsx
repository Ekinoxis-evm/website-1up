"use client";

// Fullscreen TV-mode LEAGUE standings view. Sibling of TournamentTvView (which
// handles brackets). Same venue chrome — huge title, live pulse, sponsor strip —
// but renders the standings table at `tv` size. Polls
// `/api/tournaments/[slug]/standings` every 15s so the screen updates as the
// cockpit records results.

import { useEffect, useState, useCallback } from "react";
import { StandingsTable, type StandingsParticipant } from "@/components/tournaments/StandingsTable";
import type { StandingRow } from "@/lib/league/standings";

const POLL_MS = 15_000;

type StandingsData = {
  league: { status: string };
  participants: (StandingsParticipant & { user_profiles?: { avatar_url: string | null } | null })[];
  standings: StandingRow[];
} | null;

interface Tournament {
  id:                  number;
  name:                string;
  slug:                string | null;
  image_url:           string | null;
  sponsor_name:        string | null;
  sponsor_website_url: string | null;
  sponsor_logo_url:    string | null;
  games:               { name: string } | { name: string }[] | null;
}

function gameName(t: Tournament): string | null {
  if (!t.games) return null;
  if (Array.isArray(t.games)) return t.games[0]?.name ?? null;
  return t.games.name ?? null;
}

export function TournamentTvStandings({ tournament }: { tournament: Tournament }) {
  const [data, setData]        = useState<StandingsData>(null);
  const [lastFetched, setLast] = useState<Date | null>(null);
  const [errored, setErrored]  = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournament.slug}/standings`, { cache: "no-store" });
      if (!res.ok) { setErrored(true); return; }
      setData((await res.json()) as StandingsData);
      setLast(new Date());
      setErrored(false);
    } catch {
      setErrored(true);
    }
  }, [tournament.slug]);

  useEffect(() => {
    void load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const game = gameName(tournament);
  const participants: StandingsParticipant[] = (data?.participants ?? []).map(p => ({
    id: p.id,
    display_name: p.display_name,
    avatar_url: p.avatar_url ?? p.user_profiles?.avatar_url ?? null,
  }));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-start justify-between px-12 pt-10 pb-6 gap-8">
        <div className="flex items-start gap-6 min-w-0">
          {tournament.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tournament.image_url} alt={tournament.name} className="w-32 h-32 object-cover shrink-0" />
          )}
          <div className="min-w-0">
            {game && (
              <p className="font-headline font-bold text-base uppercase tracking-widest text-outline mb-2">{game}</p>
            )}
            <h1 className="font-headline font-black uppercase tracking-tighter text-on-surface leading-[0.9]" style={{ fontSize: "clamp(3rem, 6vw, 7rem)" }}>
              {tournament.name}
            </h1>
            <div className="h-2 w-24 bg-primary-container mt-4" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <LiveBadge status={data?.league.status ?? null} errored={errored} />
          {lastFetched && (
            <p className="font-headline font-bold text-[11px] uppercase tracking-widest text-outline">
              Actualizado{" "}
              {lastFetched.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          )}
        </div>
      </header>

      <main className="flex-1 min-h-0 px-12 pb-8 flex items-start justify-center overflow-auto">
        {data ? (
          <div className="w-full max-w-6xl">
            <StandingsTable standings={data.standings} participants={participants} size="tv" />
          </div>
        ) : errored ? (
          <Holding label="Sin conexión" sublabel="Reintentando…" />
        ) : lastFetched ? (
          <Holding label="Liga aún no publicada" sublabel="La tabla aparecerá automáticamente cuando inicie el torneo." />
        ) : (
          <Holding label="Cargando tabla…" sublabel="" />
        )}
      </main>

      {tournament.sponsor_name && (
        <footer className="bg-surface-container px-12 py-6 flex items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            {tournament.sponsor_logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tournament.sponsor_logo_url} alt={tournament.sponsor_name} className="h-16 object-contain" />
            )}
            <div>
              <p className="font-headline font-bold text-[11px] uppercase tracking-widest text-outline">Powered by</p>
              <p className="font-headline font-black text-2xl uppercase tracking-tight text-on-surface">{tournament.sponsor_name}</p>
            </div>
          </div>
          <p className="font-headline font-black text-xl uppercase tracking-widest text-primary-container italic">
            1UP&nbsp;Gaming&nbsp;Tower
          </p>
        </footer>
      )}
    </div>
  );
}

function LiveBadge({ status, errored }: { status: string | null; errored: boolean }) {
  if (errored) {
    return <span className="font-headline font-black text-sm uppercase tracking-widest px-3 py-1.5 bg-error/20 text-error">✗ ERROR</span>;
  }
  if (!status) return null;
  if (status === "completed") {
    return <span className="font-headline font-black text-sm uppercase tracking-widest px-3 py-1.5 bg-outline/15 text-outline">FINALIZADA</span>;
  }
  return (
    <span className="font-headline font-black text-sm uppercase tracking-widest px-3 py-1.5 bg-primary text-background flex items-center gap-2">
      <span className="w-2 h-2 bg-background rounded-full animate-pulse" />
      EN VIVO
    </span>
  );
}

function Holding({ label, sublabel }: { label: string; sublabel: string }) {
  return (
    <div className="text-center pt-24">
      <p className="font-headline font-black uppercase tracking-tighter text-on-surface/40" style={{ fontSize: "clamp(2rem, 4vw, 4rem)" }}>{label}</p>
      {sublabel && <p className="font-body text-outline mt-3 text-lg">{sublabel}</p>}
    </div>
  );
}
