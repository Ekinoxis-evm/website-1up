"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import type { TournamentRegistration } from "@/types/database.types";

type RegWithRelations = TournamentRegistration & {
  user_profiles: { nombre: string | null; apellidos: string | null; username: string | null; numero_documento: string | null } | null;
  tournaments:   { name: string; date: string | null } | null;
};

interface Props {
  registrations: RegWithRelations[];
  tournaments:   { id: number; name: string }[];
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

export function AdminTournamentRegistrationsClient({ registrations, tournaments }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [filterTournament, setFilterTournament] = useState<string>("");
  const [filterStatus, setFilterStatus]         = useState<string>("");
  const [loading, setLoading] = useState<number | null>(null);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  async function updateStatus(id: number, status: string) {
    setLoading(id);
    await fetch("/api/admin/tournament-registrations", {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify({ id, status }),
    });
    setLoading(null);
    router.refresh();
  }

  const filtered = useMemo(() => {
    return registrations.filter((r) => {
      if (filterTournament && String(r.tournament_id) !== filterTournament) return false;
      if (filterStatus     && r.status !== filterStatus) return false;
      return true;
    });
  }, [registrations, filterTournament, filterStatus]);

  const counts = useMemo(() => ({
    total:      registrations.length,
    registered: registrations.filter((r) => r.status === "registered").length,
    attended:   registrations.filter((r) => r.status === "attended").length,
    cancelled:  registrations.filter((r) => r.status === "cancelled").length,
  }), [registrations]);

  function exportCsv() {
    const rows = [
      ["Torneo", "Nombre", "Username", "Documento", "Estado", "Inscrito"],
      ...filtered.map((r) => [
        r.tournaments?.name ?? "",
        `${r.user_profiles?.nombre ?? ""} ${r.user_profiles?.apellidos ?? ""}`.trim(),
        r.user_profiles?.username ?? "",
        r.user_profiles?.numero_documento ?? "",
        r.status,
        new Date(r.registered_at).toLocaleDateString("es-CO"),
      ]),
    ];
    const csv  = rows.map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "inscripciones-torneos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
            INSCRIPCIONES <span className="text-primary-container">TORNEOS</span>
          </h1>
          <div className="h-1 w-16 bg-primary-container mt-2" />
          <p className="font-body text-sm text-outline mt-2">
            {counts.total} total · {counts.registered} activas · {counts.attended} asistieron · {counts.cancelled} canceladas
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="bg-surface-container-high text-on-surface font-headline font-bold text-xs px-4 py-2 hover:bg-surface-container-highest transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">download</span>
          EXPORTAR CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterTournament}
          onChange={(e) => setFilterTournament(e.target.value)}
          className="bg-surface-container text-on-background font-headline font-bold text-xs px-3 py-2 border-none focus:outline-none"
        >
          <option value="">Todos los torneos</option>
          {tournaments.map((t) => (
            <option key={t.id} value={String(t.id)}>{t.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-surface-container text-on-background font-headline font-bold text-xs px-3 py-2 border-none focus:outline-none"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-container-high">
              {["Jugador", "Torneo", "Fecha torneo", "Estado", "Inscrito el", "Acciones"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-headline font-black text-xs uppercase tracking-widest text-outline">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="even:bg-surface-container-low">
                <td className="px-4 py-3">
                  <p className="font-headline font-bold text-on-surface">
                    {r.user_profiles?.nombre} {r.user_profiles?.apellidos}
                  </p>
                  {r.user_profiles?.username && (
                    <p className="font-body text-xs text-outline">@{r.user_profiles.username}</p>
                  )}
                </td>
                <td className="px-4 py-3 font-body text-on-surface/70">{r.tournaments?.name ?? "—"}</td>
                <td className="px-4 py-3 font-body text-on-surface/70 whitespace-nowrap">
                  {r.tournaments?.date
                    ? new Date(r.tournaments.date).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-headline font-bold text-xs uppercase ${STATUS_COLORS[r.status] ?? "text-outline"}`}>
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-body text-on-surface/70 whitespace-nowrap">
                  {new Date(r.registered_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                </td>
                <td className="px-4 py-3">
                  {r.status === "registered" && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => updateStatus(r.id, "attended")}
                        disabled={loading === r.id}
                        className="px-2 py-1 bg-secondary/10 text-secondary font-headline font-bold text-[10px] uppercase hover:bg-secondary/20 transition-colors disabled:opacity-40"
                        title="Marcar asistencia"
                      >
                        {loading === r.id ? "…" : "ASISTIÓ"}
                      </button>
                      <button
                        onClick={() => updateStatus(r.id, "no_show")}
                        disabled={loading === r.id}
                        className="px-2 py-1 bg-error/10 text-error font-headline font-bold text-[10px] uppercase hover:bg-error/20 transition-colors disabled:opacity-40"
                      >
                        NO
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <p className="font-headline text-sm text-outline/50 uppercase">Sin inscripciones</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
