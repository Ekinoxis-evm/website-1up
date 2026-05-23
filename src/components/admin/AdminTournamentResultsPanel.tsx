"use client";

// In-cockpit podium + prize-delivery editor for one tournament.
//
// Shows each configured prize position (1°/2°/3°) with:
//   • the assigned winner (avatar + name + wallet shortcut), or
//   • a "Asignar manualmente" picker if no result row exists yet
//   • the prize amount (formatted: tokens / cop / both)
//   • prize_status badge (no_prize / pending / sent)
//   • action: "Marcar entregado" (with optional tx_hash + comprobante URL),
//     or "Revertir" if already sent
//
// PR B's auto-podium fills 1st/2nd/3rd from the bracket on completion, so
// manual assignment here is the override path. Admin overrides via the
// same `POST /api/admin/tournament-results` endpoint (upsert on
// `tournament_id, position` conflict — overwrites the auto row, which is
// the documented contract).

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import type { TournamentPrize, TournamentResult } from "@/types/database.types";

export type ResultRow = TournamentResult & {
  user_profiles: {
    nombre:     string | null;
    apellidos:  string | null;
    username:   string | null;
    avatar_url: string | null;
  } | null;
};

export type RegistrationOption = {
  user_profile_id: number;
  name:            string;
  username:        string | null;
  avatar_url:      string | null;
};

interface Props {
  tournamentId:   number;
  tournamentName: string;
  prizes:         TournamentPrize[];                // configured prizes
  results:        ResultRow[];                      // current podium rows
  candidates:     RegistrationOption[];             // registered participants (eligible for manual assign)
  onChange?:      () => void;
}

const POSITION_LABEL: Record<number, string> = { 1: "1° LUGAR", 2: "2° LUGAR", 3: "3° LUGAR" };
const POSITION_MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const PRIZE_STATUS_LABEL: Record<string, string> = {
  no_prize: "Sin premio configurado",
  pending:  "Pendiente de entrega",
  sent:     "Entregado",
};
const PRIZE_STATUS_PILL: Record<string, string> = {
  no_prize: "bg-outline/10 text-outline",
  pending:  "bg-secondary/15 text-secondary",
  sent:     "bg-tertiary/20 text-tertiary",
};

function fmtPrize(p: TournamentPrize | undefined): string {
  if (!p) return "—";
  if (p.prize_type === "tokens" && p.amount_tokens)
    return `${Number(p.amount_tokens).toLocaleString("es-CO")} $1UP`;
  if (p.prize_type === "cop" && p.amount_cop)
    return `$${p.amount_cop.toLocaleString("es-CO")} COP`;
  if (p.prize_type === "both") {
    const parts: string[] = [];
    if (p.amount_tokens) parts.push(`${Number(p.amount_tokens).toLocaleString("es-CO")} $1UP`);
    if (p.amount_cop)    parts.push(`$${p.amount_cop.toLocaleString("es-CO")} COP`);
    return parts.join(" + ");
  }
  return "—";
}

