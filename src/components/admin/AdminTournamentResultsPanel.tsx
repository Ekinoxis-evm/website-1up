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
import { usePrivy, useSendTransaction, useWallets } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { encodeFunctionData, parseUnits } from "viem";
import { Avatar } from "@/components/ui/Avatar";
import { publicClient, ONE_UP_TOKEN, ERC20_TRANSFER_ABI } from "@/lib/viem";
import type { TournamentPrize, TournamentResult } from "@/types/database.types";

export type ResultRow = TournamentResult & {
  user_profiles: {
    nombre:     string | null;
    apellidos:  string | null;
    username:   string | null;
    avatar_url: string | null;
  } | null;
  pass: { state: "issued" | "active" | "expired" | "revoked" } | null;
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
  const parts: string[] = [];
  if ((p.prize_type === "tokens" || p.prize_type === "both") && p.amount_tokens)
    parts.push(`${Number(p.amount_tokens).toLocaleString("es-CO")} $1UP`);
  if ((p.prize_type === "cop" || p.prize_type === "both") && p.amount_cop)
    parts.push(`$${p.amount_cop.toLocaleString("es-CO")} COP`);
  if (p.includes_pass && p.pass_days)
    parts.push(`Pase ${p.pass_days}d`);
  return parts.length ? parts.join(" + ") : "—";
}

