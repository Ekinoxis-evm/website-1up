"use client";

// Payment step for paid tournament entry (v2.41.0). Mirrors the 1UP Pass
// purchase wizards: token flow = BuyPassWizard (tx-first + server re-verify),
// bank flow = BuyPassBankWizard (comprobante + admin approval). The slot is
// only taken once the payment is confirmed/approved — no holds, no refunds.

import { useState, useEffect, useRef } from "react";
import { useSendTransaction } from "@privy-io/react-auth";
import { encodeFunctionData, parseUnits } from "viem";
import { publicClient, ONE_UP_TOKEN, ERC20_TRANSFER_ABI } from "@/lib/viem";
import { TOKEN_COP_RATE } from "@/lib/tournamentEntry";

type BankListItem = {
  id:                    number;
  bank_name:             string;
  account_type:          string | null;
  account_number_masked: string | null;
  holder_name:           string;
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

type View =
  | "method" | "no_method"
  | "token_confirm" | "token_sending" | "token_confirming" | "token_registering" | "token_success" | "token_error"
  | "bank_data" | "bank_comprobante" | "bank_success"
  | "cash_confirm"
  | "card_redirecting";

interface Props {
  tournamentId:    number;
  tournamentName:  string;
  entryFeeTokens:  number | null;
  entryFeeCop:     number | null;
  treasuryAddress: string | null;
  cashEnabled:     boolean;
  cardEnabled:     boolean;
  walletAddress:   string | null;
  getAccessToken:  () => Promise<string | null>;
  onClose:         () => void;
  onRegistered:    (googleCalendarUrl: string) => void;
  onPending:       () => void;
}

const BASESCAN = "https://basescan.org/tx/";

function fmtCop(n: number): string {
  return `$${n.toLocaleString("es-CO")} COP`;
}

const TREASURY_RE = /^0x[a-fA-F0-9]{40}$/;

export function TournamentEntryWizard({
  tournamentId, tournamentName, entryFeeTokens, entryFeeCop, treasuryAddress, cashEnabled, cardEnabled, walletAddress,
  getAccessToken, onClose, onRegistered, onPending,
}: Props) {
  const { sendTransaction } = useSendTransaction();

  const recipientAddress = treasuryAddress && TREASURY_RE.test(treasuryAddress) ? treasuryAddress : null;
  const tokenAvailable = entryFeeTokens != null && entryFeeTokens > 0 && recipientAddress != null;
  const bankAvailable  = entryFeeCop != null && entryFeeCop > 0;
  // Cash is collected in pesos at the venue, so it requires a COP fee + the
  // admin toggle (server enforces both — this just mirrors it for the UI).
  const cashAvailable  = cashEnabled && entryFeeCop != null && entryFeeCop > 0;
  // Card is charged in pesos via Stripe Checkout, so it requires a COP fee + the
  // admin toggle + the live flag (server enforces all — this mirrors it).
  const cardAvailable  = cardEnabled && entryFeeCop != null && entryFeeCop > 0;
  const canPayToken    = tokenAvailable && !!walletAddress;
  // Whether more than one method exists — drives the method-choice screen and
  // the "ATRÁS" affordances on each sub-flow.
  const methodCount = [tokenAvailable, bankAvailable, cashAvailable, cardAvailable].filter(Boolean).length;

  const [view, setView] = useState<View>(() => {
    if (methodCount > 1) return "method";
    if (tokenAvailable) return "token_confirm";
    if (bankAvailable)  return "bank_data";
    if (cashAvailable)  return "cash_confirm";
    if (cardAvailable)  return "card_redirecting";
    // Paid-token tournament whose treasury isn't configured yet — fail closed.
    return "no_method";
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash]     = useState("");

  // ── Bank state ──────────────────────────────────────────────────────
  const [bankAccounts, setBankAccounts]             = useState<BankListItem[]>([]);
  const [selectedBank, setSelectedBank]             = useState<BankAccount | null>(null);
  const [bankLoading, setBankLoading]               = useState(false);
  const [copiedField, setCopiedField]               = useState<string | null>(null);
  const [comprobantePath, setComprobantePath]       = useState<string | null>(null);
  const [comprobantePreview, setComprobantePreview] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading]           = useState(false);
  const [uploadError, setUploadError]               = useState<string | null>(null);
  const [submitLoading, setSubmitLoading]           = useState(false);
  const [submitError, setSubmitError]               = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // The pending-state screen ("bank_success") is shared by the wire and cash
  // paths; this drives the message variant.
  const [pendingMethod, setPendingMethod] = useState<"bank" | "cash">("bank");

  // ── Cash state ──────────────────────────────────────────────────────
  const [cashLoading, setCashLoading] = useState(false);
  const [cashError, setCashError]     = useState<string | null>(null);

  // ── Card state ──────────────────────────────────────────────────────
  const [cardError, setCardError] = useState<string | null>(null);

  async function authHeader(): Promise<Record<string, string>> {
    const token = await getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // ── Token flow (mirrors BuyPassWizard) ──────────────────────────────
  async function handlePayToken() {
    if (!walletAddress || !recipientAddress || !entryFeeTokens) return;
    setView("token_sending");
    setErrorMsg("");

    const data = encodeFunctionData({
      abi:          ERC20_TRANSFER_ABI,
      functionName: "transfer",
      args: [
        recipientAddress as `0x${string}`,
        parseUnits(entryFeeTokens.toString(), ONE_UP_TOKEN.decimals),
      ],
    });

    let hash: string;
    try {
      const result = await sendTransaction(
        { to: ONE_UP_TOKEN.address, value: BigInt(0), data, chainId: 8453 },
        { address: walletAddress, sponsor: true },
      );
      hash = result.hash;
      setTxHash(hash);
    } catch {
      setErrorMsg("La transacción fue cancelada o no se pudo enviar.");
      setView("token_error");
      return;
    }

    setView("token_confirming");

    let receipt;
    try {
      receipt = await publicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
        timeout: 120_000,
      });
    } catch {
      setErrorMsg(`Tiempo de espera agotado. Tu TX fue enviada: ${hash}. Contacta soporte con este hash.`);
      setView("token_error");
      return;
    }

    if (receipt.status !== "success") {
      setErrorMsg("La transacción falló en la blockchain.");
      setView("token_error");
      return;
    }

    setView("token_registering");

    const token = await getAccessToken();
    const res = await fetch("/api/user/tournament-entry-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tournamentId, paymentMethod: "token", txHash: hash, walletAddress }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErrorMsg(body.error ?? "Error al registrar el pago.");
      setView("token_error");
      return;
    }

    setView("token_success");
    onRegistered(body.googleCalendarUrl ?? "");
  }

  // ── Bank flow (mirrors BuyPassBankWizard) ───────────────────────────
  async function loadBanks() {
    const res = await fetch("/api/bank-accounts", { headers: await authHeader() });
    if (!res.ok) return;
    const data = await res.json() as BankListItem[];
    setBankAccounts(data);
    if (data[0]) await loadBankAccount(data[0].id);
  }

  useEffect(() => {
    if (view === "bank_data" && bankAccounts.length === 0) loadBanks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  async function loadBankAccount(id: number) {
    setBankLoading(true);
    try {
      const res = await fetch(`/api/bank-accounts/${id}`, { headers: await authHeader() });
      if (!res.ok) { setSelectedBank(null); return; }
      setSelectedBank(await res.json() as BankAccount);
    } finally {
      setBankLoading(false);
    }
  }

  function copyField(key: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
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

  async function handleBankSubmit() {
    if (!comprobantePath || !selectedBank) return;
    setSubmitLoading(true); setSubmitError(null);

    const token = await getAccessToken();
    const res = await fetch("/api/user/tournament-entry-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        tournamentId,
        paymentMethod: "bank",
        bankAccountId: selectedBank.id,
        comprobantePath,
      }),
    });

    setSubmitLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setSubmitError(d.error ?? "Error al crear la solicitud");
      return;
    }
    setPendingMethod("bank");
    setView("bank_success");
    onPending();
  }

  // ── Cash flow ───────────────────────────────────────────────────────
  // The simplest path: the user commits to paying in person, an admin confirms
  // receipt later. No tx, no comprobante — just create the pending order.
  async function handleCashSubmit() {
    setCashLoading(true); setCashError(null);

    const token = await getAccessToken();
    const res = await fetch("/api/user/tournament-entry-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ tournamentId, paymentMethod: "cash" }),
    });

    setCashLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setCashError(
        d.reason === "method_unavailable"
          ? "Este torneo no acepta pago en efectivo."
          : (d.error ?? "Error al crear la solicitud"),
      );
      return;
    }
    setPendingMethod("cash");
    setView("bank_success");
    onPending();
  }

  // ── Card flow (Stripe Checkout) ─────────────────────────────────────
  // The server creates a pending order + a Stripe-hosted Checkout session and
  // returns its URL. We full-page-redirect the browser there; payment is
  // confirmed asynchronously by a Stripe webhook (the user leaves the site).
  async function handleCardSubmit() {
    setCardError(null);
    setView("card_redirecting");

    const token = await getAccessToken();
    const res = await fetch("/api/user/tournament-entry-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ tournamentId, paymentMethod: "card" }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.checkoutUrl) {
      setCardError(
        body.reason === "method_unavailable"
          ? "Este torneo no acepta pago con tarjeta."
          : (body.error ?? "Error al iniciar el pago con tarjeta."),
      );
      setView("method");
      return;
    }

    window.location.href = body.checkoutUrl as string;
  }

  // Card-only tournaments open straight into the redirect view — kick off the
  // POST once on mount so the user doesn't see an empty loading screen.
  const cardKickedOff = useRef(false);
  useEffect(() => {
    if (view === "card_redirecting" && !cardKickedOff.current) {
      cardKickedOff.current = true;
      handleCardSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closable = ["method", "no_method", "token_confirm", "token_success", "token_error", "bank_data", "bank_comprobante", "bank_success", "cash_confirm"].includes(view);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-container w-full max-w-md relative max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-headline font-black text-xl uppercase tracking-tighter">
                INSCRIPCIÓN <span className="text-primary-container">CON PAGO</span>
              </h2>
              <p className="font-body text-xs text-on-surface/60 mt-1">{tournamentName}</p>
            </div>
            {closable && (
              <button onClick={onClose} className="text-outline hover:text-on-surface transition-colors shrink-0">
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>

          {/* ── Method choice ── */}
          {view === "method" && (
            <div className="space-y-4">
              <div className="bg-surface-container-low p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-headline text-xs uppercase tracking-widest text-outline">Costo de inscripción</span>
                </div>
                {tokenAvailable && (
                  <div className="flex justify-between items-center">
                    <span className="font-headline text-xs uppercase tracking-widest text-outline">Con $1UP</span>
                    <span className="font-headline font-black text-xl">
                      {entryFeeTokens!.toLocaleString("es-CO")} <span className="text-sm text-primary-container">$1UP</span>
                    </span>
                  </div>
                )}
                {(bankAvailable || cashAvailable) && (
                  <div className="flex justify-between items-center">
                    <span className="font-headline text-xs uppercase tracking-widest text-outline">En COP</span>
                    <span className="font-headline font-black text-xl">{fmtCop(entryFeeCop!)}</span>
                  </div>
                )}
                <p className="font-body text-[10px] text-on-surface/40">Equivalencia de referencia: 1 $1UP = {TOKEN_COP_RATE.toLocaleString("es-CO")} COP.</p>
              </div>

              <button
                onClick={() => setView("token_confirm")}
                disabled={!canPayToken}
                className="w-full bg-primary-container text-white font-headline font-black uppercase tracking-tighter py-4 disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                PAGAR CON $1UP
              </button>
              {!canPayToken && tokenAvailable && (
                <p className="font-body text-xs text-on-surface/50 -mt-2">
                  Necesitas una wallet asociada para pagar con $1UP.
                </p>
              )}
              {bankAvailable && (
                <button
                  onClick={() => setView("bank_data")}
                  className="w-full bg-surface-container-high text-on-background font-headline font-black uppercase tracking-tighter py-4 hover:opacity-90 transition-opacity"
                >
                  TRANSFERENCIA BANCARIA
                </button>
              )}
              {cashAvailable && (
                <div className="space-y-1">
                  <button
                    onClick={() => setView("cash_confirm")}
                    className="w-full bg-surface-container-high text-on-background font-headline font-black uppercase tracking-tighter py-4 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">payments</span>
                    EFECTIVO
                  </button>
                  <p className="font-body text-xs text-on-surface/50">
                    Paga en el evento — el equipo confirma tu inscripción.
                  </p>
                </div>
              )}
              {cardAvailable && (
                <div className="space-y-1">
                  <button
                    onClick={handleCardSubmit}
                    className="w-full bg-surface-container-high text-on-background font-headline font-black uppercase tracking-tighter py-4 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">credit_card</span>
                    TARJETA / PAGO EN LÍNEA
                  </button>
                  <p className="font-body text-xs text-on-surface/50">
                    Paga con tarjeta, Apple Pay o Google Pay.
                  </p>
                </div>
              )}
              {cardError && <p className="font-body text-xs text-error">{cardError}</p>}
            </div>
          )}

          {/* ── No payment method available (treasury missing) ── */}
          {view === "no_method" && (
            <div className="space-y-5 text-center py-4">
              <span className="material-symbols-outlined text-error text-5xl">error</span>
              <div>
                <p className="font-headline font-black text-xl uppercase tracking-tighter">Pagos no disponibles</p>
                <p className="font-body text-sm text-on-surface/60 mt-2">
                  Este torneo aún no tiene una tesorería configurada para recibir pagos en $1UP.
                  Contacta al equipo 1UP para completar tu inscripción.
                </p>
              </div>
              <button onClick={onClose}
                className="w-full bg-surface-container-high text-on-background font-headline font-black uppercase tracking-tighter py-3">
                CERRAR
              </button>
            </div>
          )}

          {/* ── Token: confirm ── */}
          {view === "token_confirm" && (
            <div className="space-y-5">
              <div className="bg-surface-container-low p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-headline text-xs uppercase tracking-widest text-outline">Inscripción</span>
                  <span className="font-headline font-black text-2xl">
                    {entryFeeTokens?.toLocaleString("es-CO")} <span className="text-sm text-primary-container">$1UP</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-headline text-xs uppercase tracking-widest text-outline">Equivale a</span>
                  <span className="font-headline font-bold">{fmtCop((entryFeeTokens ?? 0) * TOKEN_COP_RATE)}</span>
                </div>
                {walletAddress && (
                  <div className="flex justify-between items-center">
                    <span className="font-headline text-xs uppercase tracking-widest text-outline">Wallet</span>
                    <span className="font-mono text-xs text-on-surface/70">
                      {walletAddress.slice(0, 8)}…{walletAddress.slice(-6)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-headline text-xs uppercase tracking-widest text-outline">Token</span>
                  <span className="font-mono text-xs text-on-surface/70">$1UP · Base</span>
                </div>
              </div>

              <p className="font-body text-xs text-on-surface/50">
                Al confirmar se abrirá tu wallet para firmar la transacción. Tu cupo se asigna
                automáticamente al confirmarse el pago — no cierres esta ventana.
              </p>

              <button
                onClick={handlePayToken}
                disabled={!recipientAddress || !canPayToken}
                className="w-full bg-primary-container text-white font-headline font-black text-lg uppercase tracking-tighter py-4 disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                PAGAR {entryFeeTokens?.toLocaleString("es-CO")} $1UP
              </button>
              {tokenAvailable && bankAvailable && (
                <button onClick={() => setView("method")} className="w-full bg-surface-container-high font-headline font-black uppercase text-sm py-3">
                  ATRÁS
                </button>
              )}
            </div>
          )}

          {/* ── Token: processing phases ── */}
          {(view === "token_sending" || view === "token_confirming" || view === "token_registering") && (
            <div className="flex flex-col items-center gap-6 py-8">
              <span className="material-symbols-outlined text-primary text-5xl animate-spin">refresh</span>
              <div className="text-center space-y-1">
                {view === "token_sending" && (
                  <>
                    <p className="font-headline font-black text-lg uppercase tracking-tighter">Enviando transacción…</p>
                    <p className="font-body text-sm text-on-surface/50">Firma la transacción en tu wallet.</p>
                  </>
                )}
                {view === "token_confirming" && (
                  <>
                    <p className="font-headline font-black text-lg uppercase tracking-tighter">Confirmando en blockchain…</p>
                    <p className="font-body text-sm text-on-surface/50">Esperando confirmación en Base. Esto puede tomar unos segundos.</p>
                    {txHash && (
                      <a href={`${BASESCAN}${txHash}`} target="_blank" rel="noopener noreferrer"
                        className="font-mono text-xs text-primary hover:underline block mt-2">
                        Ver en BaseScan →
                      </a>
                    )}
                  </>
                )}
                {view === "token_registering" && (
                  <>
                    <p className="font-headline font-black text-lg uppercase tracking-tighter">Confirmando tu cupo…</p>
                    <p className="font-body text-sm text-on-surface/50">Verificando el pago e inscribiéndote en el torneo.</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Token: success ── */}
          {view === "token_success" && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3 py-4">
                <span className="material-symbols-outlined text-tertiary text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
                <p className="font-headline font-black text-2xl uppercase tracking-tighter text-center">
                  ¡Inscripción confirmada!
                </p>
                <p className="font-body text-sm text-on-surface/60 text-center">
                  Tu pago fue verificado y tu cupo en el torneo quedó asignado.
                </p>
                {txHash && (
                  <a href={`${BASESCAN}${txHash}`} target="_blank" rel="noopener noreferrer"
                    className="font-mono text-xs text-primary hover:underline">
                    Ver TX en BaseScan →
                  </a>
                )}
              </div>
              <button onClick={onClose}
                className="w-full bg-surface-container-high text-on-background font-headline font-black uppercase tracking-tighter py-3">
                CERRAR
              </button>
            </div>
          )}

          {/* ── Token: error ── */}
          {view === "token_error" && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3 py-4">
                <span className="material-symbols-outlined text-error text-5xl">error</span>
                <p className="font-headline font-black text-xl uppercase tracking-tighter text-error text-center">
                  Algo salió mal
                </p>
                <p className="font-body text-sm text-on-surface/70 text-center">{errorMsg}</p>
                {txHash && (
                  <a href={`${BASESCAN}${txHash}`} target="_blank" rel="noopener noreferrer"
                    className="font-mono text-xs text-primary hover:underline">
                    Ver TX en BaseScan →
                  </a>
                )}
              </div>
              <button onClick={onClose}
                className="w-full bg-surface-container-high text-on-background font-headline font-black uppercase tracking-tighter py-3">
                CERRAR
              </button>
            </div>
          )}

          {/* ── Bank: datos bancarios ── */}
          {view === "bank_data" && (
            <div className="space-y-5">
              <div className="bg-surface-container-low p-4 flex justify-between items-center">
                <span className="font-headline text-xs uppercase tracking-widest text-outline">Inscripción</span>
                <span className="font-headline font-black text-xl">{fmtCop(entryFeeCop ?? 0)}</span>
              </div>

              {bankAccounts.length > 1 && (
                <div>
                  <p className="font-headline text-xs uppercase tracking-widest text-outline mb-2">Selecciona la cuenta</p>
                  <div className="flex flex-col gap-2">
                    {bankAccounts.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => loadBankAccount(b.id)}
                        disabled={bankLoading}
                        className={`p-3 text-left font-body text-sm border-2 transition-colors disabled:opacity-50 ${
                          selectedBank?.id === b.id
                            ? "border-primary-container bg-primary-container/10"
                            : "border-surface-container-high"
                        }`}
                      >
                        <span className="font-headline font-bold">{b.bank_name}</span>{" — "}{b.account_number_masked}
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
                      <button onClick={() => copyField(key, value)}
                        className="shrink-0 text-outline hover:text-primary-container transition-colors">
                        <span className="material-symbols-outlined text-sm">
                          {copiedField === key ? "check" : "content_copy"}
                        </span>
                      </button>
                    </div>
                  ))}
                  {selectedBank.instructions && (
                    <p className="font-body text-xs text-on-surface/60 pt-2">{selectedBank.instructions}</p>
                  )}
                </div>
              )}

              <div className="bg-secondary/10 p-4">
                <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-secondary mb-1">Importante — sin reembolsos automáticos</p>
                <p className="font-body text-xs text-on-surface/70 leading-relaxed">
                  Tu cupo se confirma solo cuando el equipo apruebe tu comprobante. Si el torneo
                  se llena antes de la aprobación, no podremos inscribirte y el reembolso se
                  gestionará manualmente con el equipo 1UP.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setView("bank_comprobante")}
                  disabled={!selectedBank}
                  className="flex-1 bg-primary-container text-white font-headline font-black uppercase py-3 disabled:opacity-40"
                >
                  YA TRANSFERÍ →
                </button>
                {tokenAvailable && bankAvailable && (
                  <button onClick={() => setView("method")} className="px-5 bg-surface-container-high font-headline font-black uppercase text-sm">
                    ATRÁS
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Bank: comprobante ── */}
          {view === "bank_comprobante" && (
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
                  onClick={handleBankSubmit}
                  disabled={!comprobantePath || submitLoading}
                  className="flex-1 bg-primary-container text-white font-headline font-black uppercase py-3 disabled:opacity-40"
                >
                  {submitLoading ? "Enviando…" : "ENVIAR SOLICITUD"}
                </button>
                <button onClick={() => setView("bank_data")} className="px-5 bg-surface-container-high font-headline font-black uppercase text-sm">
                  ATRÁS
                </button>
              </div>
            </div>
          )}

          {/* ── Cash: confirm ── */}
          {view === "cash_confirm" && (
            <div className="space-y-5">
              <div className="bg-surface-container-low p-4 flex justify-between items-center">
                <span className="font-headline text-xs uppercase tracking-widest text-outline">Inscripción</span>
                <span className="font-headline font-black text-xl">{fmtCop(entryFeeCop ?? 0)}</span>
              </div>

              <div className="bg-surface-container-low p-5 flex items-start gap-3">
                <span className="material-symbols-outlined text-primary-container text-3xl shrink-0">payments</span>
                <p className="font-body text-sm text-on-surface/80 leading-relaxed">
                  Paga en efectivo en el evento. Al registrar tu inscripción, el equipo 1UP
                  confirmará tu cupo cuando recibas el pago en persona.
                </p>
              </div>

              <div className="bg-secondary/10 p-4">
                <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-secondary mb-1">Importante</p>
                <p className="font-body text-xs text-on-surface/70 leading-relaxed">
                  Tu cupo queda en revisión hasta que el equipo confirme el pago. Si el torneo
                  se llena antes de que pagues, no podremos garantizar tu inscripción.
                </p>
              </div>

              {cashError && <p className="font-body text-xs text-error">{cashError}</p>}

              <div className="flex gap-3">
                <button
                  onClick={handleCashSubmit}
                  disabled={cashLoading}
                  className="flex-1 bg-primary-container text-white font-headline font-black uppercase py-3 disabled:opacity-40"
                >
                  {cashLoading ? "Registrando…" : "REGISTRAR INSCRIPCIÓN"}
                </button>
                {methodCount > 1 && (
                  <button onClick={() => setView("method")} className="px-5 bg-surface-container-high font-headline font-black uppercase text-sm">
                    ATRÁS
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Bank/Cash: success (esperando aprobación) ── */}
          {view === "bank_success" && (
            <div className="space-y-5 text-center py-4">
              <span className="material-symbols-outlined text-secondary text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                pending_actions
              </span>
              <div>
                <p className="font-headline font-black text-2xl uppercase tracking-tighter">¡Solicitud enviada!</p>
                {pendingMethod === "cash" ? (
                  <p className="font-body text-sm text-on-surface/60 mt-2">
                    Tu inscripción en efectivo quedó registrada. Paga en el evento y el equipo
                    confirmará tu cupo. Recuerda: si el torneo se llena antes de tu pago, no
                    podremos garantizar tu inscripción.
                  </p>
                ) : (
                  <p className="font-body text-sm text-on-surface/60 mt-2">
                    Tu pago está en revisión — el equipo lo aprobará en máximo 24 horas hábiles
                    y tu cupo quedará asignado en ese momento. Recuerda: si el torneo se llena
                    antes de la aprobación, el reembolso se gestiona manualmente.
                  </p>
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

          {/* ── Card: redirecting to Stripe Checkout ── */}
          {view === "card_redirecting" && (
            <div className="flex flex-col items-center gap-6 py-10 text-center">
              <span className="material-symbols-outlined text-primary text-5xl animate-spin">refresh</span>
              <div className="space-y-1">
                <p className="font-headline font-black text-lg uppercase tracking-tighter">Redirigiendo a la pasarela de pago…</p>
                <p className="font-body text-sm text-on-surface/50">
                  Te llevamos a la página segura de pago. No cierres esta ventana.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
