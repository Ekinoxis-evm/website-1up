"use client";

import { useState, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import type { Bracket, BracketMatch, BracketParticipant } from "@/types/database.types";

type Tournament = { id: number; name: string; status: string };

type BracketData = {
  bracket:      Bracket;
  participants: BracketParticipant[];
  matches:      BracketMatch[];
} | null;

const SIDE_ORDER = { winners: 0, losers: 1, grand_final: 2, gf_reset: 3 } as Record<string, number>;

const SIDE_LABEL: Record<string, string> = {
  winners:     "Winners",
  losers:      "Losers",
  grand_final: "Gran Final",
  gf_reset:    "Reset",
};

const STATE_BADGE: Record<string, string> = {
  pending:     "bg-surface-container-high text-outline",
  ready:       "bg-secondary text-background",
  in_progress: "bg-primary text-background animate-pulse",
  completed:   "bg-surface-container-high text-on-surface",
  bye:         "bg-surface-container text-outline/60",
};

const STATE_LABEL: Record<string, string> = {
  pending:     "Pendiente",
  ready:       "Listo",
  in_progress: "En curso",
  completed:   "Finalizado",
  bye:         "BYE",
};

interface Props {
  tournaments: Tournament[];
}

export function AdminTournamentBracketsClient({ tournaments }: Props) {
  const { getAccessToken } = usePrivy();

  const [selectedId, setSelectedId]   = useState<number | null>(null);
  const [bracketData, setBracketData] = useState<BracketData>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Seed form
  const [format, setFormat] = useState<"double_elimination" | "single_elimination">("double_elimination");
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  // Score form
  const [scoring, setScoring]     = useState<number | null>(null); // matchId being scored
  const [p1Score, setP1Score]     = useState("");
  const [p2Score, setP2Score]     = useState("");
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);

  const authHeaders = useCallback(async () => {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }, [getAccessToken]);

  async function loadBracket(tournamentId: number) {
    setLoading(true);
    setError(null);
    setBracketData(null);
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/admin/brackets?tournamentId=${tournamentId}`, { headers });
      if (!res.ok) throw new Error("Error al cargar bracket");
      const data = await res.json();
      setBracketData(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleTournamentChange(id: number | null) {
    setSelectedId(id);
    setBracketData(null);
    setSeedError(null);
    setError(null);
    setScoring(null);
    if (id) loadBracket(id);
  }

  async function handleSeed() {
    if (!selectedId) return;
    setSeeding(true);
    setSeedError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/admin/brackets", {
        method:  "POST",
        headers,
        body:    JSON.stringify({ tournamentId: selectedId, format }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear bracket");
      await loadBracket(selectedId);
    } catch (e) {
      setSeedError((e as Error).message);
    } finally {
      setSeeding(false);
    }
  }

  async function handleDelete() {
    if (!selectedId || !bracketData) return;
    if (!confirm("¿Eliminar el bracket? Esta acción no se puede deshacer.")) return;
    const headers = await authHeaders();
    await fetch("/api/admin/brackets", {
      method:  "DELETE",
      headers,
      body:    JSON.stringify({ tournamentId: selectedId }),
    });
    setBracketData(null);
  }

  async function handleScoreSubmit(matchId: number) {
    const p1 = parseInt(p1Score);
    const p2 = parseInt(p2Score);
    if (isNaN(p1) || isNaN(p2)) { setScoreError("Ingresa puntajes válidos"); return; }
    setScoreLoading(true);
    setScoreError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/admin/brackets", {
        method:  "PATCH",
        headers,
        body:    JSON.stringify({ matchId, p1Score: p1, p2Score: p2 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al registrar resultado");
      setScoring(null);
      setP1Score("");
      setP2Score("");
      await loadBracket(selectedId!);
    } catch (e) {
      setScoreError((e as Error).message);
    } finally {
      setScoreLoading(false);
    }
  }

  // Group matches by side → round
  const groupedMatches = bracketData
    ? Object.entries(
        bracketData.matches.reduce<Record<string, BracketMatch[]>>((acc, m) => {
          const key = `${m.bracket_side}-${m.round}`;
          (acc[key] ??= []).push(m);
          return acc;
        }, {}),
      ).sort(([a], [b]) => {
        const [sideA, rA] = a.split("-");
        const [sideB, rB] = b.split("-");
        const so = (SIDE_ORDER[sideA] ?? 9) - (SIDE_ORDER[sideB] ?? 9);
        return so !== 0 ? so : parseInt(rA) - parseInt(rB);
      })
    : [];

  const participantMap = new Map(bracketData?.participants.map(p => [p.id, p]) ?? []);

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div>
        <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Competiciones</p>
        <h1 className="font-headline font-black text-3xl uppercase tracking-tighter text-on-surface">
          BRACKETS
        </h1>
        <div className="h-1 w-16 bg-primary-container mt-2" />
      </div>

      {/* Tournament selector */}
      <div className="max-w-sm">
        <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-2">
          Torneo
        </label>
        <select
          value={selectedId ?? ""}
          onChange={e => handleTournamentChange(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full bg-surface-container text-on-surface font-body text-sm px-3 py-2 border-0 outline-none focus:ring-2 focus:ring-primary-container"
        >
          <option value="">Seleccionar torneo…</option>
          {tournaments.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {loading && (
        <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline/40 animate-pulse">
          Cargando…
        </p>
      )}

      {error && (
        <p className="font-body text-sm text-error">{error}</p>
      )}

      {/* No bracket yet */}
      {selectedId && !loading && !error && bracketData === null && (
        <div className="bg-surface-container p-6 max-w-md space-y-4">
          <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline">
            Sin bracket
          </p>
          <p className="font-body text-sm text-on-surface/70">
            No existe bracket para este torneo. Crea uno a partir de los participantes registrados.
          </p>

          <div>
            <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-2">
              Formato
            </label>
            <select
              value={format}
              onChange={e => setFormat(e.target.value as typeof format)}
              className="w-full bg-surface-container-high text-on-surface font-body text-sm px-3 py-2 border-0 outline-none focus:ring-2 focus:ring-primary-container"
            >
              <option value="double_elimination">Doble Eliminación</option>
              <option value="single_elimination">Eliminación Simple</option>
            </select>
          </div>

          {seedError && <p className="font-body text-sm text-error">{seedError}</p>}

          <button
            onClick={handleSeed}
            disabled={seeding}
            className="bg-primary text-background font-headline font-black text-xs uppercase tracking-widest px-5 py-2 hover:bg-primary/80 disabled:opacity-40 transition-colors"
          >
            {seeding ? "Creando…" : "Crear Bracket"}
          </button>
        </div>
      )}

      {/* Bracket exists */}
      {bracketData && (
        <div className="space-y-6">
          {/* Header row */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-surface-container px-4 py-2 flex gap-6">
              <div>
                <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-0.5">Formato</p>
                <p className="font-headline font-black text-sm text-on-surface">
                  {bracketData.bracket.format === "double_elimination" ? "Doble Eliminación" : "Eliminación Simple"}
                </p>
              </div>
              <div>
                <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-0.5">Estado</p>
                <p className="font-headline font-black text-sm text-on-surface capitalize">
                  {bracketData.bracket.status}
                </p>
              </div>
              <div>
                <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-0.5">Participantes</p>
                <p className="font-headline font-black text-sm text-on-surface">
                  {bracketData.bracket.participant_count}
                </p>
              </div>
            </div>

            <button
              onClick={handleDelete}
              className="font-headline font-bold text-xs uppercase tracking-widest text-error hover:text-error/70 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              Eliminar bracket
            </button>
          </div>

          {/* Match table by round */}
          {groupedMatches.map(([key, roundMatches]) => {
            const [side, round] = key.split("-");
            return (
              <div key={key}>
                <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-3">
                  {SIDE_LABEL[side] ?? side} — Ronda {round}
                </p>
                <div className="space-y-2">
                  {roundMatches.map(match => {
                    const p1 = match.p1_id ? participantMap.get(match.p1_id) : null;
                    const p2 = match.p2_id ? participantMap.get(match.p2_id) : null;
                    const canScore = match.state === "ready" || match.state === "in_progress";
                    const isScoring = scoring === match.id;

                    return (
                      <div key={match.id} className="bg-surface-container p-4 flex flex-wrap items-center gap-4">
                        <span className={`font-headline font-black text-[10px] uppercase tracking-widest px-2 py-0.5 shrink-0 ${STATE_BADGE[match.state] ?? STATE_BADGE.pending}`}>
                          {STATE_LABEL[match.state] ?? match.state}
                        </span>

                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={`font-body text-sm truncate ${match.winner_id === match.p1_id && match.state === "completed" ? "text-primary-container font-bold" : "text-on-surface"}`}>
                            {p1?.display_name ?? "TBD"}
                          </span>
                          <span className="font-headline font-black text-xs text-outline shrink-0">vs</span>
                          <span className={`font-body text-sm truncate ${match.winner_id === match.p2_id && match.state === "completed" ? "text-primary-container font-bold" : "text-on-surface"}`}>
                            {p2?.display_name ?? (match.state === "bye" ? "BYE" : "TBD")}
                          </span>
                        </div>

                        {match.state === "completed" && (
                          <span className="font-headline font-black text-sm text-outline shrink-0">
                            {match.p1_score} – {match.p2_score}
                          </span>
                        )}

                        {canScore && !isScoring && (
                          <button
                            onClick={() => { setScoring(match.id); setP1Score(""); setP2Score(""); setScoreError(null); }}
                            className="font-headline font-bold text-[10px] uppercase tracking-widest text-primary-container hover:text-primary-container/70 transition-colors shrink-0 flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                            Resultado
                          </button>
                        )}

                        {isScoring && (
                          <div className="flex flex-wrap items-center gap-2 w-full mt-2">
                            <div className="flex items-center gap-2">
                              <span className="font-body text-xs text-outline truncate max-w-[120px]">{p1?.display_name ?? "P1"}</span>
                              <input
                                type="number"
                                min={0}
                                value={p1Score}
                                onChange={e => setP1Score(e.target.value)}
                                placeholder="0"
                                className="w-14 bg-surface-container-high text-on-surface font-body text-sm px-2 py-1 border-0 outline-none focus:ring-2 focus:ring-primary-container text-center"
                              />
                            </div>
                            <span className="font-headline font-black text-xs text-outline">–</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                value={p2Score}
                                onChange={e => setP2Score(e.target.value)}
                                placeholder="0"
                                className="w-14 bg-surface-container-high text-on-surface font-body text-sm px-2 py-1 border-0 outline-none focus:ring-2 focus:ring-primary-container text-center"
                              />
                              <span className="font-body text-xs text-outline truncate max-w-[120px]">{p2?.display_name ?? "P2"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleScoreSubmit(match.id)}
                                disabled={scoreLoading}
                                className="bg-primary text-background font-headline font-black text-[10px] uppercase tracking-widest px-3 py-1 hover:bg-primary/80 disabled:opacity-40 transition-colors"
                              >
                                {scoreLoading ? "…" : "Guardar"}
                              </button>
                              <button
                                onClick={() => setScoring(null)}
                                className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline hover:text-on-surface transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                            {scoreError && <p className="w-full font-body text-xs text-error">{scoreError}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
