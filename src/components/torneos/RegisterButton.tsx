"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { CalendarPromptModal } from "./CalendarPromptModal";

interface Props {
  tournamentId:    number;
  tournamentName:  string;
  tournamentDate:  string | null;
  locationType:    string;
  isRegistered:    boolean;
  compact?:        boolean;
}

export function RegisterButton({ tournamentId, tournamentName, tournamentDate, locationType, isRegistered, compact }: Props) {
  const { authenticated, ready, login, getAccessToken } = usePrivy();
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [registered, setRegistered] = useState(isRegistered);
  const [calendarModal, setCalendarModal] = useState<{ googleUrl: string } | null>(null);
  const [pendingRegister, setPendingRegister] = useState(false);

  // Sync if parent (TorneosClient) refreshes registeredIds after auth
  useEffect(() => {
    if (isRegistered) setRegistered(true);
  }, [isRegistered]);

  // When the user is authenticated and idle (no pending registration), check registration
  // status from the API. Needed on the detail page where isRegistered is always false.
  useEffect(() => {
    if (!authenticated || registered || pendingRegister || loading) return;
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
  }, [authenticated]);

  // After Privy login modal closes, auto-complete registration
  useEffect(() => {
    if (!authenticated || !pendingRegister) return;
    setPendingRegister(false);
    (async () => {
      setLoading(true); setError(null);
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/user/tournament-registrations", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tournamentId }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Error al inscribirse."); setLoading(false); return; }
        setRegistered(true);
        setLoading(false);
        if (data.googleCalendarUrl) setCalendarModal({ googleUrl: data.googleCalendarUrl });
      } catch {
        setError("Error de conexión. Intenta de nuevo.");
        setLoading(false);
      }
    })();
  }, [authenticated, pendingRegister, getAccessToken, tournamentId]);

  if (registered) {
    return (
      <span className={`font-headline font-bold uppercase tracking-widest text-secondary flex items-center gap-1 ${compact ? "text-[10px]" : "text-xs"}`}>
        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        INSCRITO
      </span>
    );
  }

  async function handleRegister() {
    if (!authenticated) {
      setPendingRegister(true);
      login();
      return;
    }
    setLoading(true); setError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/user/tournament-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tournamentId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al inscribirse."); setLoading(false); return; }
      setRegistered(true);
      setLoading(false);
      if (data.googleCalendarUrl) setCalendarModal({ googleUrl: data.googleCalendarUrl });
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <button
          onClick={handleRegister}
          disabled={!ready || loading}
          className={`inline-block bg-primary-container text-white font-headline font-black skew-fix hover:neo-shadow-pink transition-all disabled:opacity-40 disabled:cursor-not-allowed ${compact ? "text-xs px-4 py-2" : "text-sm px-6 py-2.5"}`}
        >
          <span className="block skew-content">
            {loading ? "REGISTRANDO…" : "REGISTRARME"}
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
