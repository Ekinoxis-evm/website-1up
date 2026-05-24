"use client";

// Single-tournament bracket editor. Extracted from AdminTournamentBracketsClient
// so the same UI can be reused inside the cockpit (`/admin/torneos/[slug]/manage`)
// without dragging the tournament-selector wrapper along.
//
// Responsibilities (one tournament, autoloaded on mount):
//   • SETUP / DRAFT — participant picker (toggle, shuffle, reorder),
//     format selector, "Crear / Regenerar bracket", initial pairings preview,
//     "Iniciar Torneo", "Eliminar bracket"
//   • RUNNING / COMPLETED — interactive bracket tree (TournamentBracketView
//     with scale="admin"). Click a participant on a "ready" match to pick
//     them as winner. Click "Deshacer" at the foot of a completed match
//     to undo. Visualization matches the public + TV views — same tree,
//     same avatars — so the admin sees exactly what spectators see.
//
// The consumer wraps this panel with whatever framing it likes
// (header / stage banner / page chrome).

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import type { Bracket, BracketMatch, BracketParticipant } from "@/types/database.types";
import { TournamentBracketView } from "@/components/torneos/TournamentBracketView";

export type BracketTournament = {
  id: number;
  name: string;
  status: string;
  is_registration_open: boolean;
  max_participants: number | null;
};

// The admin GET endpoint joins user_profiles for avatar/username — match that
// shape so the interactive tree can render avatar match cards.
type ParticipantWithProfile = BracketParticipant & {
  user_profiles: {
    avatar_url: string | null;
    username:   string | null;
    nombre:     string | null;
    apellidos:  string | null;
  } | null;
};

type BracketData = {
  bracket:      Bracket;
  participants: ParticipantWithProfile[];
  matches:      BracketMatch[];
} | null;

