"use client";

// Single-tournament bracket editor. Extracted from AdminTournamentBracketsClient
// so the same UI can be reused inside the cockpit (`/admin/torneos/[slug]/manage`)
// without dragging the tournament-selector wrapper along.
//
// Responsibilities (one tournament, autoloaded on mount):
//   • SETUP / DRAFT — participant picker (toggle, shuffle, reorder),
//     format selector, "Crear / Regenerar bracket", initial pairings preview,
//     "Iniciar Torneo", "Eliminar bracket"
//   • RUNNING / COMPLETED — round-grouped match grid with click-to-pick winner
//     and per-match undo
//
// The consumer wraps this panel with whatever framing it likes
// (header / stage banner / page chrome).

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import type { Bracket, BracketMatch, BracketParticipant } from "@/types/database.types";

export type BracketTournament = {
  id: number;
  name: string;
  status: string;
  is_registration_open: boolean;
  max_participants: number | null;
};

type BracketData = {
  bracket:      Bracket;
  participants: BracketParticipant[];
  matches:      BracketMatch[];
} | null;

type RosterEntry = { userProfileId: number; name: string; included: boolean };

const SIDE_ORDER: Record<string, number> = { winners: 0, losers: 1, grand_final: 2, gf_reset: 3 };
const SIDE_LABEL: Record<string, string> = {
  winners: "Winners", losers: "Losers", grand_final: "Gran Final", gf_reset: "Reset",
};
const STATE_LABEL: Record<string, string> = {
  pending: "Pendiente", ready: "Por jugar", in_progress: "En curso",
  completed: "Finalizado", bye: "BYE",
};

const FORMATS = [
  {
    value: "single_elimination" as const,
    icon:  "bolt",
    label: "Eliminación Simple",
    desc:  "Una sola derrota elimina al jugador. Más rápido — ideal para muchos participantes.",
  },
  {
    value: "double_elimination" as const,
    icon:  "replay",
    label: "Doble Eliminación",
    desc:  "Segunda oportunidad en el cuadro de perdedores; el jugador queda fuera tras dos derrotas.",
  },
];

interface Props {
  tournament: BracketTournament;
  onChange?: () => void; // optional: parent re-fetches its own server data after a mutation
}

