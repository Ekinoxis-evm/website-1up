"use client";

import { useState, useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, parseUnits, formatUnits, isAddress } from "viem";
import { base } from "viem/chains";
import { use1upBalance } from "@/hooks/use1upBalance";
import { ONE_UP_TOKEN, ERC20_TRANSFER_ABI } from "@/lib/viem";
import { QRCodeSVG } from "qrcode.react";
import { BuyTokensWizard } from "@/components/perfil/BuyTokensWizard";
import { MisOrdenes } from "@/components/perfil/MisOrdenes";


type TxItem = {
  hash: string;
  timestamp: string;
  from: string;
  to: string;
  amount: string;
  direction: "send" | "receive";
};

type BlockscoutItem = {
  transaction_hash: string;
  timestamp: string;
  from: { hash: string };
  to: { hash: string };
  total: { value: string; decimals: string };
};

function formatTxAmount(amount: string) {
  const n = parseFloat(amount);
  if (isNaN(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function truncate(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function WalletTab() {
  const { user, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const [copied, setCopied] = useState(false);

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const activeWallet   = embeddedWallet ?? wallets[0];
  const walletAddress  = activeWallet?.address as `0x${string}` | undefined;

  const { balance, loading: balanceLoading } = use1upBalance(walletAddress);

  // Send modal state
  const [sendOpen, setSendOpen]       = useState(false);
  const [sendTo, setSendTo]           = useState("");
  const [sendAmount, setSendAmount]   = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError]     = useState<string | null>(null);
  const [sendTxHash, setSendTxHash]   = useState<string | null>(null);

  // Receive modal state
  const [receiveOpen, setReceiveOpen]     = useState(false);
  const [receiveCopied, setReceiveCopied] = useState(false);

  // Buy modal state
  const [buyOpen, setBuyOpen] = useState(false);

  // QR scanner state
  const [scanOpen, setScanOpen]   = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Transaction history
  const [txHistory, setTxHistory]   = useState<TxItem[]>([]);
  const [txLoading, setTxLoading]   = useState(false);

  useEffect(() => {
    if (!walletAddress) return;
    setTxLoading(true);
    fetch(
      `https://base.blockscout.com/api/v2/addresses/${walletAddress}/token-transfers?token=${ONE_UP_TOKEN.address}&limit=15`
    )
      .then((r) => r.json())
      .then((data) => {
        const items: TxItem[] = (data.items ?? []).map((item: BlockscoutItem) => ({
          hash: item.transaction_hash,
          timestamp: item.timestamp,
          from: item.from.hash,
          to: item.to.hash,
          amount: formatUnits(BigInt(item.total.value), parseInt(item.total.decimals)),
          direction:
            item.from.hash.toLowerCase() === walletAddress.toLowerCase()
              ? "send"
              : "receive",
        }));
        setTxHistory(items);
      })
      .catch(() => setTxHistory([]))
      .finally(() => setTxLoading(false));
  }, [walletAddress]);

  useEffect(() => {
    if (!scanOpen) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }
    let animFrame: number;
    async function startScan() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        streamRef.current = stream;
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scan();
      } catch {
        setScanError("No se pudo acceder a la cámara");
      }
    }
    function scan() {
      if (!videoRef.current || videoRef.current.readyState < 2) { animFrame = requestAnimationFrame(scan); return; }
      if (!("BarcodeDetector" in window)) { setScanError("Tu navegador no soporta escaneo de QR"); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      async function detect() {
        if (!videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            const value = codes[0].rawValue as string;
            const addr = value.startsWith("ethereum:") ? value.split(":")[1].split("@")[0] : value;
            setSendTo(addr);
            setScanOpen(false);
          } else {
            animFrame = requestAnimationFrame(detect);
          }
        } catch { animFrame = requestAnimationFrame(detect); }
      }
      detect();
    }
    startScan();
    return () => { cancelAnimationFrame(animFrame); streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [scanOpen]);

  async function handleSend() {
    if (!activeWallet || !walletAddress) return;
    if (!isAddress(sendTo)) { setSendError("Dirección inválida"); return; }
    const amt = parseFloat(sendAmount);
    if (isNaN(amt) || amt <= 0) { setSendError("Monto inválido"); return; }

    setSendLoading(true);
    setSendError(null);
    setSendTxHash(null);
    try {
      const provider = await activeWallet.getEthereumProvider();
      const walletClient = createWalletClient({ chain: base, transport: custom(provider) });
      const hash = await walletClient.writeContract({
        address:      ONE_UP_TOKEN.address,
        abi:          ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args:         [sendTo as `0x${string}`, parseUnits(sendAmount, ONE_UP_TOKEN.decimals)],
        account:      walletAddress,
      });
      setSendTxHash(hash);
      setSendTo(""); setSendAmount("");
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : "Error al enviar");
    } finally {
      setSendLoading(false);
    }
  }

  function copyAddress() {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyReceiveAddress() {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setReceiveCopied(true);
    setTimeout(() => setReceiveCopied(false), 2000);
  }

  const googleAccount = user?.linkedAccounts.find((a) => a.type === "google_oauth");
  const emailAccount  = user?.linkedAccounts.find((a) => a.type === "email");
  const userEmail =
    (emailAccount  && "address" in emailAccount ? (emailAccount.address as string) : null) ??
    (googleAccount && "email"   in googleAccount ? (googleAccount.email   as string) : null) ??
    "";

  return (
    <div className="space-y-8">
      {/* Page headline */}
      <div>
        <h1 className="font-headline font-black text-5xl md:text-7xl text-on-surface leading-none tracking-tighter">
          TUS <span className="text-primary">$1UP</span> TOKENS
        </h1>
        <div className="h-1 w-16 bg-secondary-container mt-3" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* ── Left: Balance ─────────────────────────────────────── */}
        <div className="lg:col-span-7">
          <div className="bg-surface-container-low border-l-8 border-primary-container p-8 shadow-[12px_12px_0px_rgba(0,0,0,0.35)]">
            <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
              <div>
                <p className="font-headline text-xs uppercase tracking-widest text-on-surface/50 mb-1">
                  BALANCE ACTUAL
                </p>
                <h2 className="font-headline font-black text-5xl text-on-surface">
                  {balanceLoading ? (
                    <span className="text-on-surface/30 text-3xl">cargando…</span>
                  ) : balance !== null ? (
                    <>
                      {balance}{" "}
                      <span className="text-2xl text-primary font-bold">1UP</span>
                    </>
                  ) : (
                    <span className="text-on-surface/30 text-3xl">—</span>
                  )}
                </h2>
              </div>
              <div className="bg-secondary-container/10 px-4 py-2 border border-secondary-container/30 shrink-0">
                <p className="font-headline text-[10px] text-secondary uppercase tracking-widest">RED</p>
                <p className="font-bold text-secondary text-sm uppercase">Base — L2</p>
              </div>
            </div>

            {walletAddress ? (
              <button
                onClick={copyAddress}
                className="w-full bg-surface-container-lowest p-4 flex items-center justify-between group border border-outline-variant/10 hover:border-primary/30 transition-colors"
              >
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-headline text-on-surface/50 uppercase mb-1">WALLET ADDRESS</span>
                  <span className="font-mono text-sm tracking-tight text-on-surface truncate max-w-[240px] md:max-w-none">
                    {walletAddress}
                  </span>
                </div>
                <span className={`material-symbols-outlined transition-colors shrink-0 ml-3 ${copied ? "text-tertiary" : "text-on-surface/30 group-hover:text-primary"}`}>
                  {copied ? "check" : "content_copy"}
                </span>
              </button>
            ) : (
              <div className="bg-surface-container-lowest p-4 flex items-center gap-3 border border-outline-variant/10">
                <span className="material-symbols-outlined text-on-surface/30">account_balance_wallet</span>
                <span className="text-sm font-headline text-on-surface/40 uppercase tracking-tight">
                  Inicializando wallet…
                </span>
              </div>
            )}

            {walletAddress && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  onClick={() => { setSendOpen(true); setSendError(null); setSendTxHash(null); }}
                  className="flex items-center justify-center gap-1.5 bg-primary-container text-white font-headline font-black text-xs py-3 skew-fix hover:opacity-90 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">arrow_upward</span>
                  <span className="block skew-content">ENVIAR</span>
                </button>
                <button
                  onClick={() => setReceiveOpen(true)}
                  className="flex items-center justify-center gap-1.5 bg-secondary-container/20 border border-secondary-container/40 text-secondary font-headline font-black text-xs py-3 skew-fix hover:bg-secondary-container/30 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">arrow_downward</span>
                  <span className="block skew-content">RECIBIR</span>
                </button>
                <button
                  onClick={() => setBuyOpen(true)}
                  className="flex items-center justify-center gap-1.5 bg-tertiary/20 border border-tertiary/30 text-tertiary font-headline font-black text-xs py-3 skew-fix hover:bg-tertiary/30 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">bolt</span>
                  <span className="block skew-content">BUY</span>
                </button>
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] font-headline uppercase text-on-surface/30 tracking-widest">CONTRATO:</span>
              <a
                href={`https://basescan.org/token/${ONE_UP_TOKEN.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-secondary/50 hover:text-secondary transition-colors"
              >
                {truncate(ONE_UP_TOKEN.address)}
              </a>
            </div>
          </div>
        </div>

        {/* ── Right: Transaction History ────────────────────────── */}
        <div className="lg:col-span-5">
          <div className="bg-surface-container-low border-t-8 border-secondary-container h-full">
            <div className="p-6 flex justify-between items-center">
              <h3 className="font-headline font-bold text-lg uppercase tracking-wider text-on-surface">
                Historial
              </h3>
              <a
                href={walletAddress ? `https://basescan.org/address/${walletAddress}` : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-headline uppercase text-secondary border border-secondary/40 px-2 py-1 hover:bg-secondary-container hover:text-white transition-colors"
              >
                Basescan
              </a>
            </div>

            {txLoading ? (
              <div className="flex items-center justify-center py-12">
                <span className="material-symbols-outlined text-primary text-3xl animate-spin">refresh</span>
              </div>
            ) : txHistory.length === 0 ? (
              <div className="px-6 pb-10 flex flex-col items-center justify-center gap-3 text-center">
                <span
                  className="material-symbols-outlined text-on-surface/15 text-5xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  receipt_long
                </span>
                <p className="text-xs font-headline uppercase tracking-widest text-on-surface/30">
                  Sin transacciones
                </p>
                <p className="text-xs font-body text-on-surface/20 max-w-[200px]">
                  Aquí aparecerá tu historial de $1UP
                </p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {txHistory.map((tx) => (
                  <a
                    key={tx.hash}
                    href={`https://basescan.org/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-6 py-3.5 hover:bg-surface-container transition-colors group"
                  >
                    <div
                      className={`w-8 h-8 flex items-center justify-center shrink-0 ${
                        tx.direction === "send"
                          ? "bg-primary-container/15 text-primary-container"
                          : "bg-secondary-container/15 text-secondary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">
                        {tx.direction === "send" ? "arrow_upward" : "arrow_downward"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={`font-headline font-black text-xs uppercase ${
                          tx.direction === "send" ? "text-primary-container" : "text-secondary"
                        }`}>
                          {tx.direction === "send" ? "ENVIADO" : "RECIBIDO"}
                        </span>
                        <span className={`font-headline font-bold text-sm ${
                          tx.direction === "send" ? "text-on-surface/60" : "text-on-surface"
                        }`}>
                          {tx.direction === "send" ? "−" : "+"}{formatTxAmount(tx.amount)}{" "}
                          <span className="text-[10px] text-primary/60">1UP</span>
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2 mt-0.5">
                        <span className="font-mono text-[10px] text-on-surface/30 truncate">
                          {truncate(tx.direction === "send" ? tx.to : tx.from)}
                        </span>
                        <span className="font-body text-[10px] text-on-surface/30 shrink-0">
                          {new Date(tx.timestamp).toLocaleDateString("es-CO", {
                            day: "numeric", month: "short",
                          })}
                        </span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[14px] text-on-surface/20 group-hover:text-on-surface/50 transition-colors shrink-0">
                      open_in_new
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Promo banner */}
      <div className="bg-surface-container-highest overflow-hidden relative flex items-center h-48">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-container/20 to-secondary-container/10" />
        <div className="relative z-10 px-10">
          <h4 className="font-headline font-black text-3xl md:text-4xl text-white mb-2 italic tracking-tighter">
            LEVEL UP YOUR EXPERIENCE
          </h4>
          <p className="font-body text-on-surface/60 max-w-md text-sm mb-5">
            Acumula $1UP para acceder a torneos exclusivos, coaching pro y beneficios del Gaming Tower.
          </p>
          <span className="inline-block border border-primary/40 text-primary font-headline text-xs uppercase tracking-widest px-6 py-2">
            PRÓXIMAMENTE
          </span>
        </div>
      </div>

      {/* ── Send Modal ─────────────────────────────────────────── */}
      {sendOpen && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container border-4 border-primary-container p-8 w-full max-w-md">
            <h2 className="font-headline font-black text-xl uppercase mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container">arrow_upward</span>
              ENVIAR $1UP
            </h2>
            {sendTxHash ? (
              <div className="text-center space-y-4">
                <span className="material-symbols-outlined text-tertiary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <p className="font-headline font-bold text-on-surface uppercase">¡Transacción enviada!</p>
                <a
                  href={`https://basescan.org/tx/${sendTxHash}`}
                  target="_blank" rel="noopener noreferrer"
                  className="font-mono text-xs text-secondary break-all hover:text-secondary-container"
                >
                  {sendTxHash}
                </a>
                <button onClick={() => { setSendOpen(false); setSendTxHash(null); }} className="w-full bg-primary-container text-white font-headline font-black py-3 mt-2">
                  CERRAR
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-2">Dirección destinatario</label>
                  <div className="flex gap-2">
                    <input
                      value={sendTo}
                      onChange={(e) => { setSendTo(e.target.value); setSendError(null); }}
                      placeholder="0x..."
                      className="flex-1 bg-surface-container-lowest text-on-background p-3 font-mono text-sm border-none min-w-0"
                    />
                    <button
                      type="button"
                      onClick={() => { setScanError(null); setScanOpen(true); }}
                      className="bg-surface-container-highest px-3 flex items-center justify-center text-outline hover:text-primary transition-colors shrink-0"
                      title="Escanear QR"
                    >
                      <span className="material-symbols-outlined text-xl">qr_code_scanner</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-2">Monto $1UP</label>
                  <input
                    value={sendAmount}
                    onChange={(e) => { setSendAmount(e.target.value); setSendError(null); }}
                    type="number" min="0" step="any"
                    placeholder="0.00"
                    className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-black text-xl border-none"
                  />
                </div>
                {sendError && <p className="text-error font-body text-sm">{sendError}</p>}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSend}
                    disabled={sendLoading || !sendTo || !sendAmount}
                    className="flex-1 bg-primary-container text-white font-headline font-black py-3 disabled:opacity-50 transition-opacity"
                  >
                    {sendLoading ? "ENVIANDO..." : "CONFIRMAR"}
                  </button>
                  <button onClick={() => setSendOpen(false)} className="flex-1 bg-surface-container-highest font-headline font-black py-3">
                    CANCELAR
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Receive Modal ───────────────────────────────────────── */}
      {receiveOpen && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container border-4 border-secondary-container p-8 w-full max-w-md text-center">
            <h2 className="font-headline font-black text-xl uppercase mb-6 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-secondary">arrow_downward</span>
              RECIBIR $1UP
            </h2>
            <p className="font-body text-sm text-on-surface/50 mb-6">
              Comparte tu dirección para recibir <span className="text-primary font-bold">$1UP</span> en la red Base.
            </p>
            {walletAddress && (
              <div className="flex justify-center mb-5">
                <div className="bg-white p-4 inline-block">
                  <QRCodeSVG value={walletAddress} size={180} />
                </div>
              </div>
            )}
            <div className="bg-surface-container-lowest p-4 mb-4">
              <p className="font-mono text-xs text-on-background break-all">{walletAddress}</p>
            </div>
            <button
              onClick={copyReceiveAddress}
              className={`w-full py-3 font-headline font-black text-sm uppercase transition-all mb-3 flex items-center justify-center gap-2 ${
                receiveCopied ? "bg-tertiary text-background" : "bg-secondary-container text-white hover:opacity-90"
              }`}
            >
              <span className="material-symbols-outlined text-base">{receiveCopied ? "check" : "content_copy"}</span>
              {receiveCopied ? "¡COPIADO!" : "COPIAR DIRECCIÓN"}
            </button>
            <button onClick={() => setReceiveOpen(false)} className="w-full bg-surface-container-highest font-headline font-black py-3">
              CERRAR
            </button>
          </div>
        </div>
      )}

      {/* ── Buy Wizard ──────────────────────────────────────────── */}
      {buyOpen && walletAddress && (
        <BuyTokensWizard
          walletAddress={walletAddress}
          onClose={() => setBuyOpen(false)}
          getAccessToken={getAccessToken}
          email={userEmail}
        />
      )}

      {/* ── Purchase Orders ─────────────────────────────────────── */}
      <MisOrdenes getAccessToken={getAccessToken} />

      {/* ── QR Scanner Modal ────────────────────────────────────── */}
      {scanOpen && (
        <div className="fixed inset-0 bg-background/90 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container border-4 border-primary-container p-6 w-full max-w-sm">
            <h2 className="font-headline font-black text-lg uppercase mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container">qr_code_scanner</span>
              ESCANEAR DIRECCIÓN
            </h2>
            {scanError ? (
              <div className="text-center py-8 space-y-3">
                <span className="material-symbols-outlined text-error text-4xl">error</span>
                <p className="font-body text-sm text-error">{scanError}</p>
              </div>
            ) : (
              <div className="relative w-full aspect-square bg-black overflow-hidden mb-4">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <div className="absolute inset-0 border-[3px] border-primary-container/60 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-2 border-primary-container pointer-events-none" />
              </div>
            )}
            <p className="font-body text-xs text-on-surface/40 text-center mb-4">
              Apunta la cámara al código QR de la dirección destino.
            </p>
            <button onClick={() => setScanOpen(false)} className="w-full bg-surface-container-highest font-headline font-black py-3">
              CANCELAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
