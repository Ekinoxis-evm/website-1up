"use client";

import { useRef, useState } from "react";
import { useSendTransaction } from "@privy-io/react-auth";
import { encodeFunctionData, parseUnits } from "viem";
import { publicClient, ONE_UP_TOKEN, ERC20_TRANSFER_ABI } from "@/lib/viem";
import type { Course } from "@/types/database.types";
import { formatCop } from "@/lib/utils";

// H-6: list response is masked; full record fetched per id on selection.
type BankListItem = {
  id:                    number;
  bank_name:             string;
  account_type:          string | null;
  account_number_masked: string | null;
  holder_name:           string;
  sort_order:            number;
};

type BankAccount = {
  id: number;
  bank_name: string;
  account_type: string | null;
  account_number: string;
  holder_name: string;
  holder_document: string | null;
  instructions: string | null;
};

type Method = "token" | "bank" | "cash" | "card";
type Phase = "method" | "token_pay" | "token_sending" | "token_confirming" | "token_registering" |
             "bank_select" | "bank_pay" | "bank_uploading" | "bank_submitting" |
             "cash_confirm" | "cash_submitting" | "card_redirecting" | "success" | "error";

interface Props {
  course:        Course;
  walletAddress: string | null;
  recipientAddress: string | null;
  cashEnabled?:  boolean;
  cardEnabled?:  boolean;
  getAccessToken: () => Promise<string | null>;
  onClose:        () => void;
}

const BASESCAN = "https://basescan.org/tx/";

