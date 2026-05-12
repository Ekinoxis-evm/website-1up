"use client";

import { useState, useRef } from "react";

type BankAccount = {
  id: number;
  bank_name: string;
  account_type: string | null;
  account_number: string;
  holder_name: string;
  holder_document: string | null;
  instructions: string | null;
};

interface Props {
  priceToken:     number;
  durationDays:   number;
  walletAddress:  string;
  getAccessToken: () => Promise<string | null>;
  onClose:        () => void;
  onSuccess:      () => void;
}

export function BuyPassBankWizard({ priceToken, durationDays, walletAddress, getAccessToken, onClose, onSuccess }: Props) {
  const [step, setStep]                       = useState(1);
  const [bankAccounts, setBankAccounts]       = useState<BankAccount[]>([]);
  const [selectedBank, setSelectedBank]       = useState<BankAccount | null>(null);
  const [copiedField, setCopiedField]         = useState<string | null>(null);
  const [comprobantePath, setComprobantePath] = useState<string | null>(null);
  const [comprobantePreview, setComprobantePreview] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading]     = useState(false);
  const [uploadError, setUploadError]         = useState<string | null>(null);
  const [submitLoading, setSubmitLoading]     = useState(false);
  const [submitError, setSubmitError]         = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function authHeader(): Promise<Record<string, string>> {
    const token = await getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function copyField(key: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  }

  async function goToStep2() {
    const res = await fetch("/api/bank-accounts", { headers: await authHeader() });
    if (!res.ok) return;
    const data = await res.json() as BankAccount[];
    setBankAccounts(data);
    setSelectedBank(data[0] ?? null);
    setStep(2);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) {
      setUploadError("Solo se permiten imágenes (jpg, png, webp) o PDF"); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("El archivo no puede superar 5MB"); return;
    }
    if (file.type !== "application/pdf") {
      const reader = new FileReader();
      reader.onload = (ev) => setComprobantePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setComprobantePreview(null);
    }

    setUploadLoading(true);
    const token = await getAccessToken();
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/user/upload-comprobante", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    setUploadLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setUploadError(d.error ?? "Error al subir el archivo"); return;
    }
    const { path } = await res.json() as { path: string };
    setComprobantePath(path);
  }

  async function handleSubmit() {
    if (!comprobantePath || !selectedBank) return;
    setSubmitLoading(true); setSubmitError(null);

    const token = await getAccessToken();
    const res = await fetch("/api/user/pass-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        paymentMethod:   "bank",
        walletAddress,
        bankAccountId:   selectedBank.id,
        comprobantePath,
      }),
    });

    setSubmitLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setSubmitError(d.error ?? "Error al crear la solicitud");
      return;
    }
    onSuccess();
    setStep(4);
  }

  function handleClose() {
    setStep(1); setSelectedBank(null); setBankAccounts([]);
    setComprobantePath(null); setComprobantePreview(null);
    setSubmitError(null); setUploadError(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-container w-full max-w-md relative max-h-[90vh] overflow-y-auto">
        {/* Step bar */}
        <div className="flex">
          {[1,2,3,4].map((s) => (
            <div key={s} className={`flex-1 h-1 transition-colors ${s <= step ? "bg-primary-container" : "bg-surface-container-high"}`} />
          ))}
        </div>

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-black text-xl uppercase tracking-tighter">
              PASS <span className="text-primary-container">VÍA BANCO</span>
            </h2>
            {(step === 1 || step === 4) && (
              <button onClick={handleClose} className="text-outline hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>

          {/* ── Step 1: Resumen ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="bg-surface-container-low p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-headline text-xs uppercase tracking-widest text-outline">Costo (en $1UP)</span>
                  <span className="font-headline font-black text-2xl">
                    {priceToken.toLocaleString()} <span className="text-sm text-primary-container">$1UP</span>
                  </span>
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
                Realizarás una transferencia bancaria. El admin revisará tu comprobante y activará tu pass manualmente (máx. 24h hábiles).
              </p>
              <button
                onClick={goToStep2}
                className="w-full bg-primary-container text-white font-headline font-black text-lg uppercase tracking-tighter py-4 hover:opacity-90 transition-opacity"
              >
                VER DATOS BANCARIOS
              </button>
            </div>
          )}

          {/* ── Step 2: Datos bancarios ── */}
          {step === 2 && (
            <div className="space-y-5">
              {bankAccounts.length > 1 && (
                <div>
                  <p className="font-headline text-xs uppercase tracking-widest text-outline mb-2">Selecciona la cuenta</p>
                  <div className="flex flex-col gap-2">
                    {bankAccounts.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setSelectedBank(b)}
                        className={`p-3 text-left font-body text-sm border-2 transition-colors ${
                          selectedBank?.id === b.id
                            ? "border-primary-container bg-primary-container/10"
                            : "border-surface-container-high"
                        }`}
                      >
                        <span className="font-headline font-bold">{b.bank_name}</span>{" — "}{b.account_number}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedBank && (
                <div className="bg-surface-container-low p-4 space-y-3">
                  {[
                    { label: "Banco",   key: "bank",   value: selectedBank.bank_name },
                    { label: "Tipo",    key: "type",   value: selectedBank.account_type ?? "—" },
                    { label: "Número",  key: "num",    value: selectedBank.account_number },
                    { label: "Titular", key: "holder", value: selectedBank.holder_name },
                    ...(selectedBank.holder_document ? [{ label: "Documento", key: "doc", value: selectedBank.holder_document }] : []),
                  ].map(({ label, key, value }) => (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-headline text-[10px] uppercase tracking-widest text-outline">{label}</p>
                        <p className="font-mono text-sm">{value}</p>
                      </div>
                      <button
                        onClick={() => copyField(key, value)}
                        className="shrink-0 text-outline hover:text-primary-container transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {copiedField === key ? "check" : "content_copy"}
                        </span>
                      </button>
                    </div>
                  ))}
                  {selectedBank.instructions && (
                    <p className="font-body text-xs text-on-surface/60 pt-2 border-t border-surface-container">
                      {selectedBank.instructions}
                    </p>
                  )}
                </div>
              )}

              <p className="font-body text-xs text-on-surface/50">
                Realiza la transferencia y en el siguiente paso sube el comprobante.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  disabled={!selectedBank}
                  className="flex-1 bg-primary-container text-white font-headline font-black uppercase py-3 disabled:opacity-40"
                >
                  YA TRANSFERÍ →
                </button>
                <button onClick={() => setStep(1)} className="px-5 bg-surface-container-high font-headline font-black uppercase text-sm">
                  ATRÁS
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Comprobante ── */}
          {step === 3 && (
            <div className="space-y-5">
              <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline">Sube tu comprobante</p>

              <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={handleFileChange} />

              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadLoading}
                className="w-full bg-surface-container-low border-2 border-dashed border-primary-container/40 py-8 flex flex-col items-center gap-2 hover:border-primary-container transition-colors"
              >
                <span className="material-symbols-outlined text-primary-container text-3xl">upload_file</span>
                <span className="font-headline font-bold text-sm uppercase tracking-wide">
                  {uploadLoading ? "Subiendo…" : comprobantePath ? "Cambiar archivo" : "Seleccionar archivo"}
                </span>
                <span className="font-body text-xs text-outline">JPG, PNG, WEBP, PDF · máx. 5MB</span>
              </button>

              {uploadError && <p className="font-body text-xs text-error">{uploadError}</p>}

              {comprobantePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={comprobantePreview} alt="Comprobante" className="w-full max-h-40 object-contain bg-surface-container-lowest" />
              )}
              {!comprobantePreview && comprobantePath && (
                <p className="font-body text-xs text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  PDF cargado correctamente
                </p>
              )}

              {submitError && <p className="font-body text-xs text-error">{submitError}</p>}

              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={!comprobantePath || submitLoading}
                  className="flex-1 bg-primary-container text-white font-headline font-black uppercase py-3 disabled:opacity-40"
                >
                  {submitLoading ? "Enviando…" : "ENVIAR SOLICITUD"}
                </button>
                <button onClick={() => setStep(2)} className="px-5 bg-surface-container-high font-headline font-black uppercase text-sm">
                  ATRÁS
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Éxito ── */}
          {step === 4 && (
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
                  Tu solicitud de 1UP Pass está en revisión. El equipo la aprobará en máximo 24 horas hábiles
                  y recibirás una confirmación por correo.
                </p>
              </div>
              <button
                onClick={handleClose}
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