type RosterEntry = { userProfileId: number; name: string; included: boolean };

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
  const [fullscreen, setFullscreen]   = useState(false);

  // Escape closes the fullscreen overlay; body scroll is also locked while open
  // so the page underneath doesn't scroll behind the bracket.
  useEffect(() => {
    if (!fullscreen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setFullscreen(false); }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [fullscreen]);

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
  // `published` is a vestigial enum value never written by the current code
  // but a few legacy brackets sit in it. Treat it as `draft` everywhere on
  // the client so the panel renders the setup UI (and the API guards in
  // /api/admin/brackets PATCH start + DELETE accept it the same way).
  const isDraft   = status === "draft" || status === "published";
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

  // Which step of the 3-step bracket flow we're on. Drives the explainer
  // banner so an admin landing on the Bracket tab knows exactly what to do next.
  //   1 — pick participants + format (no bracket exists yet)
  //   2 — review pairings + start (draft exists, hasn't been started)
  //   3 — running (started or finished — no setup actions remain)
  const flowStep: 1 | 2 | 3 = isRunning ? 3 : (bracketData && isDraft ? 2 : 1);

  return (
    <div className="space-y-6">
      {error && <p className="font-body text-sm text-error bg-error/10 p-3">{error}</p>}

      {/* ── Flow explainer — three numbered steps, current highlighted ─── */}
      {!isRunning && (
        <div className="bg-surface-container p-4">
          <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-3">
            Cómo iniciar el torneo
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <FlowStep n={1} active={flowStep === 1} done={flowStep > 1}
              label="Elige participantes + formato" />
            <FlowStep n={2} active={flowStep === 2} done={flowStep > 2}
              label="Genera el bracket borrador" />
            <FlowStep n={3} active={false} done={false}
              label="Inicia el torneo (va EN VIVO)" />
          </div>
          {flowStep === 1 && roster.length === 0 && (
            <p className="font-body text-xs text-outline mt-3">
              Aún no hay jugadores inscritos. Agrégalos desde la pestaña{" "}
              <strong className="text-on-surface">Inscripciones</strong>{" "}
              o pídeles que se registren en la página pública del torneo.
            </p>
          )}
          {flowStep === 1 && roster.length > 0 && includedIds.length < 2 && (
            <p className="font-body text-xs text-outline mt-3">
              Marca al menos 2 participantes con la casilla a la izquierda antes de generar el bracket.
            </p>
          )}
          {flowStep === 2 && (
            <p className="font-body text-xs text-outline mt-3">
              ✔ Bracket borrador listo. Revisa los enfrentamientos a la derecha y dale a{" "}
              <strong className="text-on-surface">Iniciar Torneo</strong> cuando todo se vea bien.
              Si necesitas cambiar algo, regenera el bracket o elimínalo y vuelve a empezar.
            </p>
          )}
        </div>
      )}

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
                {busy
                  ? "Procesando…"
                  : bracketData
                    ? "Regenerar bracket borrador"
                    : "Generar bracket (paso 2)"}
              </button>
              <p className="font-body text-xs text-outline">
                El bracket se genera como <span className="text-on-surface">borrador privado</span>: puedes
                regenerarlo o ajustar participantes las veces que necesites antes de iniciar.
                No es visible al público hasta el paso 3.
              </p>
            </div>

            {isDraft && bracketData && (
              <div className="bg-surface-container p-5 space-y-4">
                <p className="font-headline font-bold text-xs uppercase tracking-widest text-primary-container">
                  Paso 3 · Enfrentamientos iniciales
                </p>
                <p className="font-body text-xs text-outline -mt-2">
                  Revisa los pares. Si todo se ve bien, dale a <strong className="text-on-surface">Iniciar Torneo</strong> al final.
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

      {/* ── RUNNING / COMPLETED — interactive tree ──────────────────── */}
      {bracketData && isRunning && (
        <div className="space-y-4">
          <div className="bg-surface-container p-3 flex flex-wrap items-center gap-3">
            <span className={`font-headline font-black text-[10px] uppercase tracking-widest px-2 py-1 ${
              bracketData.bracket.status === "completed"
                ? "bg-surface-container-high text-on-surface"
                : "bg-primary text-background animate-pulse"
            }`}>
              {bracketData.bracket.status === "completed" ? "Torneo finalizado" : "Torneo en curso"}
            </span>
            <span className="font-body text-xs text-outline">
              {bracketData.bracket.format === "double_elimination" ? "Doble eliminación" : "Eliminación simple"}
              {" · "}
              {bracketData.bracket.participant_count} participantes
            </span>
            <span className="font-body text-xs text-outline ml-auto hidden md:inline">
              Haz clic en el ganador de cada partida. <strong className="text-on-surface">Deshacer</strong> al pie para revertir.
            </span>
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="flex items-center gap-1.5 bg-surface-container-high hover:bg-primary-container/20 text-on-surface font-headline font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 transition-colors"
              title="Ver bracket en pantalla completa"
            >
              <span className="material-symbols-outlined text-sm">open_in_full</span>
              Pantalla completa
            </button>
          </div>

          {/*
            Compact, contained view. `min-w-0` is the key bit — without it,
            the flex/grid ancestor in the cockpit would let the SVG-rendered
            bracket push the tab content (and the whole page) wider than the
            viewport. With `min-w-0` + `overflow-x-auto` the bracket scrolls
            horizontally INSIDE this card instead of dragging the layout.
          */}
          <div className="min-w-0 max-w-full overflow-x-auto bg-surface-container/30 p-3">
            <TournamentBracketView
              data={bracketData}
              scale="admin"
              onPickWinner={pickWinner}
              onUndo={undoMatch}
              busy={busy}
            />
          </div>
        </div>
      )}

      {/* ── Fullscreen overlay ─────────────────────────────────────── */}
      {fullscreen && bracketData && isRunning && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between bg-surface-container px-6 py-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`font-headline font-black text-[10px] uppercase tracking-widest px-2 py-1 ${
                bracketData.bracket.status === "completed"
                  ? "bg-surface-container-high text-on-surface"
                  : "bg-primary text-background animate-pulse"
              }`}>
                {bracketData.bracket.status === "completed" ? "Finalizado" : "En curso"}
              </span>
              <p className="font-headline font-black text-base uppercase tracking-tighter text-on-surface truncate">
                {tournament.name}
              </p>
              <span className="font-body text-xs text-outline shrink-0 hidden sm:inline">
                {bracketData.bracket.format === "double_elimination" ? "Doble eliminación" : "Eliminación simple"}
                {" · "}
                {bracketData.bracket.participant_count} participantes
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="flex items-center gap-1.5 bg-surface-container-high hover:bg-error/20 hover:text-error text-on-surface font-headline font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 transition-colors shrink-0"
              title="Salir de pantalla completa (Esc)"
            >
              <span className="material-symbols-outlined text-sm">close_fullscreen</span>
              Salir (Esc)
            </button>
          </div>
          <div className="flex-1 overflow-auto px-6 py-4">
            <TournamentBracketView
              data={bracketData}
              scale="admin"
              onPickWinner={pickWinner}
              onUndo={undoMatch}
              busy={busy}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Flow explainer step ──────────────────────────────────────────────────

function FlowStep({
  n, label, active, done,
}: {
  n: number; label: string; active: boolean; done: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 p-3 ${
      active ? "bg-primary-container/15 ring-2 ring-primary-container ring-inset"
      : done   ? "bg-tertiary/10"
      :          "bg-surface-container-high/50"
    }`}>
      <span className={`w-7 h-7 shrink-0 flex items-center justify-center font-headline font-black text-sm ${
        active ? "bg-primary-container text-white"
        : done   ? "bg-tertiary text-background"
        :          "bg-surface-container-high text-outline"
      }`}>
        {done ? <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check</span> : n}
      </span>
      <p className={`font-headline font-bold text-xs uppercase tracking-tight pt-1 ${
        active ? "text-on-surface" : done ? "text-on-surface/70" : "text-outline"
      }`}>
        {label}
      </p>
    </div>
  );
}

