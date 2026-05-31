"use client";

import { useState, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useAdminToast } from "@/components/admin/ui/Toast";

export type AdminPass = {
  id: number;
  state: "issued" | "active" | "expired" | "revoked";
  source: string;
  source_ref: string | null;
  duration_days: number;
  activated_at: string | null;
  expires_at: string | null;
  owner_user_profile_id: number;
  user_profiles: { nombre: string | null; apellidos: string | null; email: string | null } | null;
};

const STATE_PILL: Record<AdminPass["state"], string> = {
  issued:  "bg-secondary-container/40 text-secondary",
  active:  "bg-tertiary/20 text-tertiary",
  expired: "bg-outline/10 text-on-surface/40",
  revoked: "bg-error/20 text-error",
};
const STATE_LABEL: Record<AdminPass["state"], string> = {
  issued: "Sin activar", active: "Activo", expired: "Expirado", revoked: "Revocado",
};
const SOURCE_LABEL: Record<string, string> = {
  purchase: "Compra", admin_grant: "Otorgado", tournament_prize: "Premio torneo",
};
const FILTERS = ["all", "active", "issued", "expired", "revoked"] as const;

function fmtDate(d: string | null): string {
  return d ? new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

export function AdminPassesList({ passes }: { passes: AdminPass[] }) {
  const { getAccessToken } = usePrivy();
  const router = useRouter();
  const { showError, showSuccess } = useAdminToast();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return passes.filter((p) => {
      if (filter !== "all" && p.state !== filter) return false;
      if (!term) return true;
      const name = `${p.user_profiles?.nombre ?? ""} ${p.user_profiles?.apellidos ?? ""} ${p.user_profiles?.email ?? ""}`.toLowerCase();
      return name.includes(term);
    });
  }, [passes, filter, q]);

  async function revoke(passId: number) {
    if (!confirm("¿Revocar este Pase 1UP del usuario? Se anulará y dejará de contar como activo.")) return;
    setBusy(passId);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/admin/passes/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ passId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showError(data.error ?? "No se pudo revocar el pase.");
        return;
      }
      showSuccess("Pase revocado.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-surface-container-low p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-headline font-black text-lg uppercase tracking-tight text-on-surface">
          Pases <span className="text-outline">({rows.length})</span>
        </h2>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por usuario / email"
          className="bg-surface-container text-on-background p-2 font-body text-sm border-none focus:outline-none w-56"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`font-headline font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 transition-colors ${
              filter === f ? "bg-primary-container text-white" : "bg-surface-container text-outline hover:text-on-surface"
            }`}
          >
            {f === "all" ? "Todos" : STATE_LABEL[f as AdminPass["state"]]}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="font-body text-sm text-outline py-4">No hay pases para este filtro.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => {
            const name = [p.user_profiles?.nombre, p.user_profiles?.apellidos].filter(Boolean).join(" ").trim()
              || p.user_profiles?.email || `Perfil #${p.owner_user_profile_id}`;
            return (
              <div key={p.id} className="bg-surface-container p-3 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>card_membership</span>
                <div className="flex-1 min-w-0">
                  <p className="font-headline font-bold text-sm text-on-surface truncate">{name}</p>
                  <p className="font-body text-xs text-on-surface-variant truncate">
                    {SOURCE_LABEL[p.source] ?? p.source}{p.source_ref ? ` · ${p.source_ref}` : ""} · {p.duration_days}d
                    {p.state === "active" && ` · vence ${fmtDate(p.expires_at)}`}
                  </p>
                </div>
                <span className={`font-headline font-black text-[10px] uppercase tracking-widest px-2 py-1 shrink-0 ${STATE_PILL[p.state]}`}>
                  {STATE_LABEL[p.state]}
                </span>
                {p.state !== "revoked" && (
                  <button
                    onClick={() => revoke(p.id)}
                    disabled={busy === p.id}
                    className="font-headline font-bold text-[10px] uppercase tracking-widest text-error/80 hover:text-error disabled:opacity-40 transition-colors shrink-0"
                  >
                    Revocar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
