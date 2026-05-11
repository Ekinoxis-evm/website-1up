"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://1upesports.org";

type RegistrationStatus = "registered" | "cancelled" | "attended" | "no_show";

type Registration = {
  tournament_id: number;
  status:         RegistrationStatus;
  registered_at:  string;
  tournaments: {
    id:            number;
    name:          string;
    date:          string | null;
    location_type: "presencial" | "online" | "mixto";
    image_url:     string | null;
    status:        "upcoming" | "live" | "completed";
    games:         { id: number; name: string } | null;
  } | null;
};

const STATUS_BADGE: Record<RegistrationStatus, { label: string; classes: string }> = {
  registered: { label: "INSCRITO",  classes: "bg-secondary text-background"          },
  attended:   { label: "ASISTIÓ",   classes: "bg-secondary-container text-white"     },
  cancelled:  { label: "CANCELADO", classes: "bg-surface-container-high text-outline" },
  no_show:    { label: "NO ASISTIÓ", classes: "bg-error/80 text-white"               },
};

const LOC_ICON: Record<"presencial" | "online" | "mixto", string> = {
  presencial: "location_on",
  online:     "wifi",
  mixto:      "sync_alt",
};

export function MisTorneosTab() {
  const { getAccessToken, authenticated, ready } = usePrivy();
  const [loading, setLoading]   = useState(true);
  const [rows, setRows]         = useState<Registration[]>([]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    (async () => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/user/tournament-registrations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setRows(Array.isArray(data) ? data : []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, authenticated, getAccessToken]);

  return (
    <div className="max-w-3xl space-y-8">
      {/* Headline */}
      <div>
        <h1 className="font-headline font-black text-5xl md:text-6xl text-on-surface leading-none tracking-tighter">
          MIS <span className="text-primary-container">TORNEOS</span>
        </h1>
        <div className="h-1 w-16 bg-primary-container mt-3" />
        <p className="font-body text-sm text-on-surface/60 mt-4">
          Tus inscripciones a torneos del ecosistema 1UP.
        </p>
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-surface-container h-24 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="bg-surface-container p-10 flex flex-col items-center gap-4 text-center">
          <span
            className="material-symbols-outlined text-6xl text-outline/30"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            emoji_events
          </span>
          <p className="font-headline font-black text-xl uppercase tracking-tighter text-on-surface/60">
            Aún no estás inscrito en ningún torneo
          </p>
          <a
            href={`${BASE_URL}/torneos`}
            className="inline-block bg-primary-container text-white font-headline font-black text-sm px-6 py-2.5 skew-fix hover:neo-shadow-pink transition-all mt-2"
          >
            <span className="block skew-content">VER TORNEOS →</span>
          </a>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((r) => {
            const t = r.tournaments;
            if (!t) return null;
            const badge = STATUS_BADGE[r.status];
            return (
              <Link
                key={`${r.tournament_id}-${r.registered_at}`}
                href={`${BASE_URL}/torneos/${t.id}`}
                className="block bg-surface-container hover:bg-surface-container-high transition-colors"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Cover */}
                  <div className="relative md:w-40 aspect-video md:aspect-square bg-surface-container-high overflow-hidden shrink-0">
                    {t.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span
                          className="material-symbols-outlined text-5xl text-outline/20"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          emoji_events
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col gap-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-headline font-black text-[10px] uppercase tracking-widest px-2 py-1 ${badge.classes}`}
                      >
                        {badge.label}
                      </span>
                      {t.games && (
                        <span className="font-headline font-bold text-[10px] uppercase tracking-widest px-2 py-1 bg-surface-container-high text-secondary">
                          {t.games.name}
                        </span>
                      )}
                      <span className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline flex items-center gap-1">
                        <span
                          className="material-symbols-outlined text-xs"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          {LOC_ICON[t.location_type]}
                        </span>
                        {t.location_type}
                      </span>
                    </div>

                    <h3 className="font-headline font-black text-lg uppercase tracking-tighter text-on-surface leading-tight">
                      {t.name}
                    </h3>

                    {t.date && (
                      <p className="font-body text-xs text-on-surface/60 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">calendar_month</span>
                        {new Date(t.date).toLocaleDateString("es-CO", {
                          weekday: "long",
                          day:     "2-digit",
                          month:   "long",
                          year:    "numeric",
                        })}
                      </p>
                    )}

                    <div className="mt-auto pt-1">
                      <span className="font-headline font-bold text-xs uppercase tracking-widest text-primary-container">
                        Ver torneo →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
