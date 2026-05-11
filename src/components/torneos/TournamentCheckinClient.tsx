"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";

interface Tournament {
  id:     number;
  name:   string;
  status: "upcoming" | "live" | "completed";
  date:   string | null;
}

type Registration = {
  tournament_id: number;
  status:        "registered" | "cancelled" | "attended" | "no_show";
};

type ProfileLike = { username: string | null } | null;

export function TournamentCheckinClient({ tournament }: { tournament: Tournament }) {
  const { ready, authenticated, login, getAccessToken, user } = usePrivy();
  const [loadingReg, setLoadingReg]   = useState(false);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [profile, setProfile]         = useState<ProfileLike>(null);
  const [checkedIn, setCheckedIn]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !authenticated) return;
    let cancelled = false;
    setLoadingReg(true);
    (async () => {
      try {
        const token = await getAccessToken();
        const [regRes, profRes] = await Promise.all([
          fetch("/api/user/tournament-registrations", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
          fetch("/api/user/profile", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
        ]);
        const regs = regRes.ok ? ((await regRes.json()) as Registration[]) : [];
        const found = Array.isArray(regs) ? regs.find((r) => r.tournament_id === tournament.id) : null;
        if (!cancelled) {
          setRegistration(found ?? null);
          if (found?.status === "attended") setCheckedIn(true);
        }
        if (profRes.ok) {
          const prof = await profRes.json();
          if (!cancelled) setProfile({ username: prof?.username ?? null });
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingReg(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ready, authenticated, getAccessToken, tournament.id]);

  async function handleCheckin() {
    setSubmitting(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/user/tournament-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tournamentId: tournament.id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "No se pudo confirmar la asistencia.");
        setSubmitting(false);
        return;
      }
      setCheckedIn(true);
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  const displayName =
    profile?.username
      ? `@${profile.username}`
      : (typeof user?.email === "object" && user?.email && "address" in user.email
          ? (user.email as { address: string }).address
          : "Jugador");

  return (
    <section className="py-16 px-6 bg-background min-h-screen">
      <div className="max-w-md mx-auto">
        <Link
          href={`/torneos/${tournament.id}`}
          className="inline-flex items-center gap-1 font-headline font-bold text-xs uppercase tracking-widest text-outline hover:text-primary-container transition-colors mb-8"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          VOLVER AL TORNEO
        </Link>

        <div className="bg-surface-container p-8">
          <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-2">
            CHECK-IN
          </p>
          <h1 className="font-headline font-black text-2xl uppercase tracking-tighter text-on-surface leading-tight">
            {tournament.name}
          </h1>
          <div className="h-1 w-16 bg-primary-container mt-3 mb-6" />

          {!ready && (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-outline/20 border-t-primary-container rounded-full animate-spin" />
            </div>
          )}

          {ready && !authenticated && (
            <div className="space-y-6">
              <p className="font-body text-sm text-on-surface/80">
                Inicia sesión para confirmar tu asistencia al torneo.
              </p>
              <button
                onClick={() => login()}
                className="w-full bg-primary-container text-white font-headline font-black text-sm py-3 skew-fix hover:neo-shadow-pink transition-all"
              >
                <span className="block skew-content">INICIAR SESIÓN</span>
              </button>
            </div>
          )}

          {ready && authenticated && tournament.status === "upcoming" && (
            <div className="space-y-2">
              <p className="font-headline font-bold text-sm uppercase tracking-tighter text-secondary">
                El torneo aún no ha comenzado
              </p>
              {tournament.date && (
                <p className="font-body text-sm text-on-surface/70">
                  Comienza el{" "}
                  {new Date(tournament.date).toLocaleDateString("es-CO", {
                    weekday: "long",
                    day:     "2-digit",
                    month:   "long",
                    year:    "numeric",
                  })}
                  {" · "}
                  {new Date(tournament.date).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
              <p className="font-body text-xs text-outline/60 pt-2">
                Vuelve a escanear el QR cuando el torneo esté en curso.
              </p>
            </div>
          )}

          {ready && authenticated && tournament.status === "completed" && (
            <p className="font-headline font-bold text-sm uppercase tracking-tighter text-outline">
              Este torneo ya finalizó
            </p>
          )}

          {ready && authenticated && tournament.status === "live" && loadingReg && (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-outline/20 border-t-primary-container rounded-full animate-spin" />
            </div>
          )}

          {ready && authenticated && tournament.status === "live" && !loadingReg && checkedIn && (
            <div className="text-center space-y-4 py-4">
              <span
                className="material-symbols-outlined text-7xl text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <h2 className="font-headline font-black text-2xl uppercase tracking-tighter text-on-surface">
                ¡Asistencia Confirmada!
              </h2>
              <p className="font-body text-sm text-on-surface/70">
                {displayName} ya está registrado como asistente.
              </p>
              <Link
                href={`/torneos/${tournament.id}`}
                className="inline-block font-headline font-bold text-xs uppercase tracking-widest text-primary-container hover:text-primary transition-colors pt-2"
              >
                ← VOLVER AL TORNEO
              </Link>
            </div>
          )}

          {ready && authenticated && tournament.status === "live" && !loadingReg && !checkedIn && registration?.status === "registered" && (
            <div className="space-y-4">
              <p className="font-body text-sm text-on-surface/80">
                Confirma tu asistencia al torneo para que tu participación quede registrada.
              </p>
              <button
                onClick={handleCheckin}
                disabled={submitting}
                className="w-full bg-primary-container text-white font-headline font-black text-base py-4 skew-fix hover:neo-shadow-pink transition-all disabled:opacity-40"
              >
                <span className="block skew-content">
                  {submitting ? "CONFIRMANDO…" : "CONFIRMAR ASISTENCIA"}
                </span>
              </button>
              {error && (
                <p className="font-body text-sm text-error">{error}</p>
              )}
            </div>
          )}

          {ready && authenticated && tournament.status === "live" && !loadingReg && !checkedIn && !registration && (
            <div className="space-y-3">
              <p className="font-headline font-bold text-sm uppercase tracking-tighter text-error">
                No estás inscrito en este torneo
              </p>
              <p className="font-body text-sm text-on-surface/70">
                Solo los jugadores inscritos pueden confirmar asistencia.
              </p>
              <Link
                href={`/torneos/${tournament.id}`}
                className="inline-block font-headline font-bold text-xs uppercase tracking-widest text-primary-container hover:text-primary transition-colors pt-2"
              >
                IR AL TORNEO →
              </Link>
            </div>
          )}

          {ready && authenticated && tournament.status === "live" && !loadingReg && !checkedIn && registration && registration.status !== "registered" && registration.status !== "attended" && (
            <div className="space-y-3">
              <p className="font-headline font-bold text-sm uppercase tracking-tighter text-error">
                No puedes confirmar asistencia
              </p>
              <p className="font-body text-sm text-on-surface/70">
                Tu inscripción está {registration.status === "cancelled" ? "cancelada" : "marcada como no asistida"}.
              </p>
              <Link
                href={`/torneos/${tournament.id}`}
                className="inline-block font-headline font-bold text-xs uppercase tracking-widest text-primary-container hover:text-primary transition-colors pt-2"
              >
                IR AL TORNEO →
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
