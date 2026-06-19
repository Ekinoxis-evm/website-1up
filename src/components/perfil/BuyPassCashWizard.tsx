"use client";

import { useState } from "react";

interface Props {
  priceToken:     number;
  durationDays:   number;
  walletAddress:  string;
  getAccessToken: () => Promise<string | null>;
  onClose:        () => void;
  onSuccess:      () => void;
}

const TOKEN_COP_RATE = 1000;

export function BuyPassCashWizard({ priceToken, durationDays, walletAddress, getAccessToken, onClose, onSuccess }: Props) {
  const [step, setStep]                 = useState<1 | 2>(1);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError]   = useState<string | null>(null);

  const priceCop = Math.round(priceToken * TOKEN_COP_RATE);

  async function handleSubmit() {
    setSubmitLoading(true);
    setSubmitError(null);

    const token = await getAccessToken();
    const res = await fetch("/api/user/pass-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ paymentMethod: "cash", walletAddress }),
    });

    setSubmitLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setSubmitError(d.error ?? "Error al crear la solicitud");
      return;
    }
    onSuccess();
    setStep(2);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-container w-full max-w-md relative max-h-[90vh] overflow-y-auto">
        {/* Step bar */}
        <div className="flex">
          {[1, 2].map((s) => (
            <div key={s} className={`flex-1 h-1 transition-colors ${s <= step ? "bg-primary-container" : "bg-surface-container-high"}`} />
          ))}
        </div>

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-black text-xl uppercase tracking-tighter">
              PASS <span className="text-primary-container">EN EFECTIVO</span>
            </h2>
            <button onClick={onClose} className="text-outline hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* ── Step 1: Resumen ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="bg-surface-container-low p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-headline text-xs uppercase tracking-widest text-outline">Costo (COP)</span>
                  <span className="font-headline font-black text-2xl">
                    ${priceCop.toLocaleString("es-CO")} <span className="text-sm text-primary-container">COP</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-headline text-xs uppercase tracking-widest text-outline">Equivalente</span>
                  <span className="font-headline font-bold">{priceToken.toLocaleString()} $1UP</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-headline text-xs uppercase tracking-widest text-outline">Duración</span>
                  <span className="font-headline font-bold">{durationDays} días</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-headline text-xs uppercase tracking-widest text-outline">Wallet destino</span>
                  <span className="font-mono text-xs text-on-surface/70">
                    {walletAddress.slice(0, 8)}…{walletAddress.slice(-6)}
                  </span>
                </div>
              </div>
              <p className="font-body text-xs text-on-surface/50">
                Realizarás el pago en efectivo de forma presencial en el 1UP Gaming Tower. El equipo
                confirmará el pago y activará tu Pass manualmente.
              </p>

              {submitError && <p className="font-body text-xs text-error">{submitError}</p>}

              <button
                onClick={handleSubmit}
                disabled={submitLoading}
                className="w-full bg-primary-container text-white font-headline font-black text-lg uppercase tracking-tighter py-4 hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {submitLoading ? "Enviando…" : "SOLICITAR PAGO EN EFECTIVO"}
              </button>
            </div>
          )}

          {/* ── Step 2: Éxito ── */}
          {step === 2 && (
            <div className="space-y-5 text-center py-4">
              <span
                className="material-symbols-outlined text-secondary text-6xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                pending_actions
              </span>
              <div>
                <p className="font-headline font-black text-2xl uppercase tracking-tighter">¡Solicitud enviada!</p>
                <p className="font-body text-sm text-on-surface/60 mt-2">
                  Pago en efectivo — el equipo confirmará y activará tu Pass. Acércate al 1UP Gaming
                  Tower para realizar el pago. Recibirás una confirmación por correo.
                </p>
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
