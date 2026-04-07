"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, parseUnits, isAddress } from "viem";
import { base } from "viem/chains";
import { use1upBalance } from "@/hooks/use1upBalance";
import { ONE_UP_TOKEN, ERC20_TRANSFER_ABI } from "@/lib/viem";

const TOKEN_UTILITY = [
  { label: "Cursos Academia",   pct: 45, barClass: "bg-secondary-container", textClass: "text-secondary"  },
  { label: "Entrada Torneos",   pct: 35, barClass: "bg-primary-container",   textClass: "text-primary"    },
  { label: "Beneficios 1UP Pass", pct: 20, barClass: "bg-tertiary",           textClass: "text-tertiary"   },
];

const UTILITY_ICONS = [
  { icon: "school",            color: "text-secondary" },
  { icon: "emoji_events",      color: "text-primary"   },
  { icon: "confirmation_number", color: "text-tertiary"  },
];

export function WalletTab() {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const [copied, setCopied] = useState(false);

  // Prefer embedded wallet, fall back to first available
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const activeWallet   = embeddedWallet ?? wallets[0];
  const walletAddress  = activeWallet?.address as `0x${string}` | undefined;

  const { balance, loading: balanceLoading } = use1upBalance(walletAddress);

  // Send modal state
  const [sendOpen, setSendOpen]     = useState(false);
  const [sendTo, setSendTo]         = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError]   = useState<string | null>(null);
  const [sendTxHash, setSendTxHash] = useState<string | null>(null);

  // Receive modal state
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveCopied, setReceiveCopied] = useState(false);

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
      const walletClient = createWalletClient({
        chain: base,
        transport: custom(provider),
      });
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

  function copyReceiveAddress() {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setReceiveCopied(true);
    setTimeout(() => setReceiveCopied(false), 2000);
  }

  // Derive display name from linked accounts
  const googleAccount  = user?.linkedAccounts.find((a) => a.type === "google_oauth");
  const emailAccount   = user?.linkedAccounts.find((a) => a.type === "email");
  const displayName    =
    (googleAccount && "name" in googleAccount ? (googleAccount.name as string) : null) ??
    (emailAccount  && "address" in emailAccount ? (emailAccount.address as string) : null) ??
    "GAMER";

  function copyAddress() {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function truncate(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

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

        {/* ── Left: Balance + Charge ────────────────────────────── */}
        <div className="lg:col-span-7 space-y-8">

          {/* Balance card */}
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

            {/* Wallet address */}
            {walletAddress ? (
              <button
                onClick={copyAddress}
                className="w-full bg-surface-container-lowest p-4 flex items-center justify-between group border border-outline-variant/10 hover:border-primary/30 transition-colors"
              >
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-headline text-on-surface/50 uppercase mb-1">
                    WALLET ADDRESS
                  </span>
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

            {/* Send / Receive */}
            {walletAddress && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setSendOpen(true); setSendError(null); setSendTxHash(null); }}
                  className="flex items-center justify-center gap-2 bg-primary-container text-white font-headline font-black text-sm py-3 skew-fix hover:neo-shadow-pink transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">arrow_upward</span>
                  <span className="block skew-content">ENVIAR</span>
                </button>
                <button
                  onClick={() => setReceiveOpen(true)}
                  className="flex items-center justify-center gap-2 bg-secondary-container/20 border border-secondary-container/40 text-secondary font-headline font-black text-sm py-3 skew-fix hover:bg-secondary-container/30 transition-all"
                >
                  <span className="material-symbols-outlined text-base">arrow_downward</span>
                  <span className="block skew-content">RECIBIR</span>
                </button>
              </div>
            )}

            {/* Contract info */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] font-headline uppercase text-on-surface/30 tracking-widest">
                CONTRATO:
              </span>
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

          {/* Charge account — coming soon */}
          <div className="bg-surface-container shadow-[12px_12px_0px_rgba(161,201,255,0.06)]">
            <div className="bg-surface-container-highest p-6">
              <h3 className="font-headline font-bold text-xl uppercase tracking-wider text-secondary flex items-center gap-3">
                <span className="material-symbols-outlined">bolt</span>
                Cargar Cuenta
              </h3>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block font-headline text-xs uppercase tracking-widest text-on-surface/50">
                    Asset a depositar
                  </label>
                  <div className="relative">
                    <select
                      disabled
                      className="w-full bg-surface-container-lowest border-b-2 border-outline text-on-surface/40 p-4 font-bold appearance-none cursor-not-allowed"
                    >
                      <option>USDC (Base)</option>
                      <option>ETH (Base)</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface/30">
                      expand_more
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block font-headline text-xs uppercase tracking-widest text-on-surface/50">
                    Monto
                  </label>
                  <input
                    disabled
                    type="number"
                    placeholder="0.00"
                    className="w-full bg-surface-container-lowest border-b-2 border-outline text-on-surface/40 p-4 font-headline text-xl font-black cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-container-lowest border border-outline-variant/10">
                <span className="text-xs font-headline uppercase text-on-surface/50">
                  $1UP estimados a recibir
                </span>
                <span className="font-headline font-bold text-primary/40">≈ — 1UP</span>
              </div>

              {/* Disabled CTA with badge */}
              <div className="relative">
                <button
                  disabled
                  className="w-full bg-primary-container/25 py-5 text-white/25 font-headline font-black text-xl uppercase tracking-tighter cursor-not-allowed"
                >
                  SWAP POR $1UP
                </button>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="bg-surface-container border border-tertiary/50 text-tertiary font-headline text-xs uppercase tracking-widest px-5 py-1.5">
                    PRÓXIMAMENTE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Token Utility + History ───────────────────── */}
        <div className="lg:col-span-5 space-y-8">

          {/* Token utility breakdown */}
          <div className="bg-surface-container-low p-6">
            <h3 className="font-headline font-bold text-lg uppercase tracking-wider mb-6 text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">pie_chart</span>
              Token Utility
            </h3>
            <div className="space-y-4">
              {TOKEN_UTILITY.map(({ label, pct, barClass, textClass }) => (
                <div key={label}>
                  <div className="flex justify-between mb-2">
                    <span className="font-headline text-xs uppercase font-bold text-on-surface">
                      {label}
                    </span>
                    <span className={`font-headline text-xs ${textClass}`}>{pct}% uso</span>
                  </div>
                  <div className="w-full h-3 bg-surface-container-highest overflow-hidden">
                    <div className={`h-full ${barClass} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-3 gap-2">
              {UTILITY_ICONS.map(({ icon, color }, i) => (
                <div
                  key={i}
                  className="h-20 bg-surface-container-lowest flex flex-col items-center justify-center gap-1 border border-outline-variant/10"
                >
                  <span
                    className={`material-symbols-outlined ${color}`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {icon}
                  </span>
                  <span className="text-[9px] font-headline uppercase text-on-surface/50">
                    {["Cursos", "Torneo", "Pass"][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction history — empty state */}
          <div className="bg-surface-container-low border-t-8 border-secondary-container">
            <div className="p-6 flex justify-between items-center border-b border-outline-variant/10">
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
            <div className="p-10 flex flex-col items-center justify-center gap-3 text-center">
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
          </div>
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
                  <input
                    value={sendTo}
                    onChange={(e) => { setSendTo(e.target.value); setSendError(null); }}
                    placeholder="0x..."
                    className="w-full bg-surface-container-lowest text-on-background p-3 font-mono text-sm border-none"
                  />
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
                {sendError && (
                  <p className="text-error font-body text-sm">{sendError}</p>
                )}
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
            <div className="bg-surface-container-lowest p-4 mb-4">
              <p className="font-mono text-xs text-on-background break-all">{walletAddress}</p>
            </div>
            <button
              onClick={copyReceiveAddress}
              className={`w-full py-3 font-headline font-black text-sm uppercase transition-all mb-3 flex items-center justify-center gap-2 ${
                receiveCopied ? "bg-tertiary text-background" : "bg-secondary-container text-white hover:neo-shadow-pink"
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

      {/* Promo banner */}
      <div className="mt-8 bg-surface-container-highest overflow-hidden relative flex items-center h-48">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-container/20 to-secondary-container/10" />
        <div className="relative z-10 px-10">
          <h4 className="font-headline font-black text-3xl md:text-4xl text-white mb-2 italic tracking-tighter">
            LEVEL UP YOUR EXPERIENCE
          </h4>
          <p className="font-body text-on-surface/60 max-w-md text-sm mb-5">
            Acumula $1UP para acceder a torneos exclusivos, coaching pro y
            beneficios del Gaming Tower.
          </p>
          <span className="inline-block border border-primary/40 text-primary font-headline text-xs uppercase tracking-widest px-6 py-2">
            PRÓXIMAMENTE
          </span>
        </div>
      </div>
    </div>
  );
}