export function AdminTournamentResultsPanel({
  tournamentId, tournamentName, prizes, results, candidates, onChange,
}: Props) {
  const { getAccessToken } = usePrivy();
  const router = useRouter();

  const [busy, setBusy]   = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // openAssignFor = position we're currently picking a winner for (1/2/3)
  const [openAssignFor, setOpenAssignFor] = useState<number | null>(null);
  const [openSentFor,   setOpenSentFor]   = useState<number | null>(null);
  // form state for the "Marcar entregado" modal
  const [txHash, setTxHash]               = useState("");
  const [comprobanteUrl, setComprobanteUrl] = useState("");
  // search inside the assign picker
  const [pickerQuery, setPickerQuery]     = useState("");

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  // The user expects each position to be visible even if no row exists. Pre-fill
  // a synthetic shape for missing positions so the layout stays consistent.
  const rows = useMemo(() => {
    return [1, 2, 3].map((position) => {
      const result = results.find(r => r.position === position) ?? null;
      const prize  = prizes.find(p => p.position === position);
      return { position, result, prize };
    });
  }, [results, prizes]);

  async function assignWinner(position: number, userProfileId: number) {
    setBusy(position); setError(null);
    try {
      const res = await fetch("/api/admin/tournament-results", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ tournamentId, userProfileId, position }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo asignar el ganador.");
        return;
      }
      setOpenAssignFor(null);
      setPickerQuery("");
      router.refresh();
      onChange?.();
    } finally {
      setBusy(null);
    }
  }

  async function markSent(resultId: number) {
    if (!txHash && !comprobanteUrl) {
      setError("Ingresa un tx_hash o una URL de comprobante.");
      return;
    }
    setBusy(resultId); setError(null);
    try {
      const res = await fetch("/api/admin/tournament-results", {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify({
          id: resultId,
          prizeStatus: "sent",
          ...(txHash         ? { prizeTxHash:         txHash } : {}),
          ...(comprobanteUrl ? { prizeComprobanteUrl: comprobanteUrl } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo marcar como entregado.");
        return;
      }
      setOpenSentFor(null);
      setTxHash(""); setComprobanteUrl("");
      router.refresh();
      onChange?.();
    } finally {
      setBusy(null);
    }
  }

  async function revertSent(resultId: number) {
    if (!confirm("¿Revertir entrega? El estado volverá a 'pendiente'.")) return;
    setBusy(resultId); setError(null);
    try {
      const res = await fetch("/api/admin/tournament-results", {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify({ id: resultId, prizeStatus: "pending" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo revertir.");
        return;
      }
      router.refresh();
      onChange?.();
    } finally {
      setBusy(null);
    }
  }

  // Filter the picker. Hide candidates already on the podium so admin can't
  // assign the same person to two positions.
  const usedProfileIds = new Set(results.map(r => r.user_profile_id));
  const pickerCandidates = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return candidates
      .filter(c => !usedProfileIds.has(c.user_profile_id))
      .filter(c => !q || c.name.toLowerCase().includes(q) || (c.username ?? "").toLowerCase().includes(q));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, pickerQuery, results]);

  return (
    <div className="space-y-4">
      {error && <p className="font-body text-sm text-error bg-error/10 p-3">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {rows.map(({ position, result, prize }) => {
          const winnerName = result?.user_profiles
            ? [result.user_profiles.nombre, result.user_profiles.apellidos].filter(Boolean).join(" ") || result.user_profiles.username || "—"
            : null;

          return (
            <div key={position} className="bg-surface-container p-5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline">
                  {POSITION_LABEL[position]}
                </p>
                <span className="text-2xl leading-none">{POSITION_MEDAL[position]}</span>
              </div>

              <p className="font-headline font-black text-sm text-on-surface mb-1">{fmtPrize(prize)}</p>
              <p className="font-body text-[10px] uppercase tracking-widest text-outline mb-4">
                {prize ? "Premio configurado" : "Sin premio configurado"}
              </p>

              {result ? (
                <>
                  <div className="flex items-center gap-3 bg-surface-container-high p-3 mb-3">
                    <Avatar
                      src={result.user_profiles?.avatar_url ?? null}
                      name={winnerName}
                      size="md"
                      square
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-headline font-bold text-sm text-on-surface truncate">{winnerName}</p>
                      {result.user_profiles?.username && (
                        <p className="font-body text-[11px] text-outline truncate">@{result.user_profiles.username}</p>
                      )}
                      <p className="font-body text-[11px] text-outline mt-0.5">
                        +{result.points ?? 0} pts
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-headline font-black text-[10px] uppercase tracking-widest px-2 py-1 ${PRIZE_STATUS_PILL[result.prize_status] ?? ""}`}>
                      {PRIZE_STATUS_LABEL[result.prize_status] ?? result.prize_status}
                    </span>
                  </div>

                  {result.prize_status === "sent" && (
                    <div className="space-y-1 mb-3">
                      {result.prize_tx_hash && (
                        <a
                          href={`https://basescan.org/tx/${result.prize_tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block font-mono text-[10px] text-secondary hover:underline truncate"
                        >
                          ↗ {result.prize_tx_hash}
                        </a>
                      )}
                      {result.prize_comprobante_url && (
                        <a
                          href={result.prize_comprobante_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block font-headline font-bold text-[10px] uppercase text-secondary hover:underline"
                        >
                          ↗ Ver comprobante
                        </a>
                      )}
                    </div>
                  )}

                  <div className="mt-auto flex gap-1.5">
                    {result.prize_status === "pending" && prize && (
                      <button
                        onClick={() => { setOpenSentFor(result.id); setTxHash(""); setComprobanteUrl(""); }}
                        disabled={busy === result.id}
                        className="flex-1 bg-primary-container text-white font-headline font-black text-[10px] uppercase tracking-widest py-2 hover:opacity-90 disabled:opacity-40 transition-opacity"
                      >
                        Marcar entregado
                      </button>
                    )}
                    {result.prize_status === "sent" && (
                      <button
                        onClick={() => revertSent(result.id)}
                        disabled={busy === result.id}
                        className="flex-1 bg-surface-container-high text-outline font-headline font-bold text-[10px] uppercase tracking-widest py-2 hover:text-on-surface transition-colors disabled:opacity-40"
                      >
                        Revertir
                      </button>
                    )}
                    <button
                      onClick={() => { setOpenAssignFor(position); setPickerQuery(""); }}
                      disabled={busy === result.id}
                      className="px-3 py-2 bg-surface-container-high text-outline font-headline font-bold text-[10px] uppercase tracking-widest hover:text-on-surface transition-colors disabled:opacity-40"
                      title="Reemplazar ganador"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => { setOpenAssignFor(position); setPickerQuery(""); }}
                  className="mt-auto bg-primary-container text-white font-headline font-black text-[10px] uppercase tracking-widest py-2 hover:opacity-90 transition-opacity"
                >
                  Asignar ganador
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="font-body text-xs text-outline">
        Cuando termina el bracket, las posiciones se llenan automáticamente desde el cuadro
        (audit-podium). Aquí puedes sobreescribir manualmente cualquier posición o registrar
        la entrega de los premios.{" "}
        <Link
          href={`/admin/tournament-results?tournamentId=${tournamentId}`}
          className="text-secondary hover:underline"
        >
          Ver vista detallada
        </Link>
      </p>

      {/* ── Assign winner picker ─────────────────────────────────────── */}
      {openAssignFor !== null && (
        <Modal onClose={() => { setOpenAssignFor(null); setPickerQuery(""); }}>
          <h3 className="font-headline font-black text-xl uppercase tracking-tighter mb-1">
            ASIGNAR <span className="text-primary-container">{POSITION_LABEL[openAssignFor]}</span>
          </h3>
          <p className="font-body text-xs text-outline mb-4">{tournamentName}</p>
          <input
            value={pickerQuery}
            onChange={e => setPickerQuery(e.target.value)}
            placeholder="Buscar por nombre o username…"
            className="w-full mb-3 bg-surface-container-lowest text-on-background p-3 font-body text-sm border-none focus:outline-none placeholder:text-outline/40"
            autoFocus
          />
          {pickerCandidates.length === 0 ? (
            <p className="font-body text-sm text-outline py-6 text-center">Sin candidatos disponibles.</p>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {pickerCandidates.map(c => (
                <button
                  key={c.user_profile_id}
                  onClick={() => assignWinner(openAssignFor, c.user_profile_id)}
                  disabled={busy === openAssignFor}
                  className="w-full flex items-center gap-3 bg-surface-container-high hover:bg-primary-container/20 px-3 py-2 text-left transition-colors disabled:opacity-40"
                >
                  <Avatar src={c.avatar_url} name={c.name} size="sm" square />
                  <div className="min-w-0">
                    <p className="font-headline font-bold text-sm text-on-surface truncate">{c.name}</p>
                    {c.username && (
                      <p className="font-body text-[11px] text-outline truncate">@{c.username}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* ── Mark sent modal ──────────────────────────────────────────── */}
      {openSentFor !== null && (
        <Modal onClose={() => setOpenSentFor(null)}>
          <h3 className="font-headline font-black text-xl uppercase tracking-tighter mb-1">
            REGISTRAR <span className="text-primary-container">ENTREGA</span>
          </h3>
          <p className="font-body text-xs text-outline mb-4">
            Sube el comprobante (transferencia bancaria) o pega el hash de transacción ($1UP on-chain).
          </p>
          <div className="space-y-3">
            <div>
              <label className="block font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-1">
                Tx hash <span className="text-outline/50 normal-case font-normal">(opcional)</span>
              </label>
              <input
                value={txHash}
                onChange={e => setTxHash(e.target.value)}
                placeholder="0x…"
                className="w-full bg-surface-container-lowest text-on-background p-3 font-mono text-xs border-none focus:outline-none placeholder:text-outline/40"
              />
            </div>
            <div>
              <label className="block font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-1">
                URL del comprobante <span className="text-outline/50 normal-case font-normal">(opcional)</span>
              </label>
              <input
                value={comprobanteUrl}
                onChange={e => setComprobanteUrl(e.target.value)}
                placeholder="https://…"
                className="w-full bg-surface-container-lowest text-on-background p-3 font-body text-sm border-none focus:outline-none placeholder:text-outline/40"
              />
            </div>
            <p className="font-body text-[11px] text-outline">
              Necesitas al menos uno de los dos para marcar como entregado.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => markSent(openSentFor)}
                disabled={busy === openSentFor || (!txHash && !comprobanteUrl)}
                className="flex-1 bg-primary-container text-white font-headline font-black py-3 uppercase tracking-tight disabled:opacity-40"
              >
                {busy === openSentFor ? "GUARDANDO…" : "MARCAR ENTREGADO"}
              </button>
              <button
                onClick={() => setOpenSentFor(null)}
                disabled={busy === openSentFor}
                className="px-4 bg-surface-container-high text-on-surface font-headline font-black uppercase disabled:opacity-40"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-container w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-outline hover:text-on-surface"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        {children}
      </div>
    </div>
  );
}