export function CourseCheckoutWizard({
  course, walletAddress, recipientAddress, cashEnabled = false, cardEnabled = false, getAccessToken, onClose,
}: Props) {
  const { sendTransaction } = useSendTransaction();

  const [phase, setPhase] = useState<Phase>("method");
  const [method, setMethod] = useState<Method | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Token state
  const [txHash, setTxHash] = useState("");

  // Bank state
  const [bankAccounts, setBankAccounts] = useState<BankListItem[]>([]);
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [bankLoading, setBankLoading]   = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [comprobantePath, setComprobantePath] = useState<string | null>(null);
  const [comprobantePreview, setComprobantePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Result
  const [enrollmentId, setEnrollmentId] = useState<number | null>(null);

  async function authHeaders(): Promise<Record<string, string>> {
    const t = await getAccessToken();
    return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
  }

  function copyField(key: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  }

  // ── TOKEN ─────────────────────────────────────────────────────
  async function payWithToken() {
    if (!walletAddress || !recipientAddress || !course.price_token) return;

    setPhase("token_sending"); setErrorMsg("");

    const data = encodeFunctionData({
      abi:          ERC20_TRANSFER_ABI,
      functionName: "transfer",
      args: [
        recipientAddress as `0x${string}`,
        parseUnits(course.price_token.toString(), ONE_UP_TOKEN.decimals),
      ],
    });

    let hash: string;
    try {
      // M-A2.3: aligns with the documented sponsored-send pattern (CLAUDE.md
      // → "Gas Sponsorship"). `value: BigInt(0)` is required so Privy's bundler
      // doesn't infer a value transfer on chains that route missing-value sends
      // differently.
      const result = await sendTransaction(
        { to: ONE_UP_TOKEN.address, value: BigInt(0), data, chainId: 8453 },
        { address: walletAddress, sponsor: true },
      );
      hash = result.hash;
      setTxHash(hash);
    } catch {
      setErrorMsg("La transacción fue cancelada o no se pudo enviar.");
      setPhase("error");
      return;
    }

    setPhase("token_confirming");

    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
        timeout: 120_000,
      });
      if (receipt.status !== "success") {
        setErrorMsg("La transacción falló en la blockchain.");
        setPhase("error");
        return;
      }
    } catch {
      setErrorMsg(`Tiempo de espera agotado. Tu TX fue enviada: ${hash}. Contacta soporte con este hash.`);
      setPhase("error");
      return;
    }

    setPhase("token_registering");

    const res = await fetch("/api/user/course-orders", {
      method:  "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        courseId:      course.id,
        paymentMethod: "token",
        txHash:        hash,
        walletAddress,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      setErrorMsg(body.error ?? "Error al registrar la inscripción.");
      setPhase("error");
      return;
    }

    setEnrollmentId(body.enrollmentId);
    setPhase("success");
  }

  // ── BANK ──────────────────────────────────────────────────────
  async function goToBankSelect() {
    setPhase("bank_select"); setErrorMsg("");
    try {
      const res = await fetch("/api/bank-accounts", { headers: await authHeaders() });
      if (!res.ok) {
        setErrorMsg("No se pudieron cargar las cuentas bancarias.");
        setPhase("error");
        return;
      }
      const data = await res.json() as BankListItem[];
      setBankAccounts(data);
      if (data[0]) await loadBankAccount(data[0].id);
    } catch {
      setErrorMsg("No se pudieron cargar las cuentas bancarias.");
      setPhase("error");
    }
  }

  // H-6: full account record is fetched only after a user selects a bank.
  async function loadBankAccount(id: number) {
    setBankLoading(true);
    try {
      const res = await fetch(`/api/bank-accounts/${id}`, { headers: await authHeaders() });
      if (!res.ok) { setSelectedBank(null); return; }
      setSelectedBank(await res.json() as BankAccount);
    } finally {
      setBankLoading(false);
    }
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

    setPhase("bank_uploading");
    const token = await getAccessToken();
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/user/upload-comprobante", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    setPhase("bank_pay");

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setUploadError(d.error ?? "Error al subir el archivo");
      return;
    }
    const { path } = await res.json() as { path: string };
    setComprobantePath(path);
  }

  async function submitBank() {
    if (!comprobantePath || !selectedBank) return;
    setPhase("bank_submitting"); setErrorMsg("");
    const res = await fetch("/api/user/course-orders", {
      method:  "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        courseId:        course.id,
        paymentMethod:   "bank",
        bankAccountId:   selectedBank.id,
        comprobantePath,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.error ?? "Error al crear la inscripción.");
      setPhase("error");
      return;
    }
    setEnrollmentId(data.enrollmentId);
    setPhase("success");
  }

  // ── CASH ──────────────────────────────────────────────────────
  // No tx, no comprobante — just create the pending enrollment. The admin
  // confirms receipt in person and approves with a mandatory note.
  async function submitCash() {
    setPhase("cash_submitting"); setErrorMsg("");
    const res = await fetch("/api/user/course-orders", {
      method:  "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ courseId: course.id, paymentMethod: "cash" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(
        data.reason === "method_unavailable"
          ? "Este curso no acepta pago en efectivo."
          : (data.error ?? "Error al crear la inscripción."),
      );
      setPhase("error");
      return;
    }
    setEnrollmentId(data.enrollmentId);
    setPhase("success");
  }

  // ── CARD (Stripe Checkout) ────────────────────────────────────
  // Create the pending enrollment + a hosted Checkout Session, then hand off to
  // Stripe. The webhook flips the enrollment to approved on payment.
  async function payWithCard() {
    setPhase("card_redirecting"); setErrorMsg("");
    try {
      const res = await fetch("/api/user/course-orders", {
        method:  "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ courseId: course.id, paymentMethod: "card" }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        setErrorMsg(data.error ?? "No se pudo iniciar el pago con tarjeta.");
        setPhase("error");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setErrorMsg("No se pudo iniciar el pago con tarjeta. Intenta de nuevo.");
      setPhase("error");
    }
  }

  // ── render ────────────────────────────────────────────────────
  const tokenAvailable  = !!(course.price_token && walletAddress && recipientAddress);
  const priceCop        = course.price_cop ?? 0;
  const cashAvailable   = cashEnabled && priceCop > 0;
  const cardAvailable   = cardEnabled && priceCop > 0;

  // Close X disabled during processing
  const allowClose = ["method", "bank_select", "bank_pay", "cash_confirm", "success", "error"].includes(phase);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-surface-container w-full max-w-lg my-8">
        {/* M-A1.1: header uses a background tone shift instead of a 1px divider (Rule 2). */}
        <div className="flex items-center justify-between p-6 bg-surface-container-high">
          <h2 className="font-headline font-black text-xl uppercase tracking-tighter">
            INSCRIBIRSE — <span className="text-primary-container">{course.name}</span>
          </h2>
          {allowClose && (
            <button onClick={onClose} className="text-outline hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        <div className="p-6">
          {/* METHOD SELECT */}
          {phase === "method" && (
            <div className="space-y-4">
              <p className="font-body text-sm text-on-surface/70 mb-2">
                Elige cómo quieres pagar tu inscripción.
              </p>

              <button
                onClick={() => { setMethod("token"); payWithToken(); }}
                disabled={!tokenAvailable}
                className="w-full bg-surface-container-low p-5 text-left hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-headline font-black text-base uppercase">$1UP TOKENS</span>
                  <span className="font-headline font-black text-tertiary text-lg">
                    {course.price_token
                      ? `${course.price_token.toLocaleString()} $1UP`
                      : "No disponible"}
                  </span>
                </div>
                <p className="font-body text-xs text-on-surface/50">
                  {tokenAvailable
                    ? "Pago instantáneo con tus tokens $1UP — inscripción inmediata."
                    : !course.price_token
                      ? "Este curso aún no tiene precio en $1UP."
                      : !walletAddress
                        ? "Necesitas una wallet conectada."
                        : "Wallet de recepción no configurada."}
                </p>
              </button>

              <button
                onClick={() => { setMethod("bank"); goToBankSelect(); }}
                className="w-full bg-surface-container-low p-5 text-left hover:bg-surface-container-high transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-headline font-black text-base uppercase">TRANSFERENCIA BANCARIA</span>
                  <span className="font-headline font-black text-primary text-lg">{formatCop(priceCop)}</span>
                </div>
                <p className="font-body text-xs text-on-surface/50">
                  Transfiere a una cuenta 1UP y sube el comprobante. Revisamos en máx. 24h.
                </p>
              </button>

              {cashAvailable && (
                <button
                  onClick={() => { setMethod("cash"); setPhase("cash_confirm"); }}
                  className="w-full bg-surface-container-low p-5 text-left hover:bg-surface-container-high transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-headline font-black text-base uppercase flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary-container">payments</span>
                      EFECTIVO
                    </span>
                    <span className="font-headline font-black text-primary text-lg">{formatCop(priceCop)}</span>
                  </div>
                  <p className="font-body text-xs text-on-surface/50">
                    Paga en persona en 1UP Gaming Tower — el equipo confirma tu inscripción.
                  </p>
                </button>
              )}

              {cardAvailable && (
                <button
                  onClick={() => { setMethod("card"); payWithCard(); }}
                  className="w-full bg-surface-container-low p-5 text-left hover:bg-surface-container-high transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-headline font-black text-base uppercase flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary-container">credit_card</span>
                      TARJETA / PAGO EN LÍNEA
                    </span>
                    <span className="font-headline font-black text-primary text-lg">{formatCop(priceCop)}</span>
                  </div>
                  <p className="font-body text-xs text-on-surface/50">
                    Paga con tarjeta, Apple Pay o Google Pay — inscripción inmediata al confirmar el pago.
                  </p>
                </button>
              )}
            </div>
          )}

          {/* CARD redirecting */}
          {phase === "card_redirecting" && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <span className="material-symbols-outlined text-tertiary text-5xl animate-spin">refresh</span>
              <p className="font-headline font-black text-base uppercase tracking-tighter">Redirigiendo al pago…</p>
              <p className="font-body text-sm text-on-surface/50">Te llevamos a la pasarela de pago segura.</p>
            </div>
          )}

          {/* Token processing */}
          {(phase === "token_sending" || phase === "token_confirming" || phase === "token_registering") && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <span className="material-symbols-outlined text-tertiary text-5xl animate-spin">refresh</span>
              {phase === "token_sending" && (
                <>
                  <p className="font-headline font-black text-base uppercase tracking-tighter">Enviando transacción…</p>
                  <p className="font-body text-sm text-on-surface/50">Firma la transacción en tu wallet.</p>
                </>
              )}
              {phase === "token_confirming" && (
                <>
                  <p className="font-headline font-black text-base uppercase tracking-tighter">Confirmando en blockchain…</p>
                  <p className="font-body text-sm text-on-surface/50">Esperando confirmación en Base.</p>
                  {txHash && (
                    <a href={`${BASESCAN}${txHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-primary hover:underline">
                      Ver en BaseScan →
                    </a>
                  )}
                </>
              )}
              {phase === "token_registering" && (
                <>
                  <p className="font-headline font-black text-base uppercase tracking-tighter">Registrando inscripción…</p>
                  <p className="font-body text-sm text-on-surface/50">Verificando y guardando.</p>
                </>
              )}
            </div>
          )}

          {/* BANK SELECT */}
          {phase === "bank_select" && (
            <div>
              <p className="font-body text-sm text-on-surface/50 mb-5">
                Selecciona una cuenta y procede a transferir.
              </p>

              <div className="bg-tertiary/10 border border-tertiary/30 p-4 mb-5 flex items-center justify-between">
                <span className="font-headline text-sm text-on-surface/70">Vas a pagar</span>
                <span className="font-headline font-black text-lg text-tertiary">{formatCop(priceCop)}</span>
              </div>

              <div className="space-y-3 mb-5">
                {bankAccounts.map((bank) => (
                  <button
                    key={bank.id}
                    onClick={() => loadBankAccount(bank.id)}
                    disabled={bankLoading}
                    className={`w-full text-left p-4 transition-colors disabled:opacity-50 ${
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
                        <p className="font-mono text-xs text-on-surface/60 mt-1">{bank.account_number_masked}</p>
                        <p className="font-body text-[10px] text-on-surface/40 mt-0.5">{bank.holder_name}</p>
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

              <div className="flex gap-3">
                <button
                  onClick={() => setPhase("bank_pay")}
                  disabled={!selectedBank}
                  className="flex-1 bg-tertiary text-background font-headline font-black py-3 uppercase disabled:opacity-40"
                >
                  YA TRANSFERÍ →
                </button>
                <button onClick={() => setPhase("method")} className="flex-1 bg-surface-container-highest font-headline font-black py-3">
                  ATRÁS
                </button>
              </div>
            </div>
          )}

          {/* BANK PAY (details + upload) */}
          {(phase === "bank_pay" || phase === "bank_uploading" || phase === "bank_submitting") && selectedBank && (
            <div>
              <p className="font-body text-sm text-on-surface/50 mb-5">
                Copia los datos, realiza la transferencia y sube el comprobante.
              </p>

              <div className="bg-surface-container-lowest mb-5">
                <div className="bg-tertiary/10 px-4 py-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-sm">account_balance</span>
                  <span className="font-headline font-black text-xs uppercase tracking-widest text-tertiary">
                    Datos para transferir
                  </span>
                </div>
                <div className="divide-y divide-outline-variant/10">
                  {[
                    { key: "banco",   label: "Banco",              value: selectedBank.bank_name },
                    { key: "tipo",    label: "Tipo de cuenta",     value: selectedBank.account_type ?? "" },
                    { key: "numero",  label: "Número de cuenta",   value: selectedBank.account_number },
                    { key: "titular", label: "Titular",            value: selectedBank.holder_name },
                    { key: "doc",     label: "Documento titular",  value: selectedBank.holder_document ?? "" },
                  ].filter((r) => r.value).map(({ key, label, value }) => (
                    <div key={key} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-headline text-[10px] uppercase tracking-widest text-on-surface/40">{label}</p>
                        <p className="font-headline font-bold text-sm text-on-surface">{value}</p>
                      </div>
                      <button
                        onClick={() => copyField(key, value)}
                        className="shrink-0 flex items-center gap-1 text-xs font-headline uppercase text-on-surface/40 hover:text-tertiary transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {copiedField === key ? "check" : "content_copy"}
                        </span>
                        {copiedField === key ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                  ))}
                  {selectedBank.instructions && (
                    <div className="px-4 py-3 bg-secondary-container/10">
                      <p className="font-body text-xs text-secondary/80 italic">{selectedBank.instructions}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-tertiary/10 border border-tertiary/30 px-4 py-3 mb-5 flex items-center justify-between">
                <span className="font-headline text-xs text-on-surface/60">Monto a transferir</span>
                <span className="font-headline font-black text-lg text-tertiary">{formatCop(priceCop)}</span>
              </div>

              <div className="mb-5">
                <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-2">
                  Comprobante de pago *
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
                  {phase === "bank_uploading" ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-3xl text-tertiary animate-pulse">upload</span>
                      <span className="font-headline text-xs uppercase text-on-surface/40">Subiendo…</span>
                    </div>
                  ) : comprobantePreview ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={comprobantePreview} alt="preview" className="max-h-32 mx-auto object-contain" />
                  ) : comprobantePath ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-3xl text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span className="font-headline text-xs uppercase text-tertiary">Archivo subido</span>
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

              <div className="flex gap-3">
                <button
                  onClick={submitBank}
                  disabled={phase === "bank_submitting" || !comprobantePath}
                  className="flex-1 bg-tertiary text-background font-headline font-black py-3 uppercase disabled:opacity-40"
                >
                  {phase === "bank_submitting" ? "ENVIANDO…" : "ENVIAR INSCRIPCIÓN"}
                </button>
                <button
                  onClick={() => setPhase("bank_select")}
                  disabled={phase === "bank_submitting"}
                  className="flex-1 bg-surface-container-highest font-headline font-black py-3 disabled:opacity-40"
                >
                  ATRÁS
                </button>
              </div>
            </div>
          )}

          {/* CASH CONFIRM */}
          {(phase === "cash_confirm" || phase === "cash_submitting") && (
            <div className="space-y-5">
              <div className="bg-surface-container-low p-4 flex justify-between items-center">
                <span className="font-headline text-xs uppercase tracking-widest text-outline">Inscripción</span>
                <span className="font-headline font-black text-lg text-tertiary">{formatCop(priceCop)}</span>
              </div>

              <div className="bg-surface-container-low p-5 flex items-start gap-3">
                <span className="material-symbols-outlined text-primary-container text-3xl shrink-0">payments</span>
                <p className="font-body text-sm text-on-surface/80 leading-relaxed">
                  Paga en efectivo en 1UP Gaming Tower. Al registrar tu inscripción, el equipo
                  confirmará tu acceso al curso cuando recibas el pago en persona.
                </p>
              </div>

              <div className="bg-secondary-container/10 p-4">
                <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-secondary mb-1">Importante</p>
                <p className="font-body text-xs text-on-surface/70 leading-relaxed">
                  Tu inscripción queda en revisión hasta que el equipo confirme el pago.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={submitCash}
                  disabled={phase === "cash_submitting"}
                  className="flex-1 bg-tertiary text-background font-headline font-black uppercase py-3 disabled:opacity-40"
                >
                  {phase === "cash_submitting" ? "REGISTRANDO…" : "REGISTRAR INSCRIPCIÓN"}
                </button>
                <button
                  onClick={() => setPhase("method")}
                  disabled={phase === "cash_submitting"}
                  className="flex-1 bg-surface-container-highest font-headline font-black py-3 disabled:opacity-40"
                >
                  ATRÁS
                </button>
              </div>
            </div>
          )}

          {/* SUCCESS */}
          {phase === "success" && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3 py-4">
                <span
                  className="material-symbols-outlined text-tertiary text-6xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <p className="font-headline font-black text-2xl uppercase tracking-tighter text-center">
                  {method === "token" ? "¡Inscripción confirmada!" : "Solicitud enviada"}
                </p>
              </div>

              <div className="bg-surface-container-low p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="font-headline text-xs uppercase tracking-widest text-outline">Inscripción</span>
                  <span className="font-headline font-bold">#{enrollmentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-headline text-xs uppercase tracking-widest text-outline">Curso</span>
                  <span className="font-headline font-bold text-right">{course.name}</span>
                </div>
                {method === "token" && (
                  <>
                    <div className="flex justify-between">
                      <span className="font-headline text-xs uppercase tracking-widest text-outline">Pagado</span>
                      <span className="font-headline font-bold">{course.price_token?.toLocaleString()} $1UP</span>
                    </div>
                    {txHash && (
                      <div className="flex justify-between">
                        <span className="font-headline text-xs uppercase tracking-widest text-outline">TX</span>
                        <a
                          href={`${BASESCAN}${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          {txHash.slice(0, 10)}…{txHash.slice(-6)}
                        </a>
                      </div>
                    )}
                  </>
                )}
                {(method === "bank" || method === "cash") && (
                  <>
                    <div className="flex justify-between">
                      <span className="font-headline text-xs uppercase tracking-widest text-outline">Monto</span>
                      <span className="font-headline font-bold">{formatCop(priceCop)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-headline text-xs uppercase tracking-widest text-outline">Estado</span>
                      <span className="bg-secondary-container/20 text-secondary font-headline font-bold text-[10px] uppercase px-2 py-0.5">PENDIENTE</span>
                    </div>
                  </>
                )}
              </div>

              {method === "bank" && (
                <p className="font-body text-xs text-on-surface/50 text-center">
                  El equipo revisará tu comprobante y confirmará tu inscripción en máx. 24h.
                </p>
              )}
              {method === "cash" && (
                <p className="font-body text-xs text-on-surface/50 text-center">
                  Paga en persona en 1UP Gaming Tower. El equipo confirmará tu inscripción al recibir el pago.
                </p>
              )}

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
                  <a href={`${BASESCAN}${txHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-primary hover:underline">
                    Ver TX en BaseScan →
                  </a>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setPhase("method"); setErrorMsg(""); setTxHash(""); }}
                  className="flex-1 bg-primary-container text-white font-headline font-black uppercase tracking-tighter py-3"
                >
                  INTENTAR DE NUEVO
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-surface-container-high text-on-background font-headline font-black uppercase tracking-tighter py-3"
                >
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

