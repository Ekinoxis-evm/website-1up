"use client";

// Per-tournament League (round-robin) editor — the cockpit's Calendario + Tabla
// surface when competition_format === "league". Mirrors AdminTournamentBracketPanel
// but simpler: no tree, just a round-by-round calendar with inline score entry and
// a live standings table.
//
// Flow:
//   • No league yet  → roster + "Generar calendario (Liga)"  (POST)
//   • Draft          → calendar preview + "Iniciar Liga" / "Eliminar liga"
//   • In progress    → calendar with score entry + standings
//   • Completed      → final standings + read-only calendar

import { useState, useCallback, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAdminToast } from "@/components/admin/ui/Toast";
import { StandingsTable } from "@/components/tournaments/StandingsTable";
import type { StandingRow } from "@/lib/league/standings";

export type LeagueTournament = {
  id:     number;
  name:   string;
  status: string;
};

type LeagueRow = { id: number; status: "draft" | "in_progress" | "completed"; participant_count: number; rounds: number };
type ParticipantRow = {
  id: number; display_name: string; seed: number; user_profile_id: number | null;
  user_profiles?: { avatar_url: string | null; username: string | null; nombre: string | null; apellidos: string | null } | null;
};
type MatchRow = {
  id: number; round: number; match_number: number;
  p1_id: number | null; p2_id: number | null;
  p1_score: number | null; p2_score: number | null;
  winner_id: number | null; is_draw: boolean; state: string;
};
type LeagueData = { league: LeagueRow; participants: ParticipantRow[]; matches: MatchRow[]; standings: StandingRow[] } | null;
type RosterEntry = { userProfileId: number; name: string; included: boolean };

interface Props {
  tournament: LeagueTournament;
  onChange?: () => void;
}

