"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useSendTransaction, useWallets, useConnectWallet } from "@privy-io/react-auth";
import { encodeFunctionData, parseUnits } from "viem";
import { publicClient, ONE_UP_TOKEN, ERC20_TRANSFER_ABI } from "@/lib/viem";
import { pointsFor, POINTS_BY_POSITION } from "@/lib/tournamentPoints";
import type { TournamentResult, TournamentPrize, PrizeDeliveryStatus } from "@/types/database.types";

type ResultWithRelations = TournamentResult & {
  user_profiles: { nombre: string | null; apellidos: string | null; username: string | null } | null;
  tournaments:   { name: string } | null;
};

type Registration = {
  id: number;
  user_profile_id: number;
  user_profiles: { nombre: string | null; apellidos: string | null; username: string | null } | null;
};

interface Props {
  tournaments: { id: number; name: string; status: string; date: string | null }[];
  results:     ResultWithRelations[];
  prizes:      TournamentPrize[];
}

const MEDALS = ["", "🥇", "🥈", "🥉"];
const POSITIONS = [1, 2, 3] as const;

const PRIZE_STATUS_LABELS: Record<PrizeDeliveryStatus, string> = {
  no_prize: "SIN PREMIO",
  pending:  "PENDIENTE",
  sent:     "ENTREGADO",
};

const PRIZE_STATUS_COLORS: Record<PrizeDeliveryStatus, string> = {
  no_prize: "bg-on-surface/10 text-on-surface/40",
  pending:  "bg-secondary-container/20 text-secondary",
  sent:     "bg-tertiary/20 text-tertiary",
};

