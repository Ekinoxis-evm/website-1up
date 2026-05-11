"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { pointsFor, POINTS_BY_POSITION } from "@/lib/tournamentPoints";
import type { TournamentResult } from "@/types/database.types";

type ResultWithRelations = TournamentResult & {
  user_profiles: { nombre: string | null; apellidos: string | null; username: string | null } | null;
  tournaments:   { name: string } | null;
};

type Registration = {
  id: number;
  user_profile_id: number;
  user_profiles: { nombre: string | null; apellidos: string | null; username: string | null } | null;
};

interface Props {
  tournaments: { id: number; name: string; status: string; date: string | null }[];
  results:     ResultWithRelations[];
}

const MEDALS = ["", "🥇", "🥈", "🥉"];
const POSITIONS = [1, 2, 3] as const;

export function AdminTournamentResultsClient({ tournaments, results }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const [registrations, setRegistrations]           = useState<Registration[]>([]);
  const [podium, setPodium]                         = useState<Record<number, string>>({ 1: "", 2: "", 3: "" });
  const [customPoints, setCustomPoints]             = useState<Record<number, string>>({});
  const [loading, setLoading]                       = useState(false);
  const [saveError, setSaveError]                   = useState<string | null>(null);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  useEffect(() => {
    if (!selectedTournament) { setRegistrations([]); return; }
    getAccessToken().then(async (token) => {
      const res = await fetch(`/api/admin/tournament-registrations?tournamentId=${selectedTournament}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRegistrations(data);

      // Pre-fill podium from existing results
      const existing = results.filter((r) => String(r.tournament_id) === selectedTournament);
      const pre: Record<number, string> = { 1: "", 2: "", 3: "" };
      existing.forEach((r) => { pre[r.position] = String(r.user_profile_id); });
      setPodium(pre);
    });
  }, [selectedTournament, getAccessToken, results]);

  async function savePodium() {
    setSaveError(null); setLoading(true);
    for (const pos of POSITIONS) {
      const uid = podium[pos];
      if (!uid) continue;
      const pts = customPoints[pos] ? parseInt(customPoints[pos]) : pointsFor(pos);
      const res = await fetch("/api/admin/tournament-results", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ tournamentId: parseInt(selectedTournament), userProfileId: parseInt(uid), position: pos, points: pts }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSaveError(err.error ?? "Error al guardar."); setLoading(false); return;
      }
    }
    setLoading(false); router.refresh();
  }

  async function deleteResult(id: number) {
    await fetch("/api/admin/tournament-results", {
      method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  const existingResults = results.filter((r) => String(r.tournament_id) === selectedTournament);
  const playerName = (r: Registration) =>
    [r.user_profiles?.nombre, r.user_profiles?.apellidos].filter(Boolean).join(" ") || r.user_profiles?.username || `ID ${r.user_profile_id}`;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
          HALL OF <span className="text-primary-container">FAME</span>
        </h1>
        <div className="h-1 w-16 bg-primary-container mt-2" />
        <p className="font-body text-sm text-outline mt-2">
          Registra los resultados del pódium para torneos completados. 1° = {POINTS_BY_POSITION[1]}pts · 2° = {POINTS_BY_POSITION[2]}pts · 3° = {POINTS_BY_POSITION[3]}pts
        </p>
      </div>

      {/* Tournament selector */}
      <div className="mb-8">
        <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-2">
          Seleccionar torneo
        </label>
        <select
          value={selectedTournament}
          onChange={(e) => { setSelectedTournament(e.target.value); setSaveError(null); }}
          className="bg-surface-container text-on-background font-headline font-bold text-sm px-4 py-3 border-none focus:outline-none w-full max-w-md"
        >
          <option value="">— Elige un torneo completado —</option>
          {tournaments.map((t) => (
            <option key={t.id} value={String(t.id)}>
              {t.name} {t.date ? `(${new Date(t.date).toLocaleDateString("es-CO", { month: "short", year: "numeric" })})` : ""}
            </option>
          ))}
        </select>
      </div>

      {selectedTournament && (
        <div className="grid md:grid-cols-2 gap-12">
          {/* Podium editor */}
          <div>
            <h2 className="font-headline font-black text-xl uppercase tracking-tighter mb-6">
              Asignar pódium
            </h2>
            <div className="space-y-4">
              {POSITIONS.map((pos) => (
                <div key={pos} className="bg-surface-container p-4 space-y-2">
                  <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline flex items-center gap-2">
                    <span>{MEDALS[pos]}</span> {pos}° Lugar — {POINTS_BY_POSITION[pos]} pts base
                  </label>
                  <select
                    value={podium[pos]}
                    onChange={(e) => setPodium((p) => ({ ...p, [pos]: e.target.value }))}
                    className="w-full bg-surface-container-lowest text-on-background font-headline font-bold text-sm p-3 border-none focus:outline-none"
                  >
                    <option value="">— Sin asignar —</option>
                    {registrations.map((r) => (
                      <option key={r.id} value={String(r.user_profile_id)}>{playerName(r)}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <label className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline/60">
                      Puntos personalizados (opcional):
                    </label>
                    <input
                      type="number"
                      value={customPoints[pos] ?? ""}
                      onChange={(e) => setCustomPoints((p) => ({ ...p, [pos]: e.target.value }))}
                      placeholder={String(POINTS_BY_POSITION[pos])}
                      className="w-16 bg-surface-container-lowest text-on-background font-headline font-bold text-xs p-2 border-none focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            {saveError && <p className="font-body text-sm text-error mt-3">{saveError}</p>}

            <button
              onClick={savePodium}
              disabled={loading || !Object.values(podium).some(Boolean)}
              className="mt-6 w-full bg-primary-container text-white font-headline font-black py-3 uppercase tracking-tighter disabled:opacity-40 hover:neo-shadow-pink transition-all"
            >
              {loading ? "GUARDANDO…" : "GUARDAR PÓDIUM"}
            </button>
          </div>

          {/* Current results */}
          <div>
            <h2 className="font-headline font-black text-xl uppercase tracking-tighter mb-6">
              Resultados actuales
            </h2>
            {existingResults.length === 0 ? (
              <p className="font-body text-sm text-outline/50">Sin resultados registrados aún.</p>
            ) : (
              <div className="space-y-3">
                {existingResults.map((r) => (
                  <div key={r.id} className="flex items-center gap-4 bg-surface-container p-4">
                    <span className="text-xl w-8">{MEDALS[r.position]}</span>
                    <div className="flex-1">
                      <p className="font-headline font-bold text-sm text-on-surface">
                        {[r.user_profiles?.nombre, r.user_profiles?.apellidos].filter(Boolean).join(" ") || r.user_profiles?.username}
                      </p>
                      <p className="font-body text-xs text-outline">{r.points} pts</p>
                    </div>
                    <button
                      onClick={() => deleteResult(r.id)}
                      className="p-1.5 text-outline hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* All results table */}
      {!selectedTournament && results.length > 0 && (
        <div className="mt-4">
          <h2 className="font-headline font-black text-xl uppercase tracking-tighter mb-6">Todos los resultados</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container-high">
                  {["Torneo", "Posición", "Jugador", "Puntos", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-headline font-black text-xs uppercase tracking-widest text-outline">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="even:bg-surface-container-low">
                    <td className="px-4 py-3 font-body text-on-surface/70">{r.tournaments?.name ?? "—"}</td>
                    <td className="px-4 py-3 font-headline font-bold text-on-surface">{MEDALS[r.position]} {r.position}°</td>
                    <td className="px-4 py-3 font-headline font-bold text-on-surface">
                      {[r.user_profiles?.nombre, r.user_profiles?.apellidos].filter(Boolean).join(" ") || r.user_profiles?.username}
                    </td>
                    <td className="px-4 py-3 font-headline font-black text-primary-container">{r.points} pts</td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteResult(r.id)} className="p-1 text-outline hover:text-error transition-colors">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