export function AdminTournamentLeaguePanel({ tournament, onChange }: Props) {
  const { getAccessToken } = usePrivy();
  const { showError, showSuccess } = useAdminToast();

  const [data, setData]       = useState<LeagueData>(null);
  const [roster, setRoster]   = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  // Local draft of score inputs keyed by matchId: { p1, p2 }
  const [scores, setScores]   = useState<Record<number, { p1: string; p2: string }>>({});

  const authHeaders = useCallback(async () => {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }, [getAccessToken]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const [leagueRes, regRes] = await Promise.all([
        fetch(`/api/admin/leagues?tournamentId=${tournament.id}`, { headers, cache: "no-store" }),
        fetch(`/api/admin/tournament-registrations?tournamentId=${tournament.id}`, { headers, cache: "no-store" }),
      ]);
      const league: LeagueData = leagueRes.ok ? await leagueRes.json() : null;
      setData(league);

      if (!league) {
        const regs = regRes.ok ? await regRes.json() : [];
        const eligible = (Array.isArray(regs) ? regs : [])
          .filter((r: { status: string }) => r.status === "registered" || r.status === "attended")
          .map((r: { user_profile_id: number; user_profiles?: { username: string | null; nombre: string | null; apellidos: string | null } }) => {
            const p = r.user_profiles;
            const name = p?.username || [p?.nombre, p?.apellidos].filter(Boolean).join(" ") || `Perfil #${r.user_profile_id}`;
            return { userProfileId: r.user_profile_id, name, included: true };
          });
        setRoster(eligible);
      }
    } finally {
      setLoading(false);
    }
  }, [authHeaders, tournament.id]);

  useEffect(() => { load(); }, [load]);

  async function generateCalendar() {
    const ids = roster.filter(r => r.included).map(r => r.userProfileId);
    if (ids.length < 2) { showError("Se necesitan al menos 2 participantes."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/leagues", {
        method: "POST", headers: await authHeaders(),
        body: JSON.stringify({ tournamentId: tournament.id, participantIds: ids }),
      });
      if (!res.ok) { showError((await res.json().catch(() => ({}))).error ?? "No se pudo generar el calendario."); return; }
      showSuccess("Calendario de liga generado.");
      await load(); onChange?.();
    } finally { setBusy(false); }
  }

  async function startLeague() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/leagues", {
        method: "PATCH", headers: await authHeaders(),
        body: JSON.stringify({ action: "start", tournamentId: tournament.id }),
      });
      if (!res.ok) { showError((await res.json().catch(() => ({}))).error ?? "No se pudo iniciar la liga."); return; }
      showSuccess("Liga iniciada.");
      await load(); onChange?.();
    } finally { setBusy(false); }
  }

  async function deleteLeague() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/leagues", {
        method: "DELETE", headers: await authHeaders(),
        body: JSON.stringify({ tournamentId: tournament.id }),
      });
      if (!res.ok) { showError((await res.json().catch(() => ({}))).error ?? "No se pudo eliminar la liga."); return; }
      showSuccess("Liga eliminada.");
      await load(); onChange?.();
    } finally { setBusy(false); }
  }

  async function recordResult(matchId: number) {
    const s = scores[matchId];
    if (!s || s.p1 === "" || s.p2 === "") { showError("Ingresa ambos marcadores."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/leagues", {
        method: "PATCH", headers: await authHeaders(),
        body: JSON.stringify({ action: "result", matchId, p1Score: s.p1, p2Score: s.p2 }),
      });
      if (!res.ok) { showError((await res.json().catch(() => ({}))).error ?? "No se pudo registrar el resultado."); return; }
      showSuccess("Resultado registrado.");
      setScores(prev => { const n = { ...prev }; delete n[matchId]; return n; });
      await load(); onChange?.();
    } finally { setBusy(false); }
  }

  async function undoResult(matchId: number) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/leagues", {
        method: "PATCH", headers: await authHeaders(),
        body: JSON.stringify({ action: "undo", matchId }),
      });
      if (!res.ok) { showError((await res.json().catch(() => ({}))).error ?? "No se pudo deshacer."); return; }
      showSuccess("Resultado revertido.");
      await load(); onChange?.();
    } finally { setBusy(false); }
  }

  if (loading) {
    return <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline">Cargando liga…</p>;
  }

  // ── No league yet — roster + generate ────────────────────────────────
  if (!data) {
    const includedCount = roster.filter(r => r.included).length;
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-headline font-black text-lg uppercase tracking-tighter mb-1">Generar calendario de Liga</h3>
          <p className="font-body text-sm text-outline">
            Round-robin: cada participante juega contra todos una vez. Selecciona los participantes y genera el calendario (borrador).
          </p>
        </div>
        {roster.length === 0 ? (
          <p className="font-body text-sm text-on-surface-variant bg-surface-container p-4">
            Aún no hay inscritos elegibles (registrados o asistentes).
          </p>
        ) : (
          <div className="space-y-1">
            {roster.map((r, idx) => (
              <label key={r.userProfileId} className="flex items-center gap-3 bg-surface-container px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox" checked={r.included}
                  onChange={() => setRoster(prev => prev.map((x, i) => i === idx ? { ...x, included: !x.included } : x))}
                  className="accent-primary-container"
                />
                <span className="font-headline font-bold text-sm uppercase tracking-tight">{r.name}</span>
              </label>
            ))}
          </div>
        )}
        <button
          onClick={generateCalendar}
          disabled={busy || includedCount < 2}
          className="bg-primary-container text-white font-headline font-black py-3 px-6 uppercase tracking-tight disabled:opacity-40"
        >
          {busy ? "GENERANDO…" : `GENERAR CALENDARIO (${includedCount})`}
        </button>
      </div>
    );
  }

  const { league, participants, matches, standings } = data;
  const participantInfo = participants.map(p => ({
    id: p.id, display_name: p.display_name, avatar_url: p.user_profiles?.avatar_url ?? null,
  }));
  const nameById = new Map(participants.map(p => [p.id, p.display_name]));

  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
  const editable = league.status === "in_progress";

  return (
    <div className="space-y-6">
      {/* Status + lifecycle actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline">Liga ·</span>
          <span className="font-headline font-black text-xs uppercase tracking-widest px-2 py-1 bg-primary-container/15 text-primary-container">
            {league.status === "draft" ? "Borrador" : league.status === "in_progress" ? "En curso" : "Finalizada"}
          </span>
          <span className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline">
            {league.participant_count} jugadores · {league.rounds} jornadas
          </span>
        </div>
        <div className="flex gap-2">
          {league.status === "draft" && (
            <>
              <button onClick={startLeague} disabled={busy}
                className="bg-primary-container text-white font-headline font-black py-2 px-4 text-xs uppercase tracking-tight disabled:opacity-40">
                {busy ? "…" : "INICIAR LIGA"}
              </button>
              <button onClick={deleteLeague} disabled={busy}
                className="bg-surface-container-high hover:bg-error/20 hover:text-error font-headline font-black py-2 px-4 text-xs uppercase tracking-tight disabled:opacity-40">
                ELIMINAR
              </button>
            </>
          )}
        </div>
      </div>

      {/* Standings table — shown once the league is running or finished */}
      {league.status !== "draft" && (
        <div>
          <h3 className="font-headline font-black text-lg uppercase tracking-tighter mb-2">Tabla de posiciones</h3>
          <StandingsTable standings={standings} participants={participantInfo} />
        </div>
      )}

      {/* Calendar by round */}
      <div>
        <h3 className="font-headline font-black text-lg uppercase tracking-tighter mb-2">Calendario</h3>
        <div className="space-y-4">
          {rounds.map(round => (
            <div key={round}>
              <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-1">Jornada {round}</p>
              <div className="space-y-1">
                {matches.filter(m => m.round === round).map(m => {
                  const done = m.state === "completed";
                  const s = scores[m.id] ?? { p1: "", p2: "" };
                  return (
                    <div key={m.id} className="flex items-center gap-2 bg-surface-container px-3 py-2.5">
                      <span className="flex-1 min-w-0 text-right font-headline font-bold text-sm uppercase tracking-tight truncate">
                        {nameById.get(m.p1_id ?? -1) ?? "—"}
                      </span>
                      {done ? (
                        <span className={`font-headline font-black text-sm px-2 ${m.is_draw ? "text-outline" : "text-primary-container"}`}>
                          {m.p1_score} – {m.p2_score}
                        </span>
                      ) : editable ? (
                        <span className="flex items-center gap-1">
                          <input
                            type="number" min={0} value={s.p1} placeholder="0"
                            onChange={(e) => setScores(prev => ({ ...prev, [m.id]: { ...s, p1: e.target.value } }))}
                            className="w-12 bg-surface-container-lowest text-center font-headline font-bold p-1.5 border-none focus:outline-none"
                          />
                          <span className="text-outline">–</span>
                          <input
                            type="number" min={0} value={s.p2} placeholder="0"
                            onChange={(e) => setScores(prev => ({ ...prev, [m.id]: { ...s, p2: e.target.value } }))}
                            className="w-12 bg-surface-container-lowest text-center font-headline font-bold p-1.5 border-none focus:outline-none"
                          />
                        </span>
                      ) : (
                        <span className="font-headline font-bold text-xs text-outline px-2">vs</span>
                      )}
                      <span className="flex-1 min-w-0 text-left font-headline font-bold text-sm uppercase tracking-tight truncate">
                        {nameById.get(m.p2_id ?? -1) ?? "—"}
                      </span>
                      {editable && !done && (
                        <button onClick={() => recordResult(m.id)} disabled={busy}
                          className="bg-primary-container text-white font-headline font-black py-1.5 px-3 text-[10px] uppercase tracking-tight disabled:opacity-40 shrink-0">
                          OK
                        </button>
                      )}
                      {editable && done && (
                        <button onClick={() => undoResult(m.id)} disabled={busy}
                          className="bg-surface-container-high hover:bg-secondary/20 font-headline font-bold py-1.5 px-2 text-[10px] uppercase tracking-tight disabled:opacity-40 shrink-0"
                          title="Deshacer resultado">
                          <span className="material-symbols-outlined text-sm">undo</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
