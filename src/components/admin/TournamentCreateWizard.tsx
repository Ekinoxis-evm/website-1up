"use client";

// Guided tournament creation wizard — replaces the old name-only quick-create.
//
// A multi-step modal that collects the full tournament up front, then POSTs the
// complete body to /api/admin/tournaments (which validates fee/treasury via
// parseEntryFeeInput and prizes via validatePrizes server-side). On success it
// jumps straight into the cockpit at /admin/torneos/{slug}/manage.
//
// Steps: Básico → Inscripción → Premios (skippable) → Presentación (skippable)
// → Revisar y crear. "Crear ahora" is available from step 1 onward so the admin
// can ship with whatever's filled so far and finish the rest inline in the cockpit.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { AdminTorneoPrizesEditor, type PrizeFormRow } from "@/components/admin/AdminTorneoPrizesEditor";
import { useAdminToast } from "@/components/admin/ui/Toast";
import type { Game } from "@/types/database.types";

type TreasuryWalletOption = { id: number; label: string; address: string };

interface Props {
  games:           Pick<Game, "id" | "name">[];
  treasuryWallets: TreasuryWalletOption[];
  defaultPassDays?: number;
  onClose:         () => void;
}

const CUSTOM_TREASURY = "__custom__";
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "https://admin.1upesports.org";

const STEPS = ["Básico", "Inscripción", "Premios", "Presentación", "Revisar"] as const;
const LOC_LABELS = { presencial: "Presencial", online: "Online", mixto: "Mixto" } as const;

const EVM_RE = /^0x[a-fA-F0-9]{40}$/;

