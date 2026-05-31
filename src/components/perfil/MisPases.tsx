"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";

type Pass = {
  id: number;
  source: string;
  source_ref: string | null;
  duration_days: number;
  state: "issued" | "active" | "expired" | "revoked";
  activated_at: string | null;
  expires_at: string | null;
  issued_at: string;
};

const SOURCE_LABELS: Record<string, string> = {
  purchase:         "Compra",
  admin_grant:      "Otorgado",
  tournament_prize: "Premio de torneo",
};

const STATE_PILL: Record<Pass["state"], string> = {
  issued:  "bg-secondary-container/40 text-secondary",
  active:  "bg-tertiary/20 text-tertiary",
  expired: "bg-outline/10 text-on-surface/40",
  revoked: "bg-error/20 text-error",
};

const STATE_LABEL: Record<Pass["state"], string> = {
  issued:  "Sin activar",
  active:  "Activo",
  expired: "Expirado",
  revoked: "Revocado",
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
}

function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function MisPases() {
  const { getAccessToken } = usePrivy();
  const [passes, setPasses]   = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId]   = useState<number | null>(null);
  const [error, setError]     = useState<string | null>(null);

  const fetchPasses = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) { setPasses([]); setLoading(false); return; }
    const res = await fetch("/api/user/passes", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setPasses(await res.json());
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchPasses(); }, [fetchPasses]);

  async function activate(passId: number) {
    setBusyId(passId); setError(null);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch("/api/user/passes/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ passId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo activar el pase.");
        return;
      }
      await fetchPasses();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <span className="material-symbols-outlined text-primary text-2xl animate-spin">refresh</span>
      </div>
    );
  }

  if (passes.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline">Mis Pases</p>

      {error && (
        <p className="font-headline font-bold text-xs uppercase text-error">{error}</p>
      )}

      <div className="space-y-2">
        {passes.map((p) => {
          const left = daysLeft(p.expires_at);
          return (
            <div key={p.id} className="bg-surface-container p-4 flex items-center gap-4">
              <span className="material-symbols-outlined text-primary-container text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                card_membership
              </span>

              <div className="flex-1 min-w-0">
                <p className="font-headline font-black text-sm uppercase text-on-surface leading-tight">
                  Pase 1UP · {p.duration_days} días
                </p>
                <p className="font-body text-xs text-on-surface-variant truncate">
                  {SOURCE_LABELS[p.source] ?? p.source}
                  {p.source_ref ? ` · ${p.source_ref}` : ""}
                </p>
                {p.state === "active" && (
                  <p className="font-body text-xs text-tertiary mt-0.5">
                    Vence {fmtDate(p.expires_at)}{left !== null ? ` · ${left} día${left === 1 ? "" : "s"} restantes` : ""}
                  </p>
                )}
              </div>

              {p.state === "issued" ? (
                <button
                  onClick={() => activate(p.id)}
                  disabled={busyId === p.id}
                  className="bg-primary-container text-white font-headline font-black text-[11px] uppercase tracking-widest px-4 py-2 hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
                >
                  {busyId === p.id ? "..." : "Activar"}
                </button>
              ) : (
                <span className={`font-headline font-black text-[10px] uppercase tracking-widest px-2.5 py-1 shrink-0 ${STATE_PILL[p.state]}`}>
                  {STATE_LABEL[p.state]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
