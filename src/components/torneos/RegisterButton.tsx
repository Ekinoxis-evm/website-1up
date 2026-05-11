"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { CalendarPromptModal } from "./CalendarPromptModal";

interface Props {
  tournamentId:   number;
  tournamentName: string;
  tournamentDate: string | null;
  locationType:   string;
  isRegistered:   boolean;
  compact?:       boolean;
  onRegistered?:  () => void;
}

const APP_URL  = process.env.NEXT_PUBLIC_APP_URL  ?? "https://app.1upesports.org";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://1upesports.org";

export function RegisterButton({ tournamentId, tournamentName, tournamentDate, locationType, isRegistered, compact, onRegistered }: Props) {
  const { authenticated, ready, getAccessToken } = usePrivy();
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [registered, setRegistered] = useState(isRegistered);
  const [calendarModal, setCalendarModal] = useState<{ googleUrl: string } | null>(null);

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

  async function doRegister() {
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
        if (res.status === 404) {
          setError("Completa tu perfil en la app para inscribirte.");
        } else {
          setError(data.error ?? "Error al inscribirse.");
        }
        setLoading(false);
        return;
      }

      setRegistered(true);
      onRegistered?.();
      setLoading(false);
      if (data.googleCalendarUrl) setCalendarModal({ googleUrl: data.googleCalendarUrl });
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
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
            {!ready ? "CARGANDO..." : loading ? "REGISTRANDO…" : "REGISTRARME"}
          </span>
        </button>
        {error && <p className="font-body text-xs text-error">{error}</p>}
      </div>

      {calendarModal && (
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