export function TournamentCreateWizard({ games, treasuryWallets, defaultPassDays = 30, onClose }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const { showError, showSuccess } = useAdminToast();

  const [step, setStep] = useState(0);

  // Step 1 — Básico
  const [name, setName]                       = useState("");
  const [gameId, setGameId]                   = useState("");
  const [date, setDate]                       = useState("");
  const [locationType, setLocationType]       = useState<"presencial" | "online" | "mixto">("presencial");
  const [maxParticipants, setMaxParticipants] = useState("");

  // Step 2 — Inscripción
  const [isPaid, setIsPaid]                   = useState(false);
  const [entryFeeTokens, setEntryFeeTokens]   = useState("");
  const [entryFeeCop, setEntryFeeCop]         = useState("");
  const [treasuryAddress, setTreasuryAddress] = useState("");
  const [isRegistrationOpen, setIsRegOpen]    = useState(false);

  // Step 3 — Premios
  const [prizes, setPrizes]                   = useState<PrizeFormRow[]>([]);

  // Step 4 — Presentación
  const [imageUrl, setImageUrl]               = useState("");
  const [description, setDescription]         = useState("");
  const [sponsorName, setSponsorName]         = useState("");
  const [sponsorWebsiteUrl, setSponsorWebUrl] = useState("");
  const [sponsorLogoUrl, setSponsorLogoUrl]   = useState("");

  const [creating, setCreating]   = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const tokenFeeSet  = isPaid && entryFeeTokens.trim() !== "" && Number(entryFeeTokens) > 0;
  const treasuryOk   = EVM_RE.test(treasuryAddress.trim());
  const hasWallets   = treasuryWallets.length > 0;
  const treasuryInList = treasuryWallets.some((w) => w.address.toLowerCase() === treasuryAddress.trim().toLowerCase());
  const showCustomOption = treasuryAddress.trim() !== "" && !treasuryInList;

  const nameOk = name.trim() !== "";

  // Light client gate — the server (parseEntryFeeInput) is the source of truth.
  function inscriptionBlocked(): string | null {
    if (tokenFeeSet && !treasuryOk) {
      return "Para cobrar la inscripción en $1UP selecciona una tesorería (wallet) EVM válida.";
    }
    return null;
  }

  function goNext() {
    setError(null);
    if (step === 0 && !nameOk) { setError("El nombre es requerido."); return; }
    if (step === 1) {
      const blocked = inscriptionBlocked();
      if (blocked) { setError(blocked); return; }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function buildBody() {
    return {
      name: name.trim(),
      gameId: gameId || null,
      date: date ? `${date}:00-05:00` : null,
      maxParticipants: maxParticipants || null,
      locationType,
      imageUrl: imageUrl || null,
      description: description || null,
      isRegistrationOpen,
      sponsorName: sponsorName || null,
      sponsorWebsiteUrl: sponsorWebsiteUrl || null,
      sponsorLogoUrl: sponsorLogoUrl || null,
      // Only send fee fields when the admin chose "de pago" — a free tournament
      // leaves them empty so parseEntryFeeInput treats it as gratis.
      entryFeeTokens: isPaid ? entryFeeTokens : "",
      entryFeeCop: isPaid ? entryFeeCop : "",
      treasuryAddress: isPaid ? treasuryAddress : "",
      prizes,
    };
  }

  async function handleCreate() {
    if (!nameOk) { setError("El nombre es requerido."); setStep(0); return; }
    const blocked = inscriptionBlocked();
    if (blocked) { setError(blocked); setStep(1); return; }

    setCreating(true); setError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/admin/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(buildBody()),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error ?? "No se pudo crear el torneo. Intenta de nuevo.";
        setError(msg);
        showError(msg);
        return;
      }
      const data: { slug: string | null; id: number } = await res.json();
      showSuccess("Torneo creado.");
      if (data.slug) {
        router.push(`/admin/torneos/${data.slug}/manage`);
      } else {
        router.refresh();
        onClose();
      }
    } catch {
      const msg = "Error de red al crear el torneo.";
      setError(msg);
      showError(msg);
    } finally {
      setCreating(false);
    }
  }

  const labelCls = "block font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-1";
  const inputCls = "w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
      onClick={() => !creating && onClose()}
    >
      <div
        className="bg-surface-container w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          disabled={creating}
          className="absolute top-4 right-4 text-outline hover:text-on-surface disabled:opacity-40"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2 className="font-headline font-black text-2xl uppercase tracking-tighter mb-1">
          NUEVO <span className="text-primary-container">TORNEO</span>
        </h2>

        {/* Step indicator — bg-tone differences only, no dividers */}
        <div className="flex gap-1 mt-4 mb-6">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1.5 w-full ${i <= step ? "bg-primary-container" : "bg-surface-container-high"}`} />
              <span className={`block mt-1.5 font-headline font-bold text-[9px] uppercase tracking-widest ${i === step ? "text-on-surface" : "text-outline/50"}`}>
                {i + 1}. {label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Step 1 · Básico ─────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Nombre *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Copa 1UP — Valorant S1"
                autoFocus
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Juego</label>
                <select value={gameId} onChange={(e) => setGameId(e.target.value)} className={inputCls}>
                  <option value="">— Sin juego —</option>
                  {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Modalidad</label>
                <select value={locationType} onChange={(e) => setLocationType(e.target.value as "presencial" | "online" | "mixto")} className={inputCls}>
                  <option value="presencial">Presencial</option>
                  <option value="online">Online</option>
                  <option value="mixto">Mixto</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Fecha y hora</label>
                <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Máx. participantes</label>
                <input type="number" min="0" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} placeholder="Ej: 32" className={inputCls} />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2 · Inscripción ────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-2">¿Gratis o de pago?</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaid(false)}
                  className={`flex-1 p-3 font-headline font-bold text-xs uppercase tracking-widest skew-fix transition-colors ${!isPaid ? "bg-primary-container text-white" : "bg-surface-container-lowest text-outline"}`}
                >
                  <span className="block skew-content">Gratis</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaid(true)}
                  className={`flex-1 p-3 font-headline font-bold text-xs uppercase tracking-widest skew-fix transition-colors ${isPaid ? "bg-primary-container text-white" : "bg-surface-container-lowest text-outline"}`}
                >
                  <span className="block skew-content">De pago</span>
                </button>
              </div>
            </div>

            {isPaid && (
              <div className="bg-surface-container-lowest p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>En $1UP</label>
                    <input type="number" min="0" value={entryFeeTokens} onChange={(e) => setEntryFeeTokens(e.target.value)} placeholder="Ej: 10" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>En COP (banco)</label>
                    <input type="number" min="0" value={entryFeeCop} onChange={(e) => setEntryFeeCop(e.target.value)} placeholder="Ej: 10000" className={inputCls} />
                  </div>
                </div>
                {tokenFeeSet && (
                  <div>
                    <label className={labelCls}>Tesorería (wallet) <span className="text-error">*</span></label>
                    <select
                      value={showCustomOption ? CUSTOM_TREASURY : treasuryAddress.trim()}
                      onChange={(e) => { if (e.target.value === CUSTOM_TREASURY) return; setTreasuryAddress(e.target.value); }}
                      disabled={!hasWallets}
                      className={`${inputCls} disabled:opacity-50 ${tokenFeeSet && !treasuryOk ? "ring-2 ring-error" : ""}`}
                    >
                      <option value="">— Sin tesorería —</option>
                      {treasuryWallets.map((w) => (
                        <option key={w.id} value={w.address}>{w.label} — {w.address}</option>
                      ))}
                      {showCustomOption && <option value={CUSTOM_TREASURY}>(personalizada) — {treasuryAddress.trim()}</option>}
                    </select>
                    {!hasWallets && (
                      <p className="font-body text-[10px] text-outline mt-1 leading-snug">
                        No hay wallets activas.{" "}
                        <a href={`${ADMIN_URL}/admin/bank-accounts`} className="text-tertiary underline">Agrega una wallet en Cuentas y Tesorerías</a>.
                      </p>
                    )}
                    {tokenFeeSet && !treasuryOk && (
                      <p className="font-body text-[10px] text-error mt-1 leading-snug">
                        Obligatoria para cobrar en $1UP — selecciona la wallet a la que se enviarán los pagos del torneo.
                      </p>
                    )}
                  </div>
                )}
                <p className="font-body text-[10px] text-outline leading-snug">
                  Los métodos de pago se controlan en Métodos de Pago. Equivalencia de referencia: 1 $1UP = 1.000 COP.
                </p>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input type="checkbox" checked={isRegistrationOpen} onChange={(e) => setIsRegOpen(e.target.checked)} className="w-4 h-4 accent-primary-container" />
              <span className="font-headline font-bold text-xs uppercase tracking-widest text-outline">Abrir inscripciones al crear</span>
            </label>
          </div>
        )}

        {/* ── Step 3 · Premios ────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="font-body text-sm text-outline">Define el podio. Puedes saltar este paso y configurarlo luego en el panel.</p>
            <div className="bg-surface-container-lowest p-4">
              <AdminTorneoPrizesEditor value={prizes} onChange={setPrizes} defaultPassDays={defaultPassDays} />
            </div>
          </div>
        )}

        {/* ── Step 4 · Presentación ───────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="font-body text-sm text-outline">Imagen, descripción y patrocinador. Todo opcional — puedes completarlo luego.</p>
            <div>
              <label className={labelCls}>Imagen</label>
              <ImageUpload
                currentUrl={imageUrl || null}
                folder="tournaments"
                entityId="pending"
                onUploaded={(url) => setImageUrl(url)}
                getAccessToken={getAccessToken}
                aspectRatio="video"
              />
            </div>
            <div>
              <label className={labelCls}>Descripción</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Detalles del torneo..." className="w-full bg-surface-container-lowest text-on-background p-3 font-body text-sm border-none focus:outline-none resize-none" />
            </div>
            <div className="bg-surface-container-lowest p-4 space-y-3">
              <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline">Patrocinador (opcional)</label>
              <input value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} placeholder="Nombre del patrocinador" className={inputCls} />
              <input value={sponsorWebsiteUrl} onChange={(e) => setSponsorWebUrl(e.target.value)} placeholder="https://sitio-del-sponsor.com" className="w-full bg-surface-container text-on-background p-3 font-body text-sm border-none focus:outline-none" />
              <input value={sponsorLogoUrl} onChange={(e) => setSponsorLogoUrl(e.target.value)} placeholder="URL del logo" className="w-full bg-surface-container text-on-background p-3 font-body text-sm border-none focus:outline-none" />
            </div>
          </div>
        )}

        {/* ── Step 5 · Revisar ────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-3">
            <p className="font-body text-sm text-outline">Revisa los datos antes de crear. Podrás editar todo desde el panel del torneo.</p>
            <div className="bg-surface-container-lowest p-4 space-y-2 font-body text-sm">
              <SummaryRow label="Nombre" value={name.trim() || "—"} />
              <SummaryRow label="Juego" value={games.find((g) => String(g.id) === gameId)?.name ?? "Sin juego"} />
              <SummaryRow label="Modalidad" value={LOC_LABELS[locationType]} />
              <SummaryRow label="Fecha" value={date ? new Date(`${date}:00-05:00`).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" }) : "Sin fecha"} />
              <SummaryRow label="Máx. participantes" value={maxParticipants || "Sin límite"} />
              <SummaryRow label="Inscripción" value={
                !isPaid ? "Gratis"
                  : [tokenFeeSet ? `${Number(entryFeeTokens).toLocaleString("es-CO")} $1UP` : null,
                     (entryFeeCop && Number(entryFeeCop) > 0) ? `$${Number(entryFeeCop).toLocaleString("es-CO")} COP` : null]
                    .filter(Boolean).join(" · ") || "De pago (sin monto)"
              } />
              {tokenFeeSet && <SummaryRow label="Tesorería" value={treasuryAddress.trim() || "— sin definir —"} />}
              <SummaryRow label="Inscripciones" value={isRegistrationOpen ? "Abiertas al crear" : "Cerradas"} />
              <SummaryRow label="Premios" value={prizes.length ? `${prizes.length} posición(es)` : "Sin premios"} />
              <SummaryRow label="Imagen" value={imageUrl ? "Cargada" : "Sin imagen"} />
              <SummaryRow label="Patrocinador" value={sponsorName || "Ninguno"} />
            </div>
          </div>
        )}

        {error && <div className="bg-error/10 text-error font-body text-sm p-3 mt-4">{error}</div>}

        {/* ── Footer nav ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 mt-6">
          <div>
            {step > 0 && (
              <button onClick={goBack} disabled={creating} className="font-headline font-bold text-xs uppercase tracking-widest text-outline hover:text-on-surface disabled:opacity-40 px-2 py-3">
                ← Atrás
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step >= 2 && step < 4 && (
              <button onClick={goNext} disabled={creating} className="font-headline font-bold text-xs uppercase tracking-widest text-outline hover:text-on-surface disabled:opacity-40 px-2 py-3">
                Saltar
              </button>
            )}
            {step > 0 && step < 4 && (
              <button
                onClick={handleCreate}
                disabled={creating || !nameOk}
                className="bg-surface-container-high text-on-surface font-headline font-bold text-xs uppercase tracking-widest px-5 py-3 disabled:opacity-40 hover:bg-surface-container-highest transition-colors"
              >
                {creating ? "Creando…" : "Crear ahora"}
              </button>
            )}
            {step < 4 ? (
              <button
                onClick={goNext}
                disabled={creating || (step === 0 && !nameOk)}
                className="bg-primary-container text-white font-headline font-black text-sm px-6 py-3 uppercase tracking-tighter disabled:opacity-40 hover:neo-shadow-pink transition-all"
              >
                Siguiente →
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={creating || !nameOk}
                className="bg-primary-container text-white font-headline font-black text-sm px-6 py-3 uppercase tracking-tighter disabled:opacity-40 hover:neo-shadow-pink transition-all"
              >
                {creating ? "Creando…" : "Crear torneo"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline shrink-0 pt-0.5">{label}</span>
      <span className="text-on-surface text-right break-all">{value}</span>
    </div>
  );
}
