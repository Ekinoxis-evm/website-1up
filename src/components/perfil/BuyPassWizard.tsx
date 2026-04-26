"use client";

import { useState } from "react";
import { useSendTransaction } from "@privy-io/react-auth";
import { encodeFunctionData, parseUnits } from "viem";
import { publicClient, ONE_UP_TOKEN, ERC20_TRANSFER_ABI } from "@/lib/viem";
import type { PassOrder } from "@/types/database.types";

type Phase = "confirm" | "sending" | "confirming" | "registering" | "success" | "error";

interface Props {
  priceToken:       number;
  recipientAddress: string;
  durationDays:     number;
  walletAddress:    string;
  getAccessToken:   () => Promise<string | null>;
  onClose:          () => void;
  onSuccess:        () => void;
}

const BASESCAN = "https://basescan.org/tx/";

export function BuyPassWizard({
  priceToken, recipientAddress, durationDays, walletAddress, getAccessToken, onClose, onSuccess,
}: Props) {
  const { sendTransaction } = useSendTransaction();

  const [phase, setPhase]     = useState<Phase>("confirm");
  const [txHash, setTxHash]   = useState("");
  const [order, setOrder]     = useState<PassOrder | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handlePay() {
    setPhase("sending");
    setErrorMsg("");

    const data = encodeFunctionData({
      abi:          ERC20_TRANSFER_ABI,
      functionName: "transfer",
      args: [
        recipientAddress as `0x${string}`,
        parseUnits(priceToken.toString(), ONE_UP_TOKEN.decimals),
      ],
    });

    let hash: string;
    try {
      const result = await sendTransaction(
        { to: ONE_UP_TOKEN.address, data, chainId: 8453 },
        { address: walletAddress, sponsor: true },
      );
      hash = result.hash;
      setTxHash(hash);
    } catch {
      setErrorMsg("La transacción fue cancelada o no se pudo enviar.");
      setPhase("error");
      return;
    }

    setPhase("confirming");

    let receipt;
    try {
      receipt = await publicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
        timeout: 120_000,
      });
    } catch {
      setErrorMsg(`Tiempo de espera agotado. Tu TX fue enviada: ${hash}. Contacta soporte con este hash.`);
      setPhase("error");
      return;
    }

    if (receipt.status !== "success") {
      setErrorMsg("La transacción falló en la blockchain.");
      setPhase("error");
      return;
    }

    setPhase("registering");

    const token = await getAccessToken();
    const res = await fetch("/api/user/pass-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ txHash: hash, walletAddress }),
    });

    const body = await res.json();
    if (!res.ok) {
      setErrorMsg(body.error ?? "Error al registrar la compra.");
      setPhase("error");
      return;
    }

    setOrder(body as PassOrder);
    setPhase("success");
    onSuccess();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-container w-full max-w-md relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-container-high">
          <h2 className="font-headline font-black text-xl uppercase tracking-tighter">
            OBTENER <span className="text-primary-container">1UP PASS</span>
          </h2>
          {(phase === "confirm" || phase === "success" || phase === "error") && (
            <button onClick={onClose} className="text-outline hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        <div className="p-6">
          {/* CONFIRM */}
          {phase === "confirm" && (
            <div className="space-y-6">
              <div className="bg-surface-container-low p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-headline text-xs uppercase tracking-widest text-outline">Precio</span>
                  <span className="font-headline font-black text-2xl">
                    {priceToken.toLocaleString()} <span className="text-sm text-primary-container">$1UP</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-headline text-xs uppercase tracking-widest text-outline">Acceso</span>
                  <span className="font-headline font-bold">{durationDays} días</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-headline text-xs uppercase tracking-widest text-outline">Wallet</span>
                  <span className="font-mono text-xs text-on-surface/70">
                    {walletAddress.slice(0, 8)}…{walletAddress.slice(-6)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-headline text-xs uppercase tracking-widest text-outline">Token</span>
                  <span className="font-mono text-xs text-on-surface/70">$1UP · Base</span>
                </div>
              </div>

              <p className="font-body text-xs text-on-surface/50">
                Al confirmar se abrirá tu wallet para firmar la transacción. El proceso es automático — no cierres esta ventana.
              </p>

              <button
                onClick={handlePay}
                className="w-full bg-primary-container text-white font-headline font-black text-lg uppercase tracking-tighter py-4 hover:opacity-90 transition-opacity"
              >
                PAGAR {priceToken.toLocaleString()} $1UP
              </button>
            </div>
          )}

          {/* PROCESSING PHASES */}
          {(phase === "sending" || phase === "confirming" || phase === "registering") && (
            <div className="flex flex-col items-center gap-6 py-8">
              <span className="material-symbols-outlined text-primary text-5xl animate-spin">refresh</span>
              <div className="text-center space-y-1">
                {phase === "sending" && (
                  <>
                    <p className="font-headline font-black text-lg uppercase tracking-tighter">Enviando transacción…</p>
                    <p className="font-body text-sm text-on-surface/50">Firma la transacción en tu wallet.</p>
                  </>
                )}
                {phase === "confirming" && (
                  <>
                    <p className="font-headline font-black text-lg uppercase tracking-tighter">Confirmando en blockchain…</p>
                    <p className="font-body text-sm text-on-surface/50">Esperando confirmación en Base. Esto puede tomar unos segundos.</p>
                    {txHash && (
                      <a
                        href={`${BASESCAN}${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-primary hover:underline block mt-2"
                      >
                        Ver en BaseScan →
                      </a>
                    )}
                  </>
                )}
                {phase === "registering" && (
                  <>
                    <p className="font-headline font-black text-lg uppercase tracking-tighter">Registrando compra…</p>
                    <p className="font-body text-sm text-on-surface/50">Verificando y activando tu pass.</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* SUCCESS */}
          {phase === "success" && order && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3 py-4">
                <span
                  className="material-symbols-outlined text-tertiary text-6xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <p className="font-headline font-black text-2xl uppercase tracking-tighter text-center">
                  ¡1UP Pass Activado!
                </p>
              </div>

              <div className="bg-surface-container-low p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="font-headline text-xs uppercase tracking-widest text-outline">Pagado</span>
                  <span className="font-headline font-bold">{order.token_amount_paid.toLocaleString()} $1UP</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-headline text-xs uppercase tracking-widest text-outline">Vence</span>
                  <span className="font-headline font-bold">
                    {order.expires_at ? new Date(order.expires_at).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" }) : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-headline text-xs uppercase tracking-widest text-outline">TX</span>
                  <a
                    href={`${BASESCAN}${order.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    {order.tx_hash.slice(0, 10)}…{order.tx_hash.slice(-6)}
                  </a>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-surface-container-high text-on-background font-headline font-black uppercase tracking-tighter py-3"
              >
                CERRAR
              </button>
            </div>
          )}

          {/* ERROR */}
          {phase === "error" && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3 py-4">
                <span className="material-symbols-outlined text-error text-5xl">error</span>
                <p className="font-headline font-black text-xl uppercase tracking-tighter text-error text-center">
                  Algo salió mal
                </p>
                <p className="font-body text-sm text-on-surface/70 text-center">{errorMsg}</p>
                {txHash && (
                  <a
                    href={`${BASESCAN}${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    Ver TX en BaseScan →
                  </a>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-full bg-surface-container-high text-on-background font-headline font-black uppercase tracking-tighter py-3"
              >
                CERRAR
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
