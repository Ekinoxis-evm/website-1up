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
  walletAddress: string;
  onClose: () => void;
  getAccessToken: () => Promise<string | null>;
  prefillNombre?: string;
  prefillCelular?: string;
  email?: string;
}

function formatCop(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

const RATE = 1000;

export function BuyTokensWizard({ walletAddress, onClose, getAccessToken, prefillNombre = "", prefillCelular = "", email = "" }: Props) {
  const [step, setStep]             = useState(1);
  const [copAmount, setCopAmount]   = useState("");
  const [bankAccounts, setBankAccounts]   = useState<BankAccount[]>([]);
  const [selectedBank, setSelectedBank]   = useState<BankAccount | null>(null);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [nombre, setNombre]         = useState(prefillNombre);
  const [celular, setCelular]       = useState(prefillCelular);
  const [comprobantePath, setComprobantePath]   = useState<string | null>(null);
  const [comprobanteUrl, setComprobanteUrl]     = useState<string | null>(null);
  const [comprobantePreview, setComprobantePreview] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError]     = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError]     = useState<string | null>(null);
  const [orderId, setOrderId]         = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const tokenAmount = copAmount ? Math.floor(parseInt(copAmount) / RATE) : 0;
  const copInt      = parseInt(copAmount) || 0;
  const copValid    = copInt >= RATE && copInt % RATE === 0;

  async function authHeader(): Promise<Record<string, string>> {
    const token = await getAccessToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  async function goToStep2() {
    const res = await fetch("/api/bank-accounts", { headers: await authHeader() });
    if (!res.ok) return;
    const data = await res.json() as BankAccount[];
    setBankAccounts(data);
    setSelectedBank(data[0] ?? null);
    setStep(2);
  }

  function copyAccountNumber(num: string) {
    navigator.clipboard.writeText(num);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
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
    const form  = new FormData();
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
    const { url, path } = await res.json() as { url: string; path: string };
    setComprobanteUrl(url);
    setComprobantePath(path);
  }

  async function handleSubmit() {
    if (!comprobantePath || !comprobanteUrl || !selectedBank) return;
    setSubmitLoading(true); setSubmitError(null);

    const token = await getAccessToken();
    const res = await fetch("/api/user/token-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        walletAddress,
        copAmount: copInt,
        bankAccountId: selectedBank.id,
        comprobantePath,
        comprobanteUrl,
        nombre: nombre.trim(),
        celular: celular.trim(),
      }),
    });

    setSubmitLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setSubmitError(d.error ?? "Error al crear la orden");
      return;
    }
    const data = await res.json() as { id: number };
    setOrderId(data.id);
    setStep(4);
  }

  function handleClose() {
    setStep(1); setCopAmount(""); setSelectedBank(null); setBankAccounts([]);
    setComprobantePath(null); setComprobanteUrl(null); setComprobantePreview(null);
    setNombre(prefillNombre); setCelular(prefillCelular);
    setSubmitError(null); setUploadError(null); setOrderId(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-background/80 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-surface-container border-4 border-tertiary/60 w-full max-w-lg my-8">
        {/* Step indicator */}
        <div className="flex border-b border-outline-variant/10">
          {[1,2,3,4].map((s) => (
            <div key={s} className={`flex-1 h-1 transition-colors ${s <= step ? "bg-tertiary" : "bg-surface-container-highest"}`} />
          ))}
        </div>

        <div className="p-8">
          {/* ── Step 1: COP amount ── */}
          {step === 1 && (
            <div>
              <h2 className="font-headline font-black text-xl uppercase mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary">bolt</span>
                COMPRAR $1UP
              </h2>
              <p className="font-body text-sm text-on-surface/50 mb-8">
                Ingresa cuántos COP quieres invertir.
              </p>

              <div className="mb-6">
                <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-2">
                  Cantidad en COP
                </label>
                <input
                  type="number"
                  value={copAmount}
                  onChange={(e) => setCopAmount(e.target.value)}
                  placeholder="10000"
                  min="1000"
                  step="1000"
                  className="w-full bg-surface-container-lowest text-on-background p-4 font-headline font-black text-2xl border-none focus:outline-none"
                />
                {copAmount && !copValid && (
                  <p className="font-body text-xs text-error mt-1">
                    Mínimo $1,000 COP · debe ser múltiplo de 1,000
                  </p>
                )}
              </div>

              <div className="bg-surface-container-highest p-4 mb-8 flex items-center justify-between">
                <span className="font-headline text-xs uppercase tracking-widest text-on-surface/50">
                  Recibes
                </span>
                <span className="font-headline font-black text-2xl text-tertiary">
                  {copValid ? tokenAmount.toLocaleString() : "—"}{" "}
                  <span className="text-base text-primary/70">$1UP</span>
                </span>
              </div>

              <p className="font-body text-[10px] text-on-surface/30 text-center mb-6">
                Tasa fija: 1 $1UP = {formatCop(RATE)}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={goToStep2}
                  disabled={!copValid}
                  className="flex-1 bg-tertiary text-background font-headline font-black py-3 uppercase disabled:opacity-40 transition-opacity"
                >
                  CONTINUAR
                </button>
                <button onClick={handleClose} className="flex-1 bg-surface-container-highest font-headline font-black py-3">
                  CANCELAR
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Bank selection ── */}
          {step === 2 && (
            <div>
              <h2 className="font-headline font-black text-xl uppercase mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary">account_balance</span>
                SELECCIONA UN BANCO
              </h2>
              <p className="font-body text-sm text-on-surface/50 mb-6">
                Realiza la transferencia y luego sube el comprobante.
              </p>

              {/* Summary pill */}
              <div className="bg-tertiary/10 border border-tertiary/30 p-4 mb-6 flex items-center justify-between">
                <span className="font-headline text-sm text-on-surface/70">Vas a recibir</span>
                <span className="font-headline font-black text-lg text-tertiary">
                  {tokenAmount.toLocaleString()} $1UP{" "}
                  <span className="text-on-surface/50 font-normal text-sm">por {formatCop(copInt)}</span>
                </span>
              </div>

              {/* Bank radio cards */}
              <div className="space-y-3 mb-6">
                {bankAccounts.map((bank) => (
                  <button
                    key={bank.id}
                    onClick={() => setSelectedBank(bank)}
                    className={`w-full text-left p-4 transition-colors ${
                      selectedBank?.id === bank.id
                        ? "bg-tertiary/10 border-2 border-tertiary"
                        : "bg-surface-container-lowest border-2 border-transparent hover:border-outline-variant/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-headline font-black text-sm text-on-surface">{bank.bank_name}</span>
                          {bank.account_type && (
                            <span className="bg-surface-container-highest text-on-surface/50 text-[10px] font-headline uppercase px-2 py-0.5">
                              {bank.account_type}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-xs text-on-surface/60">{bank.account_number}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); copyAccountNumber(bank.account_number); }}
                            className="text-on-surface/30 hover:text-tertiary transition-colors"
                          >
                            <span className="material-symbols-outlined text-xs">
                              {copiedAccount ? "check" : "content_copy"}
                            </span>
                          </button>
                        </div>
                        <p className="font-body text-[10px] text-on-surface/40 mt-0.5">{bank.holder_name}{bank.holder_document ? ` · ${bank.holder_document}` : ""}</p>
                        {bank.instructions && (
                          <p className="font-body text-xs text-secondary/70 mt-1 italic">{bank.instructions}</p>
                        )}
                      </div>
                      <div className={`w-4 h-4 border-2 flex items-center justify-center shrink-0 mt-0.5 ${selectedBank?.id === bank.id ? "border-tertiary" : "border-on-surface/20"}`}>
                        {selectedBank?.id === bank.id && <div className="w-2 h-2 bg-tertiary" />}
                      </div>
                    </div>
                  </button>
                ))}
                {bankAccounts.length === 0 && (
                  <p className="font-body text-sm text-on-surface/40 text-center py-6">No hay cuentas disponibles</p>
                )}
              </div>

              {/* Caution panel */}
              <div className="bg-secondary-container/10 border border-secondary-container/30 p-4 mb-6 flex gap-3">
                <span className="material-symbols-outlined text-secondary shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                <p className="font-body text-xs text-on-surface/60">
                  Realiza la transferencia <strong className="text-on-surface">{selectedBank ? `a ${selectedBank.bank_name}` : ""}</strong> ahora. En el siguiente paso deberás subir el comprobante de pago.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  disabled={!selectedBank}
                  className="flex-1 bg-tertiary text-background font-headline font-black py-3 uppercase disabled:opacity-40"
                >
                  YA TRANSFERÍ →
                </button>
                <button onClick={() => setStep(1)} className="flex-1 bg-surface-container-highest font-headline font-black py-3">
                  ATRÁS
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Upload comprobante + confirm ── */}
          {step === 3 && (
            <div>
              <h2 className="font-headline font-black text-xl uppercase mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary">upload_file</span>
                SUBE EL COMPROBANTE
              </h2>
              <p className="font-body text-sm text-on-surface/50 mb-6">
                Completa tus datos de contacto y adjunta el comprobante.
              </p>

              <div className="space-y-4 mb-6">
                {/* File drop zone */}
                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-2">
                    Comprobante *
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full bg-surface-container-lowest border-2 border-dashed border-outline-variant/30 p-6 text-center hover:border-tertiary/50 transition-colors"
                  >
                    {uploadLoading ? (
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-3xl text-tertiary animate-pulse">upload</span>
                        <span className="font-headline text-xs uppercase text-on-surface/40">Subiendo…</span>
                      </div>
                    ) : comprobantePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={comprobantePreview} alt="preview" className="max-h-32 mx-auto object-contain" />
                    ) : comprobanteUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-3xl text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        <span className="font-headline text-xs uppercase text-tertiary">PDF subido</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-3xl text-on-surface/20">upload_file</span>
                        <span className="font-headline text-xs uppercase text-on-surface/40">Toca para seleccionar</span>
                        <span className="font-body text-[10px] text-on-surface/30">jpg · png · webp · pdf · máx 5MB</span>
                      </div>
                    )}
                  </button>
                  {uploadError && <p className="font-body text-xs text-error mt-1">{uploadError}</p>}
                </div>

                {/* Nombre */}
                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">Nombre completo *</label>
                  <input
                    value={nombre} onChange={(e) => setNombre(e.target.value)}
                    placeholder="Carlos Gómez"
                    className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none"
                  />
                </div>

                {/* Celular */}
                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">Celular de contacto *</label>
                  <input
                    value={celular} onChange={(e) => setCelular(e.target.value)}
                    placeholder="3001234567"
                    className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none"
                  />
                </div>

                {/* Read-only fields */}
                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">Email</label>
                  <div className="bg-surface-container-highest p-3 font-body text-sm text-on-surface/50">
                    {email || "(de tu cuenta Privy)"}
                  </div>
                </div>
                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">Wallet</label>
                  <div className="bg-surface-container-highest p-3 font-mono text-xs text-on-surface/50 truncate">
                    {walletAddress}
                  </div>
                </div>
              </div>

              {submitError && (
                <div className={`mb-4 p-3 ${submitError.includes("pendiente") ? "bg-secondary-container/10 border border-secondary-container/40" : "bg-error/10"}`}>
                  <p className="font-body text-sm text-error">{submitError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={submitLoading || !comprobanteUrl || !nombre.trim() || !celular.trim()}
                  className="flex-1 bg-tertiary text-background font-headline font-black py-3 uppercase disabled:opacity-40"
                >
                  {submitLoading ? "ENVIANDO..." : "ENVIAR ORDEN"}
                </button>
                <button onClick={() => setStep(2)} className="flex-1 bg-surface-container-highest font-headline font-black py-3">
                  ATRÁS
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Confirmation ── */}
          {step === 4 && (
            <div className="text-center">
              <span
                className="material-symbols-outlined text-tertiary text-6xl mb-4 block"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <h2 className="font-headline font-black text-2xl uppercase mb-2">ORDEN ENVIADA</h2>
              <p className="font-body text-sm text-on-surface/50 mb-8">
                El equipo de 1UP revisará tu comprobante y enviará los tokens a tu wallet.
              </p>

              <div className="bg-surface-container-lowest p-4 text-left space-y-2 mb-8">
                <div className="flex justify-between">
                  <span className="font-headline text-[10px] uppercase text-on-surface/40">Orden</span>
                  <span className="font-headline font-bold text-xs text-on-surface">#{orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-headline text-[10px] uppercase text-on-surface/40">COP pagado</span>
                  <span className="font-headline font-bold text-xs text-on-surface">{formatCop(copInt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-headline text-[10px] uppercase text-on-surface/40">$1UP a recibir</span>
                  <span className="font-headline font-bold text-xs text-tertiary">{tokenAmount.toLocaleString()} $1UP</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-headline text-[10px] uppercase text-on-surface/40">Estado</span>
                  <span className="bg-secondary-container/20 text-secondary font-headline font-bold text-[10px] uppercase px-2 py-0.5">PENDIENTE</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleClose} className="flex-1 bg-tertiary text-background font-headline font-black py-3">
                  CERRAR
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