function truncate(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function fullName(p: { nombre: string | null; apellidos: string | null; username: string | null } | null) {
  if (!p) return "—";
  return [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.username || "—";
}

export function AdminTournamentResultsClient({ tournaments, results, prizes }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const { sendTransaction } = useSendTransaction();
  const { wallets } = useWallets();
  const { connectWallet } = useConnectWallet();

  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const [registrations, setRegistrations]           = useState<Registration[]>([]);
  const [podium, setPodium]                         = useState<Record<number, string>>({ 1: "", 2: "", 3: "" });
  const [customPoints, setCustomPoints]             = useState<Record<number, string>>({});
  const [loading, setLoading]                       = useState(false);
  const [saveError, setSaveError]                   = useState<string | null>(null);

  const [openDelivery, setOpenDelivery]   = useState<number | null>(null);
  const [walletFor, setWalletFor]         = useState<Record<number, string | null>>({});
  const [adminWallet, setAdminWallet]     = useState<string>("");
  const [sendStep, setSendStep]           = useState<"idle" | "sending" | "waiting">("idle");
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [uploadingId, setUploadingId]     = useState<number | null>(null);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  useEffect(() => {
    if (!selectedTournament) { setRegistrations([]); return; }
    getAccessToken().then(async (token) => {
      const res = await fetch(`/api/admin/tournament-registrations?tournamentId=${selectedTournament}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRegistrations(data);

      const existing = results.filter((r) => String(r.tournament_id) === selectedTournament);
      const pre: Record<number, string> = { 1: "", 2: "", 3: "" };
      existing.forEach((r) => { pre[r.position] = String(r.user_profile_id); });
      setPodium(pre);
    });
  }, [selectedTournament, getAccessToken, results]);

  const existingResults = useMemo(
    () => results.filter((r) => String(r.tournament_id) === selectedTournament),
    [results, selectedTournament],
  );

  const tournamentPrizes = useMemo(
    () => prizes.filter((p) => String(p.tournament_id) === selectedTournament),
    [prizes, selectedTournament],
  );

  function prizeFor(position: number): TournamentPrize | undefined {
    return tournamentPrizes.find((p) => p.position === position);
  }

  async function loadWallet(resultId: number, userProfileId: number) {
    if (walletFor[resultId] !== undefined) return;
    const token = await getAccessToken();
    const res   = await fetch(`/api/admin/tournament-results?walletFor=${userProfileId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data: { wallet: string | null } = await res.json();
    setWalletFor((prev) => ({ ...prev, [resultId]: data.wallet }));
  }

  async function savePodium() {
    setSaveError(null); setLoading(true);
    for (const pos of POSITIONS) {
      const uid = podium[pos];
      if (!uid) continue;
      const pts = customPoints[pos] ? parseInt(customPoints[pos]) : pointsFor(pos);
      const res = await fetch("/api/admin/tournament-results", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ tournamentId: parseInt(selectedTournament), userProfileId: parseInt(uid), position: pos, points: pts }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSaveError(err.error ?? "Error al guardar."); setLoading(false); return;
      }
    }
    setLoading(false); router.refresh();
  }

  async function deleteResult(id: number) {
    await fetch("/api/admin/tournament-results", {
      method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  async function handleSendTokens(result: ResultWithRelations, prize: TournamentPrize) {
    setDeliveryError(null);
    const wallet = walletFor[result.id];
    if (!wallet) { setDeliveryError("El ganador no tiene wallet registrada."); return; }
    if (!prize.amount_tokens || Number(prize.amount_tokens) <= 0) {
      setDeliveryError("Monto de tokens inválido."); return;
    }
    const adminAddr = adminWallet || wallets[0]?.address;
    if (!adminAddr) { setDeliveryError("Conecta una wallet de admin primero."); return; }

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
        { to: ONE_UP_TOKEN.address, data, chainId: 8453 },
        { address: adminAddr, sponsor: true },
      );
      hash = tx.hash;
    } catch (e) {
      setDeliveryError(e instanceof Error ? e.message : "Error al enviar la transacción.");
      setSendStep("idle"); return;
    }

    setSendStep("waiting");
    try {
      await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}`, timeout: 120_000 });
    } catch {
      setDeliveryError(`TX enviada pero confirmación tardó demasiado. Hash: ${hash}`);
      setSendStep("idle"); return;
    }

    const res = await fetch("/api/admin/tournament-results", {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify({ id: result.id, prizeStatus: "sent", prizeTxHash: hash }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setDeliveryError(d.error ?? "Error al registrar entrega.");
      setSendStep("idle"); return;
    }
    setSendStep("idle");
    setOpenDelivery(null);
    router.refresh();
  }

  async function handleUploadCop(result: ResultWithRelations, file: File) {
    setDeliveryError(null);
    if (file.size > 5 * 1024 * 1024) {
      setDeliveryError("Archivo demasiado grande (máx 5MB)."); return;
    }
    setUploadingId(result.id);
    const token = await getAccessToken();
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "tournament-prizes");
    fd.append("entityId", String(result.id));
    const upload = await fetch("/api/admin/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!upload.ok) {
      const d = await upload.json().catch(() => ({}));
      setDeliveryError(d.error ?? "Error al subir el archivo.");
      setUploadingId(null); return;
    }
    const { url } = await upload.json();

    const patch = await fetch("/api/admin/tournament-results", {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify({ id: result.id, prizeStatus: "sent", prizeComprobanteUrl: url }),
    });
    if (!patch.ok) {
      const d = await patch.json().catch(() => ({}));
      setDeliveryError(d.error ?? "Error al registrar entrega.");
      setUploadingId(null); return;
    }
    setUploadingId(null);
    setOpenDelivery(null);
    router.refresh();
  }

  const playerName = (r: Registration) => fullName(r.user_profiles) !== "—" ? fullName(r.user_profiles) : `ID ${r.user_profile_id}`;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
          HALL OF <span className="text-primary-container">FAME</span>
        </h1>
        <div className="h-1 w-16 bg-primary-container mt-2" />
        <p className="font-body text-sm text-outline mt-2">
          Registra los resultados del pódium para torneos completados. 1° = {POINTS_BY_POSITION[1]}pts · 2° = {POINTS_BY_POSITION[2]}pts · 3° = {POINTS_BY_POSITION[3]}pts
        </p>
      </div>

      <div className="mb-8">
        <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-2">
          Seleccionar torneo
        </label>
        <select
          value={selectedTournament}
          onChange={(e) => { setSelectedTournament(e.target.value); setSaveError(null); setOpenDelivery(null); }}
          className="bg-surface-container text-on-background font-headline font-bold text-sm px-4 py-3 border-none focus:outline-none w-full max-w-md"
        >
          <option value="">— Elige un torneo completado —</option>
          {tournaments.map((t) => (
            <option key={t.id} value={String(t.id)}>
              {t.name} {t.date ? `(${new Date(t.date).toLocaleDateString("es-CO", { month: "short", year: "numeric" })})` : ""}
            </option>
          ))}
        </select>
      </div>

      {selectedTournament && (
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="font-headline font-black text-xl uppercase tracking-tighter mb-6">
              Asignar pódium
            </h2>
            <div className="space-y-4">
              {POSITIONS.map((pos) => (
                <div key={pos} className="bg-surface-container p-4 space-y-2">
                  <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline flex items-center gap-2">
                    <span>{MEDALS[pos]}</span> {pos}° Lugar — {POINTS_BY_POSITION[pos]} pts base
                  </label>
                  <select
                    value={podium[pos]}
                    onChange={(e) => setPodium((p) => ({ ...p, [pos]: e.target.value }))}
                    className="w-full bg-surface-container-lowest text-on-background font-headline font-bold text-sm p-3 border-none focus:outline-none"
                  >
                    <option value="">— Sin asignar —</option>
                    {registrations.map((r) => (
                      <option key={r.id} value={String(r.user_profile_id)}>{playerName(r)}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <label className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline/60">
                      Puntos personalizados (opcional):
                    </label>
                    <input
                      type="number"
                      value={customPoints[pos] ?? ""}
                      onChange={(e) => setCustomPoints((p) => ({ ...p, [pos]: e.target.value }))}
                      placeholder={String(POINTS_BY_POSITION[pos])}
                      className="w-16 bg-surface-container-lowest text-on-background font-headline font-bold text-xs p-2 border-none focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            {saveError && <p className="font-body text-sm text-error mt-3">{saveError}</p>}

            <button
              onClick={savePodium}
              disabled={loading || !Object.values(podium).some(Boolean)}
              className="mt-6 w-full bg-primary-container text-white font-headline font-black py-3 uppercase tracking-tighter disabled:opacity-40 hover:neo-shadow-pink transition-all"
            >
              {loading ? "GUARDANDO…" : "GUARDAR PÓDIUM"}
            </button>
          </div>

          <div>
            <h2 className="font-headline font-black text-xl uppercase tracking-tighter mb-6">
              Resultados actuales
            </h2>
            {existingResults.length === 0 ? (
              <p className="font-body text-sm text-outline/50">Sin resultados registrados aún.</p>
            ) : (
              <div className="space-y-3">
                {existingResults.map((r) => (
                  <div key={r.id} className="flex items-center gap-4 bg-surface-container p-4">
                    <span className="text-xl w-8">{MEDALS[r.position]}</span>
                    <div className="flex-1">
                      <p className="font-headline font-bold text-sm text-on-surface">
                        {fullName(r.user_profiles)}
                      </p>
                      <p className="font-body text-xs text-outline">{r.points} pts</p>
                    </div>
                    <span className={`font-headline font-bold text-[10px] uppercase px-2 py-1 ${PRIZE_STATUS_COLORS[r.prize_status]}`}>
                      {PRIZE_STATUS_LABELS[r.prize_status]}
                    </span>
                    <button
                      onClick={() => deleteResult(r.id)}
                      className="p-1.5 text-outline hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prize delivery section */}
      {selectedTournament && existingResults.length > 0 && (
        <div className="mt-12">
          <h2 className="font-headline font-black text-xl uppercase tracking-tighter mb-2">
            Entregar premios
          </h2>
          <p className="font-body text-sm text-outline mb-6">
            Envía $1UP a la wallet del ganador o sube el comprobante de transferencia COP. Las wallets se cargan al expandir cada premio.
          </p>

          <div className="space-y-3">
            {existingResults.map((r) => {
              const prize = prizeFor(r.position);
              const showsTokens = prize && (prize.prize_type === "tokens" || prize.prize_type === "both");
              const showsCop    = prize && (prize.prize_type === "cop"    || prize.prize_type === "both");
              const isOpen      = openDelivery === r.id;

              return (
                <div key={r.id} className="bg-surface-container">
                  <div className="flex items-center gap-4 p-4">
                    <span className="text-xl w-8">{MEDALS[r.position]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-headline font-bold text-sm text-on-surface truncate">
                        {fullName(r.user_profiles)}
                      </p>
                      <p className="font-body text-xs text-outline">
                        {prize ? (
                          <>
                            {showsTokens && prize.amount_tokens && (
                              <span className="text-tertiary">{Number(prize.amount_tokens).toLocaleString("es-CO")} $1UP</span>
                            )}
                            {showsTokens && showsCop && <span className="mx-1">+</span>}
                            {showsCop && prize.amount_cop && (
                              <span className="text-on-surface/70">${prize.amount_cop.toLocaleString("es-CO")} COP</span>
                            )}
                          </>
                        ) : (
                          <span className="text-outline/50">Sin premio configurado</span>
                        )}
                      </p>
                    </div>
                    <span className={`font-headline font-bold text-[10px] uppercase px-2 py-1 ${PRIZE_STATUS_COLORS[r.prize_status]}`}>
                      {PRIZE_STATUS_LABELS[r.prize_status]}
                    </span>
                    {prize && r.prize_status !== "sent" && (
                      <button
                        onClick={() => {
                          if (isOpen) { setOpenDelivery(null); return; }
                          setOpenDelivery(r.id);
                          setDeliveryError(null);
                          setAdminWallet(wallets[0]?.address ?? "");
                          loadWallet(r.id, r.user_profile_id);
                        }}
                        className="bg-primary-container text-white font-headline font-bold text-[10px] uppercase px-4 py-2 hover:neo-shadow-pink transition-all"
                      >
                        {isOpen ? "CERRAR" : "ENTREGAR"}
                      </button>
                    )}
                    {r.prize_status === "sent" && (
                      <div className="flex gap-2">
                        {r.prize_tx_hash && (
                          <a
                            href={`https://basescan.org/tx/${r.prize_tx_hash}`}
                            target="_blank" rel="noopener noreferrer"
                            className="font-mono text-[10px] text-tertiary hover:text-tertiary/70"
                            title="Ver transacción"
                          >
                            <span className="material-symbols-outlined text-sm">link</span>
                          </a>
                        )}
                        {r.prize_comprobante_url && (
                          <a
                            href={r.prize_comprobante_url}
                            target="_blank" rel="noopener noreferrer"
                            className="text-tertiary hover:text-tertiary/70"
                            title="Ver comprobante"
                          >
                            <span className="material-symbols-outlined text-sm">receipt_long</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {isOpen && prize && (
                    <div className="border-t border-on-surface/5 p-4 space-y-4 bg-surface-container-lowest">
                      {showsTokens && prize.amount_tokens && (
                        <div className="space-y-3">
                          <p className="font-headline font-bold text-xs uppercase tracking-widest text-tertiary">
                            Enviar $1UP
                          </p>
                          <div className="bg-surface-container p-3 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-headline uppercase text-on-surface/50">Monto</span>
                              <span className="font-headline font-black text-tertiary">
                                {Number(prize.amount_tokens).toLocaleString("es-CO")} $1UP
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="font-headline uppercase text-on-surface/50">Wallet ganador</span>
                              <span className="font-mono text-xs text-on-surface">
                                {walletFor[r.id] === undefined
                                  ? "Cargando..."
                                  : walletFor[r.id]
                                  ? truncate(walletFor[r.id]!)
                                  : "— sin wallet —"}
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-2">
                              Wallet del admin
                            </label>
                            {wallets.length === 0 ? (
                              <button
                                onClick={() => connectWallet()}
                                className="w-full bg-primary-container/20 text-primary-container font-headline font-bold text-xs uppercase py-3 hover:bg-primary-container/30 transition-colors"
                              >
                                + CONECTAR WALLET
                              </button>
                            ) : (
                              <div className="space-y-2">
                                {wallets.map((w) => (
                                  <button
                                    key={w.address}
                                    onClick={() => setAdminWallet(w.address)}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                                      (adminWallet || wallets[0]?.address) === w.address
                                        ? "bg-tertiary/20 text-tertiary"
                                        : "bg-surface-container text-on-surface/60 hover:bg-surface-container-high"
                                    }`}
                                  >
                                    <span className="font-mono text-[11px]">{truncate(w.address)}</span>
                                    <span className="font-headline text-[10px] uppercase ml-2 text-on-surface/30">{w.walletClientType}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {sendStep !== "idle" && (
                            <div className="flex items-center gap-2 bg-tertiary/10 px-4 py-2">
                              <span className="material-symbols-outlined text-tertiary animate-spin text-sm">progress_activity</span>
                              <span className="font-headline text-xs uppercase text-tertiary">
                                {sendStep === "sending" ? "Confirmando en wallet..." : "Esperando confirmación..."}
                              </span>
                            </div>
                          )}

                          <button
                            onClick={() => handleSendTokens(r, prize)}
                            disabled={sendStep !== "idle" || !walletFor[r.id] || wallets.length === 0}
                            className="w-full bg-tertiary text-background font-headline font-black py-3 uppercase tracking-tighter disabled:opacity-40 flex items-center justify-center gap-2"
                          >
                            <span className="material-symbols-outlined text-base">send</span>
                            ENVIAR {Number(prize.amount_tokens).toLocaleString("es-CO")} $1UP
                          </button>
                        </div>
                      )}

                      {showsCop && prize.amount_cop && (
                        <div className="space-y-3">
                          <p className="font-headline font-bold text-xs uppercase tracking-widest text-secondary">
                            Comprobante COP — ${prize.amount_cop.toLocaleString("es-CO")}
                          </p>
                          <p className="font-body text-xs text-outline">
                            Sube el comprobante de la transferencia bancaria (jpg, png o pdf, máx 5MB).
                          </p>
                          <label className="block">
                            <span className="sr-only">Archivo</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,application/pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadCop(r, file);
                              }}
                              disabled={uploadingId === r.id}
                              className="block w-full text-xs text-on-surface/70 file:bg-secondary file:text-background file:font-headline file:font-black file:text-xs file:uppercase file:tracking-tighter file:py-2 file:px-4 file:border-0 file:mr-3 hover:file:bg-secondary/80 disabled:opacity-50"
                            />
                          </label>
                          {uploadingId === r.id && (
                            <p className="font-headline text-xs uppercase text-secondary animate-pulse">
                              Subiendo...
                            </p>
                          )}
                        </div>
                      )}

                      {deliveryError && (
                        <p className="font-body text-sm text-error">{deliveryError}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!selectedTournament && results.length > 0 && (
        <div className="mt-4">
          <h2 className="font-headline font-black text-xl uppercase tracking-tighter mb-6">Todos los resultados</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container-high">
                  {["Torneo", "Posición", "Jugador", "Puntos", "Premio", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-headline font-black text-xs uppercase tracking-widest text-outline">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="even:bg-surface-container-low">
                    <td className="px-4 py-3 font-body text-on-surface/70">{r.tournaments?.name ?? "—"}</td>
                    <td className="px-4 py-3 font-headline font-bold text-on-surface">{MEDALS[r.position]} {r.position}°</td>
                    <td className="px-4 py-3 font-headline font-bold text-on-surface">
                      {fullName(r.user_profiles)}
                    </td>
                    <td className="px-4 py-3 font-headline font-black text-primary-container">{r.points} pts</td>
                    <td className="px-4 py-3">
                      <span className={`font-headline font-bold text-[10px] uppercase px-2 py-1 ${PRIZE_STATUS_COLORS[r.prize_status]}`}>
                        {PRIZE_STATUS_LABELS[r.prize_status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteResult(r.id)} className="p-1 text-outline hover:text-error transition-colors">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
