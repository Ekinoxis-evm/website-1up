"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { CalendarPromptModal } from "./CalendarPromptModal";
import { TournamentEntryWizard } from "./TournamentEntryWizard";

interface Props {
  tournamentId:   number;
  tournamentName: string;
  tournamentDate: string | null;
  locationType:   string;
  isRegistered:   boolean;
  // v2.41.0 — entry fee (null/absent = free, flow unchanged).
  entryFeeTokens?: number | null;
  entryFeeCop?:    number | null;
  treasuryAddress?: string | null;
  compact?:       boolean;
  onRegistered?:  () => void;
}

const APP_URL  = process.env.NEXT_PUBLIC_APP_URL  ?? "https://app.1upesports.org";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://1upesports.org";

export function RegisterButton({ tournamentId, tournamentName, tournamentDate, locationType, isRegistered, entryFeeTokens, entryFeeCop, treasuryAddress, compact, onRegistered }: Props) {
  const { authenticated, ready, user, getAccessToken } = usePrivy();
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [registered, setRegistered] = useState(isRegistered);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [calendarModal, setCalendarModal] = useState<{ googleUrl: string } | null>(null);
  const [wizardOpen, setWizardOpen]   = useState(false);
  const [pendingOrder, setPendingOrder] = useState(false);

  const feeTokens = entryFeeTokens != null && Number(entryFeeTokens) > 0 ? Number(entryFeeTokens) : null;
  const feeCop    = entryFeeCop    != null && entryFeeCop > 0            ? entryFeeCop : null;
  const hasFee    = feeTokens != null || feeCop != null;

  // Sync prop (parent refreshes after fetching registeredIds)
  useEffect(() => {
    if (isRegistered) setRegistered(true);
  }, [isRegistered]);

  // When authenticated, silently check if already registered
  useEffect(() => {
    if (!ready || !authenticated || registered) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/user/tournament-registrations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const rows: { tournament_id: number }[] = await res.json();
        if (!cancelled && rows.some((r) => r.tournament_id === tournamentId)) {
          setRegistered(true);
        }
      } catch { /* ignore — button stays enabled */ }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, ready]);

  // Paid tournaments: silently check for an in-flight bank order so the
  // button can show the "esperando aprobación" state instead of re-charging.
  useEffect(() => {
    if (!ready || !authenticated || !hasFee || registered || compact) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch(`/api/user/tournament-entry-orders?tournamentId=${tournamentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const rows: { status: string }[] = await res.json();
        if (!cancelled && rows.some((r) => r.status === "pending_bank")) {
          setPendingOrder(true);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, ready, hasFee]);

  async function doRegister() {
    // Paid tournament — the payment step replaces direct registration.
    if (hasFee) {
      setWizardOpen(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/user/tournament-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tournamentId }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.reason === "already_registered") {
          setRegistered(true);
          onRegistered?.();
          setLoading(false);
          return;
        }
        if (res.status === 404 || data.reason === "onboarding_incomplete") {
          setNeedsOnboarding(true);
        } else {
          setError(data.error ?? "Error al inscribirse.");
        }
        setLoading(false);
        return;
      }

      setRegistered(true);
      onRegistered?.();
      setLoading(false);
      setCalendarModal({ googleUrl: data.googleCalendarUrl ?? "" });
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  }

  function feeLabel(): string {
    if (feeTokens != null) return `${feeTokens.toLocaleString("es-CO")} $1UP`;
    return `$${feeCop!.toLocaleString("es-CO")} COP`;
  }

  // Onboarding incomplete — send them to finish it
  if (needsOnboarding) {
    return (
      <div className="flex flex-col gap-1">
        <a
          href={`${APP_URL}/onboarding`}
          className={`inline-block bg-primary-container text-white font-headline font-black skew-fix hover:neo-shadow-pink transition-all ${compact ? "text-xs px-4 py-2" : "text-sm px-6 py-2.5"}`}
        >
          <span className="block skew-content">COMPLETAR REGISTRO</span>
        </a>
        <p className="font-body text-xs text-on-surface-variant">
          Termina tu registro para inscribirte en torneos.
        </p>
      </div>
    );
  }

  // Already registered
  if (registered) {
    return (
      <span className={`font-headline font-bold uppercase tracking-widest text-secondary flex items-center gap-1 ${compact ? "text-[10px]" : "text-xs"}`}>
        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        INSCRITO
      </span>
    );
  }

  // Bank payment submitted — slot pending admin approval
  if (pendingOrder) {
    return (
      <div className="flex flex-col gap-1">
        <span className={`font-headline font-bold uppercase tracking-widest text-secondary flex items-center gap-1 ${compact ? "text-[10px]" : "text-xs"}`}>
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
          PAGO EN REVISIÓN
        </span>
        {!compact && (
          <p className="font-body text-xs text-on-surface-variant">
            Esperando aprobación del comprobante — tu cupo se confirma al aprobarse.
          </p>
        )}
      </div>
    );
  }

  // Not authenticated
  if (!authenticated) {
    // Compact (list cards): link straight to the detail page
    if (compact) {
      return (
        <Link
          href={`/torneos/${tournamentId}`}
          className="inline-block bg-primary-container text-white font-headline font-black skew-fix hover:neo-shadow-pink transition-all text-xs px-4 py-2"
        >
          <span className="block skew-content">REGISTRARME</span>
        </Link>
      );
    }
    // Detail page: send to app login with a redirect back to this tournament
    const loginHref = `${APP_URL}/login?redirect=${encodeURIComponent(`${BASE_URL}/torneos/${tournamentId}`)}`;
    return (
      <a
        href={loginHref}
        className="inline-block bg-primary-container text-white font-headline font-black skew-fix hover:neo-shadow-pink transition-all text-sm px-6 py-2.5"
      >
        <span className="block skew-content">INGRESAR PARA INSCRIBIRSE</span>
      </a>
    );
  }

  // Authenticated + paid + compact: the payment flow lives on the detail page
  if (hasFee && compact) {
    return (
      <Link
        href={`/torneos/${tournamentId}`}
        className="inline-block bg-primary-container text-white font-headline font-black skew-fix hover:neo-shadow-pink transition-all text-xs px-4 py-2"
      >
        <span className="block skew-content">INSCRIBIRME · {feeLabel()}</span>
      </Link>
    );
  }

  // Authenticated
  return (
    <>
      <div className="flex flex-col gap-1">
        <button
          onClick={doRegister}
          disabled={!ready || loading}
          className={`inline-block bg-primary-container text-white font-headline font-black skew-fix hover:neo-shadow-pink transition-all disabled:opacity-40 disabled:cursor-not-allowed ${compact ? "text-xs px-4 py-2" : "text-sm px-6 py-2.5"}`}
        >
          <span className="block skew-content">
            {!ready ? "CARGANDO..." : loading ? "REGISTRANDO…" : hasFee ? `INSCRIBIRME · ${feeLabel()}` : "REGISTRARME"}
          </span>
        </button>
        {hasFee && (
          <p className="font-body text-xs text-on-surface-variant">
            Torneo con inscripción paga — tu cupo se asigna al confirmarse el pago.
          </p>
        )}
        {error && <p className="font-body text-xs text-error">{error}</p>}
      </div>

      {wizardOpen && (
        <TournamentEntryWizard
          tournamentId={tournamentId}
          tournamentName={tournamentName}
          entryFeeTokens={feeTokens}
          entryFeeCop={feeCop}
          treasuryAddress={treasuryAddress ?? null}
          walletAddress={user?.wallet?.address ?? null}
          getAccessToken={getAccessToken}
          onClose={() => setWizardOpen(false)}
          onRegistered={(googleUrl) => {
            setRegistered(true);
            onRegistered?.();
            if (googleUrl) setCalendarModal({ googleUrl });
          }}
          onPending={() => setPendingOrder(true)}
        />
      )}

      {calendarModal && !wizardOpen && (
        <CalendarPromptModal
          tournamentName={tournamentName}
          tournamentDate={tournamentDate}
          locationType={locationType}
          googleUrl={calendarModal.googleUrl}
          onClose={() => setCalendarModal(null)}
        />
      )}
    </>
  );
}
