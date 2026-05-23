"use client";

// Fullscreen TV-mode bracket view. Designed for a venue display:
//   • Huge tournament title across the top
//   • Bracket scaled large (uses `TournamentBracketView scale="tv"`)
//   • Sponsor strip at the bottom (if a sponsor is configured)
//   • Subtle "EN VIVO" pulse + ago timestamp so staff know the page is fresh
//
// Polls `/api/tournaments/[slug]/bracket` every 15s — when the cockpit's
// Bracket tab records a winner, the TV picks up the update next tick. If
// the API returns null (no published bracket) we show a holding screen.

import { useEffect, useState, useCallback } from "react";
import { TournamentBracketView, type BracketData } from "@/components/torneos/TournamentBracketView";

const POLL_MS = 15_000;

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

interface Props {
  tournament: Tournament;
}

function gameName(t: Tournament): string | null {
  if (!t.games) return null;
  // Supabase returns either an object or array depending on relation cardinality
  if (Array.isArray(t.games)) return t.games[0]?.name ?? null;
  return t.games.name ?? null;
}

export function TournamentTvView({ tournament }: Props) {
  const [data, setData]           = useState<BracketData | null>(null);
  const [lastFetched, setLast]    = useState<Date | null>(null);
  const [errored, setErrored]     = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournament.slug}/bracket`, { cache: "no-store" });
      if (!res.ok) { setErrored(true); return; }
      const json = (await res.json()) as BracketData | null;
      setData(json);
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex items-start justify-between px-12 pt-10 pb-6 gap-8">
        <div className="flex items-start gap-6 min-w-0">
          {tournament.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tournament.image_url} alt={tournament.name} className="w-32 h-32 object-cover shrink-0" />
          )}
          <div className="min-w-0">
            {game && (
              <p className="font-headline font-bold text-base uppercase tracking-widest text-outline mb-2">
                {game}
              </p>
            )}
            <h1 className="font-headline font-black uppercase tracking-tighter text-on-surface leading-[0.9]" style={{ fontSize: "clamp(3rem, 6vw, 7rem)" }}>
              {tournament.name}
            </h1>
            <div className="h-2 w-24 bg-primary-container mt-4" />
          </div>
        </div>

        {/* Live status pill */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <LiveBadge data={data} errored={errored} />
          {lastFetched && (
            <p className="font-headline font-bold text-[11px] uppercase tracking-widest text-outline">
              Actualizado{" "}
              {lastFetched.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          )}
        </div>
      </header>

      {/* ── Bracket (or holding screen) ────────────────────────────── */}
      <main className="flex-1 px-12 pb-8 flex items-center justify-center">
        {data ? (
          <div className="w-full">
            <TournamentBracketView data={data} scale="tv" />
          </div>
        ) : errored ? (
          <Holding label="Sin conexión" sublabel="Reintentando…" />
        ) : data === null && lastFetched ? (
          <Holding label="Bracket aún no publicado" sublabel="El cuadro aparecerá automáticamente cuando inicie el torneo." />
        ) : (
          <Holding label="Cargando bracket…" sublabel="" />
        )}
      </main>

      {/* ── Sponsor strip ──────────────────────────────────────────── */}
      {tournament.sponsor_name && (
        <footer className="bg-surface-container px-12 py-6 flex items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            {tournament.sponsor_logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tournament.sponsor_logo_url}
                alt={tournament.sponsor_name}
                className="h-16 object-contain"
              />
            )}
            <div>
              <p className="font-headline font-bold text-[11px] uppercase tracking-widest text-outline">Powered by</p>
              <p className="font-headline font-black text-2xl uppercase tracking-tight text-on-surface">
                {tournament.sponsor_name}
              </p>
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

function LiveBadge({ data, errored }: { data: BracketData | null; errored: boolean }) {
  if (errored) {
    return (
      <span className="font-headline font-black text-sm uppercase tracking-widest px-3 py-1.5 bg-error/20 text-error">
        ✗ ERROR
      </span>
    );
  }
  if (!data) return null;
  const status = data.bracket.status;
  if (status === "completed") {
    return (
      <span className="font-headline font-black text-sm uppercase tracking-widest px-3 py-1.5 bg-outline/15 text-outline">
        FINALIZADO
      </span>
    );
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
    <div className="text-center">
      <p className="font-headline font-black uppercase tracking-tighter text-on-surface/40" style={{ fontSize: "clamp(2rem, 4vw, 4rem)" }}>
        {label}
      </p>
      {sublabel && <p className="font-body text-outline mt-3 text-lg">{sublabel}</p>}
    </div>
  );
}