export function AdminTournamentResultsPanel({
  tournamentId, tournamentName, prizes, results, candidates, onChange,
}: Props) {
  const { getAccessToken } = usePrivy();
  const { sendTransaction } = useSendTransaction();
  const { wallets } = useWallets();
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
  // On-chain delivery: per-result winner wallet cache + send-state machine.
  const [walletFor, setWalletFor] = useState<Record<number, string | null>>({});
  const [sendStep,  setSendStep]  = useState<"idle" | "loading-wallet" | "sending" | "waiting">("idle");

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  // Lazy-fetch the winner's embedded wallet so we know where to send the prize.
  async function loadWallet(resultId: number, userProfileId: number): Promise<string | null> {
    if (walletFor[resultId] !== undefined) return walletFor[resultId];
    const token = await getAccessToken();
    const res = await fetch(
      `/api/admin/tournament-results?walletFor=${userProfileId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) { setWalletFor((p) => ({ ...p, [resultId]: null })); return null; }
    const data: { wallet: string | null } = await res.json();
    setWalletFor((p) => ({ ...p, [resultId]: data.wallet }));
    return data.wallet;
  }

  // Sponsored on-chain $1UP transfer from the admin's connected wallet to the
  // winner's embedded wallet. Captures the tx hash, waits for confirmation,
  // then PATCHes the result to `sent` with the hash.
  async function sendPrizeOnChain(result: ResultRow, prize: TournamentPrize) {
    if (!prize.amount_tokens || Number(prize.amount_tokens) <= 0) {
      setError("Este premio no tiene monto en $1UP configurado."); return;
    }
    const adminAddr = wallets[0]?.address;
    if (!adminAddr) {
      setError("Conecta una wallet de administrador antes de enviar el premio."); return;
    }
    setBusy(result.id); setError(null);

    setSendStep("loading-wallet");
    const wallet = await loadWallet(result.id, result.user_profile_id);
    if (!wallet) {
      setError("El ganador no tiene wallet registrada — usa entrega manual.");
      setSendStep("idle"); setBusy(null); return;
    }

    setSendStep("sending");
    let hash: string;
    try {
      const data = encodeFunctionData({
        abi: ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args: [
          wallet as `0x${string}`,
          parseUnits(String(prize.amount_tokens), ONE_UP_TOKEN.decimals),
        ],
      });
      const tx = await sendTransaction(
        // value: BigInt(0) is mandatory — Privy's bundler classifies the tx as
        // a sponsored EIP-7702 op only when value is explicit. Same pattern as
        // BuyPassWizard / CourseCheckoutWizard / WalletTab. See CLAUDE.md.
        { to: ONE_UP_TOKEN.address, value: BigInt(0), data, chainId: 8453 },
        { address: adminAddr, sponsor: true },
      );
      hash = tx.hash;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar la transacción.");
      setSendStep("idle"); setBusy(null); return;
    }

    setSendStep("waiting");
    try {
      await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}`, timeout: 120_000 });
    } catch {
      setError(`Transacción enviada pero la confirmación tardó demasiado. Hash: ${hash}`);
      setSendStep("idle"); setBusy(null); return;
    }

    try {
      const res = await fetch("/api/admin/tournament-results", {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify({ id: result.id, prizeStatus: "sent", prizeTxHash: hash }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Error al registrar la entrega.");
        return;
      }
      setOpenSentFor(null);
      router.refresh();
      onChange?.();
    } finally {
      setSendStep("idle"); setBusy(null);
    }
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

  async function deliverPass(resultId: number) {
    if (!confirm("¿Entregar Pase 1UP al ganador? Se creará un pase pendiente de activación (el ganador lo activa cuando quiera).")) return;
    setBusy(resultId); setError(null);
    try {
      const res = await fetch("/api/admin/tournament-results/deliver-pass", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ resultId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo entregar el pase.");
        return;
      }
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

                  {/* ── Pase 1UP — separate from the tokens/COP delivery ─────────── */}
                  {prize?.includes_pass && prize.pass_days && (
                    <div className="mt-2 bg-surface-container-high p-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-primary-container">card_membership</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-on-surface">
                          Pase 1UP · {prize.pass_days} días
                        </p>
                      </div>
                      {result.pass_id ? (
                        result.pass?.state === "active" ? (
                          <span className="font-headline font-black text-[10px] uppercase tracking-widest px-2 py-1 bg-tertiary/20 text-tertiary">
                            Activado
                          </span>
                        ) : (
                          <span className="font-headline font-black text-[10px] uppercase tracking-widest px-2 py-1 bg-secondary-container/40 text-secondary">
                            Entregado · sin activar
                          </span>
                        )
                      ) : (
                        <button
                          onClick={() => deliverPass(result.id)}
                          disabled={busy === result.id}
                          className="bg-primary-container text-white font-headline font-black text-[10px] uppercase tracking-widest px-3 py-1.5 hover:opacity-90 disabled:opacity-40 transition-opacity"
                        >
                          Entregar pase
                        </button>
                      )}
                    </div>
                  )}
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
        Cuando termina el bracket, las posiciones se llenan automáticamente desde el cuadro.
        Aquí puedes sobreescribir cualquier posición y registrar la entrega de los premios —
        para premios en $1UP puedes pagar on-chain desde tu wallet con un solo click.
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
      {openSentFor !== null && (() => {
        const targetResult = results.find(r => r.id === openSentFor);
        const targetPrize  = targetResult ? prizes.find(p => p.position === targetResult.position) : undefined;
        const hasTokenPrize = !!targetPrize && (targetPrize.prize_type === "tokens" || targetPrize.prize_type === "both") && !!targetPrize.amount_tokens;
        const sendBusy = sendStep !== "idle";
        const sendLabel =
          sendStep === "loading-wallet" ? "BUSCANDO WALLET…" :
          sendStep === "sending"        ? "FIRMA EN TU WALLET…" :
          sendStep === "waiting"        ? "ESPERANDO CONFIRMACIÓN…" :
                                          `ENVIAR ${targetPrize?.amount_tokens ? Number(targetPrize.amount_tokens).toLocaleString("es-CO") : ""} $1UP`;
        return (
          <Modal onClose={() => { if (!sendBusy) setOpenSentFor(null); }}>
            <h3 className="font-headline font-black text-xl uppercase tracking-tighter mb-1">
              REGISTRAR <span className="text-primary-container">ENTREGA</span>
            </h3>
            <p className="font-body text-xs text-outline mb-4">
              Paga el premio on-chain desde tu wallet, o registra una entrega manual (transferencia bancaria / tx ya enviada).
            </p>

            {/* On-chain path — only if the prize includes a $1UP amount */}
            {hasTokenPrize && targetResult && targetPrize && (
              <div className="bg-surface-container-high p-4 mb-4">
                <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-2">
                  Pago automático on-chain
                </p>
                <p className="font-body text-xs text-outline mb-3">
                  Enviarás <strong className="text-on-surface">{Number(targetPrize.amount_tokens).toLocaleString("es-CO")} $1UP</strong> a la wallet del ganador desde tu wallet conectada. La transacción usa gas patrocinado.
                </p>
                <button
                  onClick={() => sendPrizeOnChain(targetResult, targetPrize)}
                  disabled={sendBusy || wallets.length === 0}
                  className="w-full bg-primary-container text-white font-headline font-black py-3 uppercase tracking-tight disabled:opacity-40"
                >
                  {sendLabel}
                </button>
                {wallets.length === 0 && (
                  <p className="font-body text-[10px] text-error mt-2">
                    No tienes una wallet conectada. Conéctala desde el panel de wallet del admin.
                  </p>
                )}
              </div>
            )}

            <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-2">
              Registro manual
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
                Necesitas al menos uno de los dos para registrar manualmente.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => markSent(openSentFor)}
                  disabled={busy === openSentFor || sendBusy || (!txHash && !comprobanteUrl)}
                  className="flex-1 bg-surface-container-high text-on-surface font-headline font-black py-3 uppercase tracking-tight disabled:opacity-40"
                >
                  {busy === openSentFor && !sendBusy ? "GUARDANDO…" : "REGISTRAR MANUAL"}
                </button>
                <button
                  onClick={() => setOpenSentFor(null)}
                  disabled={busy === openSentFor || sendBusy}
                  className="px-4 bg-surface-container-high text-on-surface font-headline font-black uppercase disabled:opacity-40"
                >
                  CERRAR
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}
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
