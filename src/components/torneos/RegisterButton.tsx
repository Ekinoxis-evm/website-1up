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

  // After Privy login modal closes and user is authenticated, auto-complete registration
  useEffect(() => {
    if (!authenticated || !pendingRegister) return;
    setPendingRegister(false);
    (async () => {
      setLoading(true); setError(null);
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
