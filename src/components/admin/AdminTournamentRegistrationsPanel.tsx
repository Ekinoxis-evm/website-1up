"use client";

// Single-tournament registrations panel. Used inside the cockpit
// (`/admin/torneos/[slug]/manage`) to show + mutate registrations for one
// tournament without leaving the page. The global filterable list at
// `/admin/tournament-registrations` stays unchanged — admins still use
// that view for cross-tournament searches.
//
// Receives the pre-filtered registration array from the server so initial
// render is instant. PATCH actions (mark attended / no-show / restore) call
// the existing `/api/admin/tournament-registrations` endpoint; on success
// the parent's `onChange` is invoked so the cockpit can re-fetch its server
// data (counts shown in the header / Participantes card).

import { useState, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import type { TournamentRegistration } from "@/types/database.types";

export type CockpitRegistration = TournamentRegistration & {
  user_profiles: {
    nombre:           string | null;
    apellidos:        string | null;
    username:         string | null;
    numero_documento: string | null;
    avatar_url:       string | null;
  } | null;
};

interface Props {
  registrations:  CockpitRegistration[];
  tournamentName: string;
  onChange?:      () => void;
}

const STATUS_LABELS: Record<string, string> = {
  registered: "Inscrito",
  cancelled:  "Cancelado",
  attended:   "Asistió",
  no_show:    "No asistió",
};
const STATUS_COLORS: Record<string, string> = {
  registered: "text-secondary",
  cancelled:  "text-outline/40",
  attended:   "text-primary",
  no_show:    "text-error",
};

export function AdminTournamentRegistrationsPanel({ registrations, tournamentName, onChange }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError]         = useState<string | null>(null);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  async function updateStatus(id: number, status: string) {
    setLoadingId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/tournament-registrations", {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo actualizar el registro.");
        return;
      }
      router.refresh();
      onChange?.();
    } finally {
      setLoadingId(null);
    }
  }

  const filtered = useMemo(
    () => filterStatus ? registrations.filter(r => r.status === filterStatus) : registrations,
    [registrations, filterStatus],
  );

  const counts = useMemo(() => ({
    total:      registrations.length,
    registered: registrations.filter(r => r.status === "registered").length,
    attended:   registrations.filter(r => r.status === "attended").length,
    cancelled:  registrations.filter(r => r.status === "cancelled").length,
    noShow:     registrations.filter(r => r.status === "no_show").length,
  }), [registrations]);

  function exportCsv() {
    const rows = [
      ["Nombre", "Username", "Documento", "Estado", "Inscrito el"],
      ...filtered.map((r) => [
        `${r.user_profiles?.nombre ?? ""} ${r.user_profiles?.apellidos ?? ""}`.trim(),
        r.user_profiles?.username ?? "",
        r.user_profiles?.numero_documento ?? "",
        STATUS_LABELS[r.status] ?? r.status,
        new Date(r.registered_at).toLocaleDateString("es-CO"),
      ]),
    ];
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `inscripciones-${tournamentName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Stat label="Total"      value={counts.total}      onClick={() => setFilterStatus("")}        active={!filterStatus} />
        <Stat label="Inscritos"  value={counts.registered} onClick={() => setFilterStatus("registered")} active={filterStatus === "registered"} />
        <Stat label="Asistieron" value={counts.attended}   onClick={() => setFilterStatus("attended")} active={filterStatus === "attended"} />
        <Stat label="No asistió" value={counts.noShow}     onClick={() => setFilterStatus("no_show")}  active={filterStatus === "no_show"} />
        <Stat label="Cancelaron" value={counts.cancelled}  onClick={() => setFilterStatus("cancelled")} active={filterStatus === "cancelled"} />
      </div>

      <div className="flex items-center justify-between">
        <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline">
          {filtered.length} registro{filtered.length === 1 ? "" : "s"}
          {filterStatus && ` · ${STATUS_LABELS[filterStatus]}`}
        </p>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 bg-surface-container-high text-on-surface font-headline font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 hover:bg-surface-container-highest transition-colors disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-sm">download</span>
          CSV
        </button>
      </div>

      {error && <p className="font-body text-sm text-error bg-error/10 p-3">{error}</p>}

      {filtered.length === 0 ? (
        <div className="py-12 text-center bg-surface-container">
          <span className="material-symbols-outlined text-4xl text-outline/30">group_off</span>
          <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mt-2">
            {filterStatus ? "Sin registros en este filtro" : "Aún no hay inscripciones"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-high">
                {["Jugador", "Estado", "Inscrito", ""].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-headline font-black text-xs uppercase tracking-widest text-outline">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="even:bg-surface-container-low">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={r.user_profiles?.avatar_url ?? null}
                        name={[r.user_profiles?.nombre, r.user_profiles?.apellidos].filter(Boolean).join(" ") || r.user_profiles?.username || null}
                        size="sm"
                        square
                      />
                      <div className="min-w-0">
                        <p className="font-headline font-bold text-on-surface truncate">
                          {r.user_profiles?.nombre} {r.user_profiles?.apellidos}
                        </p>
                        {r.user_profiles?.username && (
                          <p className="font-body text-[11px] text-outline truncate">@{r.user_profiles.username}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`font-headline font-bold text-[10px] uppercase tracking-widest ${STATUS_COLORS[r.status] ?? "text-outline"}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-body text-xs text-outline whitespace-nowrap">
                    {new Date(r.registered_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                  </td>
                  <td className="px-3 py-2.5">
                    {r.status === "registered" ? (
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => updateStatus(r.id, "attended")}
                          disabled={loadingId === r.id}
                          className="px-2 py-1 bg-secondary/10 text-secondary font-headline font-bold text-[10px] uppercase hover:bg-secondary/20 transition-colors disabled:opacity-40"
                          title="Marcar asistencia"
                        >
                          {loadingId === r.id ? "…" : "ASISTIÓ"}
                        </button>
                        <button
                          onClick={() => updateStatus(r.id, "no_show")}
                          disabled={loadingId === r.id}
                          className="px-2 py-1 bg-error/10 text-error font-headline font-bold text-[10px] uppercase hover:bg-error/20 transition-colors disabled:opacity-40"
                          title="No asistió"
                        >
                          NO
                        </button>
                      </div>
                    ) : (
                      (r.status === "attended" || r.status === "no_show") && (
                        <button
                          onClick={() => updateStatus(r.id, "registered")}
                          disabled={loadingId === r.id}
                          className="px-2 py-1 bg-surface-container-high text-on-surface font-headline font-bold text-[10px] uppercase hover:bg-primary-container/20 transition-colors disabled:opacity-40"
                          title="Revertir a inscrito"
                        >
                          {loadingId === r.id ? "…" : "REVERTIR"}
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({
  label, value, onClick, active,
}: {
  label: string; value: number; onClick: () => void; active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-3 transition-colors ${
        active
          ? "bg-primary-container/20 ring-2 ring-primary-container ring-inset"
          : "bg-surface-container hover:bg-surface-container-high"
      }`}
    >
      <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline">{label}</p>
      <p className={`font-headline font-black text-2xl leading-none mt-1 ${active ? "text-primary-container" : "text-on-surface"}`}>{value}</p>
    </button>
  );
}