export function AdminTournamentBracketPanel({ tournament, onChange }: Props) {
  const { getAccessToken } = usePrivy();
  const router = useRouter();

  const [bracketData, setBracketData] = useState<BracketData>(null);
  const [roster, setRoster]           = useState<RosterEntry[]>([]);
  const [format, setFormat]           = useState<"double_elimination" | "single_elimination">("single_elimination");
  const [loading, setLoading]         = useState(true);
  const [busy, setBusy]               = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const authHeaders = useCallback(async () => {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }, [getAccessToken]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeaders();
      const [bRes, rRes] = await Promise.all([
        fetch(`/api/admin/brackets?tournamentId=${tournament.id}`, { headers }),
        fetch(`/api/admin/tournament-registrations?tournamentId=${tournament.id}`, { headers }),
      ]);
      const bracket: BracketData = bRes.ok ? await bRes.json() : null;
      const regs: Array<{
        user_profile_id: number;
        status: string;
        user_profiles: { nombre: string | null; apellidos: string | null; username: string | null } | null;
      }> = rRes.ok ? await rRes.json() : [];

      const eligible = regs.filter(r => r.status === "registered" || r.status === "attended");
      const nameOf = (r: (typeof eligible)[number]) => {
        const p = r.user_profiles;
        const full = `${p?.nombre ?? ""} ${p?.apellidos ?? ""}`.trim();
        return p?.username ?? (full || `Perfil #${r.user_profile_id}`);
      };

      if (bracket) {
        const inBracket = new Map(bracket.participants.map(p => [p.user_profile_id, p]));
        const ordered: RosterEntry[] = [...bracket.participants]
          .sort((a, b) => a.seed - b.seed)
          .map(p => ({ userProfileId: p.user_profile_id ?? 0, name: p.display_name, included: true }));
        for (const r of eligible) {
          if (!inBracket.has(r.user_profile_id)) {
            ordered.push({ userProfileId: r.user_profile_id, name: nameOf(r), included: false });
          }
        }
        setRoster(ordered);
        setFormat(bracket.bracket.format);
        setBracketData(bracket);
      } else {
        setRoster(eligible.map(r => ({ userProfileId: r.user_profile_id, name: nameOf(r), included: true })));
        setBracketData(null);
      }
    } catch {
      setError("Error al cargar la información del torneo.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, tournament.id]);

  // Auto-load on mount + when the tournament id changes
  useEffect(() => { void load(); }, [load]);

  function toggle(upid: number) {
    setRoster(r => r.map(e => e.userProfileId === upid ? { ...e, included: !e.included } : e));
  }
  function move(idx: number, dir: -1 | 1) {
    setRoster(r => {
      const next = [...r];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return r;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }
  function shuffle() {
    setRoster(r => {
      const inc = r.filter(e => e.included);
      const exc = r.filter(e => !e.included);
      for (let i = inc.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [inc[i], inc[j]] = [inc[j], inc[i]];
      }
      return [...inc, ...exc];
    });
  }

  const includedIds = roster.filter(e => e.included).map(e => e.userProfileId);
  const status = bracketData?.bracket.status;
  const isDraft   = status === "draft";
  const isRunning = status === "in_progress" || status === "completed";

  async function createBracket() {
    if (includedIds.length < 2) { setError("Selecciona al menos 2 participantes."); return; }
    setBusy(true); setError(null);
    try {
      const headers = await authHeaders();
      if (bracketData) {
        const delRes = await fetch("/api/admin/brackets", {
          method: "DELETE", headers, body: JSON.stringify({ tournamentId: tournament.id }),
        });
        if (!delRes.ok) {
          const delData = await delRes.json().catch(() => ({}));
          throw new Error(delData.error ?? "No se pudo regenerar el bracket.");
        }
      }
      const res = await fetch("/api/admin/brackets", {
        method: "POST", headers,
        body: JSON.stringify({ tournamentId: tournament.id, format, participantIds: includedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear el bracket");
      await load();
      onChange?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function startTournament() {
    if (!confirm(
      "¿Iniciar el torneo?\n\n" +
      "• Las inscripciones se cerrarán automáticamente — no se aceptarán más participantes.\n" +
      "• El bracket quedará bloqueado: no podrás cambiar los enfrentamientos iniciales ni regenerarlo.\n" +
      "• El estado del torneo pasará a EN VIVO y los enfrentamientos serán públicos.",
    )) return;
    setBusy(true); setError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/admin/brackets", {
        method: "PATCH", headers, body: JSON.stringify({ action: "start", tournamentId: tournament.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al iniciar el torneo");
      await load();
      router.refresh();
      onChange?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteBracket() {
    if (!confirm("¿Eliminar el bracket borrador? Volverás a la selección de participantes.")) return;
    setBusy(true); setError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/admin/brackets", {
        method: "DELETE", headers, body: JSON.stringify({ tournamentId: tournament.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al eliminar el bracket.");
      }
      await load();
      onChange?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function pickWinner(matchId: number, winnerId: number) {
    setBusy(true); setError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/admin/brackets", {
        method: "PATCH", headers, body: JSON.stringify({ action: "result", matchId, winnerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al registrar el ganador");
      await load();
      router.refresh();
      onChange?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function undoMatch(matchId: number) {
    setBusy(true); setError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/admin/brackets", {
        method: "PATCH", headers, body: JSON.stringify({ action: "undo", matchId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo deshacer");
      await load();
      router.refresh();
      onChange?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline/40 animate-pulse py-8 text-center">
        Cargando bracket…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {error && <p className="font-body text-sm text-error bg-error/10 p-3">{error}</p>}

      {/* ── SETUP / DRAFT ──────────────────────────────────────────────── */}
      {(bracketData === null || isDraft) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Participant picker */}
          <div className="bg-surface-container p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline">
                Participantes ({includedIds.length})
              </p>
              <button
                onClick={shuffle}
                disabled={busy}
                className="font-headline font-bold text-[10px] uppercase tracking-widest text-secondary hover:text-secondary/70 flex items-center gap-1 disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-sm">shuffle</span>
                Aleatorio
              </button>
            </div>

            {roster.length === 0 ? (
              <p className="font-body text-sm text-outline">
                No hay participantes registrados en este torneo.
              </p>
            ) : (
              <div className="space-y-1 max-h-[420px] overflow-y-auto">
                {roster.map((e, idx) => (
                  <div
                    key={e.userProfileId}
                    className={`flex items-center gap-2 px-3 py-2 ${e.included ? "bg-surface-container-high" : "bg-surface-container-low opacity-50"}`}
                  >
                    <button onClick={() => toggle(e.userProfileId)} className="shrink-0">
                      <span className={`material-symbols-outlined text-lg ${e.included ? "text-primary-container" : "text-outline"}`}>
                        {e.included ? "check_box" : "check_box_outline_blank"}
                      </span>
                    </button>
                    <span className="font-headline font-black text-xs text-outline w-6 shrink-0">
                      {e.included ? roster.slice(0, idx + 1).filter(x => x.included).length : "—"}
                    </span>
                    <span className="font-body text-sm text-on-surface flex-1 min-w-0 truncate">{e.name}</span>
                    {e.included && (
                      <div className="flex shrink-0">
                        <button onClick={() => move(idx, -1)} disabled={idx === 0}
                          className="text-outline hover:text-on-surface disabled:opacity-20">
                          <span className="material-symbols-outlined text-base">keyboard_arrow_up</span>
                        </button>
                        <button onClick={() => move(idx, 1)} disabled={idx === roster.length - 1}
                          className="text-outline hover:text-on-surface disabled:opacity-20">
                          <span className="material-symbols-outlined text-base">keyboard_arrow_down</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Format + actions */}
          <div className="space-y-4">
            <div className="bg-surface-container p-5 space-y-4">
              <div>
                <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-2">Formato</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FORMATS.map(f => {
                    const active = format === f.value;
                    return (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => setFormat(f.value)}
                        className={`p-3 text-left transition-colors ${
                          active
                            ? "bg-primary-container/20 ring-2 ring-primary-container ring-inset"
                            : "bg-surface-container-high hover:bg-surface-container-highest"
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-2xl ${active ? "text-primary-container" : "text-outline"}`}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          {f.icon}
                        </span>
                        <p className="font-headline font-black text-xs uppercase tracking-tight text-on-surface mt-1">
                          {f.label}
                        </p>
                        <p className="font-body text-[11px] text-outline leading-snug mt-1">{f.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={createBracket}
                disabled={busy || includedIds.length < 2}
                className="w-full bg-primary text-background font-headline font-black text-xs uppercase tracking-widest py-3 hover:bg-primary/80 disabled:opacity-40 transition-colors"
              >
                {busy ? "Procesando…" : bracketData ? "Regenerar bracket" : "Crear bracket (borrador)"}
              </button>
              <p className="font-body text-xs text-outline">
                El bracket se crea como <span className="text-on-surface">borrador</span>: ajusta participantes y orden
                las veces que necesites. No es visible al público hasta iniciar el torneo.
              </p>
            </div>

            {isDraft && bracketData && (
              <div className="bg-surface-container p-5 space-y-4">
                <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline">
                  Enfrentamientos iniciales
                </p>
                <div className="space-y-1">
                  {bracketData.matches
                    .filter(m => m.bracket_side === "winners" && m.round === 1)
                    .sort((a, b) => a.match_number - b.match_number)
                    .map(m => {
                      const p1 = bracketData.participants.find(p => p.id === m.p1_id);
                      const p2 = bracketData.participants.find(p => p.id === m.p2_id);
                      return (
                        <div key={m.id} className="bg-surface-container-high px-3 py-2 flex items-center gap-2 text-sm">
                          <span className="font-body text-on-surface flex-1 truncate">{p1?.display_name ?? "—"}</span>
                          <span className="font-headline font-black text-[10px] text-outline">VS</span>
                          <span className="font-body text-on-surface flex-1 truncate text-right">
                            {p2?.display_name ?? (m.state === "bye" ? "BYE" : "—")}
                          </span>
                        </div>
                      );
                    })}
                </div>
                <button
                  onClick={startTournament}
                  disabled={busy}
                  className="w-full bg-primary-container text-white font-headline font-black text-sm uppercase tracking-widest py-3 hover:neo-shadow-pink disabled:opacity-40 transition-all"
                >
                  Iniciar Torneo
                </button>
                <button
                  onClick={deleteBracket}
                  disabled={busy}
                  className="w-full font-headline font-bold text-[10px] uppercase tracking-widest text-error hover:text-error/70 disabled:opacity-40"
                >
                  Eliminar bracket
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RUNNING / COMPLETED ────────────────────────────────────────── */}
      {bracketData && isRunning && (
        <RunningView
          data={bracketData}
          busy={busy}
          onPickWinner={pickWinner}
          onUndo={undoMatch}
        />
      )}
    </div>
  );
}

// ── Running view ──────────────────────────────────────────────────────────

function RunningView({
  data, busy, onPickWinner, onUndo,
}: {
  data: NonNullable<BracketData>;
  busy: boolean;
  onPickWinner: (matchId: number, winnerId: number) => void;
  onUndo: (matchId: number) => void;
}) {
  const participantMap = new Map(data.participants.map(p => [p.id, p]));
  const completed = data.bracket.status === "completed";

  const grouped = Object.entries(
    data.matches.reduce<Record<string, BracketMatch[]>>((acc, m) => {
      (acc[`${m.bracket_side}-${m.round}`] ??= []).push(m);
      return acc;
    }, {}),
  ).sort(([a], [b]) => {
    const [sa, ra] = a.split("-"); const [sb, rb] = b.split("-");
    const so = (SIDE_ORDER[sa] ?? 9) - (SIDE_ORDER[sb] ?? 9);
    return so !== 0 ? so : parseInt(ra) - parseInt(rb);
  });

  const champion = completed
    ? data.participants.find(p => !p.eliminated && data.matches.some(m =>
        m.winner_id === p.id && (m.bracket_side === "grand_final" || (data.bracket.format === "single_elimination" && m.next_match_id === null))))
    : null;

  return (
    <div className="space-y-6">
      <div className="bg-surface-container p-4 flex flex-wrap items-center gap-4">
        <span className={`font-headline font-black text-[10px] uppercase tracking-widest px-2 py-1 ${
          completed ? "bg-surface-container-high text-on-surface" : "bg-primary text-background animate-pulse"
        }`}>
          {completed ? "Torneo finalizado" : "Torneo en curso"}
        </span>
        <span className="font-body text-sm text-outline">
          {data.bracket.format === "double_elimination" ? "Doble eliminación" : "Eliminación simple"} ·{" "}
          {data.bracket.participant_count} participantes
        </span>
        {champion && (
          <span className="font-headline font-black text-sm text-primary-container ml-auto flex items-center gap-1">
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>trophy</span>
            {champion.display_name}
          </span>
        )}
      </div>

      {grouped.map(([key, matches]) => {
        const [side, round] = key.split("-");
        return (
          <div key={key}>
            <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-3">
              {SIDE_LABEL[side] ?? side} — Ronda {round}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {matches.sort((a, b) => a.match_number - b.match_number).map(m => {
                const p1 = m.p1_id ? participantMap.get(m.p1_id) : null;
                const p2 = m.p2_id ? participantMap.get(m.p2_id) : null;
                const canPick = m.state === "ready" && p1 && p2;
                const isCompleted = m.state === "completed";

                return (
                  <div key={m.id} className="bg-surface-container">
                    {(["p1", "p2"] as const).map(slot => {
                      const p = slot === "p1" ? p1 : p2;
                      const isWinner = isCompleted && m.winner_id === (slot === "p1" ? m.p1_id : m.p2_id);
                      const isLoser  = isCompleted && !isWinner;
                      return (
                        <button
                          key={slot}
                          disabled={!canPick || busy}
                          onClick={() => canPick && p && onPickWinner(m.id, p.id)}
                          className={`w-full flex items-center gap-2 px-4 py-3 text-left transition-colors ${
                            canPick ? "hover:bg-primary-container/20 cursor-pointer" : "cursor-default"
                          } ${slot === "p1" ? "border-b border-surface-container-low" : ""} ${
                            isWinner ? "bg-primary-container/15" : isLoser ? "opacity-40" : ""
                          }`}
                        >
                          {isWinner && (
                            <span className="material-symbols-outlined text-sm text-primary-container"
                              style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          )}
                          <span className={`font-body text-sm flex-1 truncate ${isWinner ? "text-primary-container font-bold" : "text-on-surface"}`}>
                            {p?.display_name ?? (m.state === "bye" ? "BYE" : "Por definir")}
                          </span>
                          {canPick && (
                            <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-outline">
                              Ganó
                            </span>
                          )}
                        </button>
                      );
                    })}
                    <div className="px-4 py-1.5 bg-surface-container-high flex items-center justify-between">
                      <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-outline">
                        {STATE_LABEL[m.state] ?? m.state}
                      </span>
                      {isCompleted && !completed && (
                        <button
                          onClick={() => onUndo(m.id)}
                          disabled={busy}
                          className="font-headline font-bold text-[9px] uppercase tracking-widest text-outline hover:text-error disabled:opacity-40 flex items-center gap-0.5"
                        >
                          <span className="material-symbols-outlined text-xs">undo</span>
                          Deshacer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
