"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import type { Competition, Player } from "@/types/database.types";

interface Props { competitions: Competition[]; players: Player[] }
const EMPTY = { tournamentName: "", country: "", city: "", year: String(new Date().getFullYear()), result: "", playerId: "" };

export function AdminCompetitionsClient({ competitions, players }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Competition | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  function openEdit(c: Competition) {
    setEditing(c);
    setForm({ tournamentName: c.tournament_name, country: c.country, city: c.city ?? "", year: String(c.year), result: c.result, playerId: String(c.player_id ?? "") });
    setOpen(true);
  }

  async function handleSave() {
    setLoading(true);
    const method = editing ? "PUT" : "POST";
    const body = { ...form, year: Number(form.year), playerId: form.playerId ? Number(form.playerId) : null, ...(editing ? { id: editing.id } : {}) };
    await fetch("/api/admin/competitions", { method, headers: await authHeaders(), body: JSON.stringify(body) });
    setOpen(false); setLoading(false); router.refresh();
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar?")) return;
    await fetch("/api/admin/competitions", { method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ id }) });
    router.refresh();
  }

  const playerName = (id: number | null) => players.find((p) => p.id === id)?.gamertag ?? "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">HALL OF <span className="text-primary-container">FAME</span></h1>
          <div className="h-1 w-16 bg-primary-container mt-2" />
        </div>
        <button onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }} className="bg-primary-container text-white font-headline font-black text-sm px-6 py-3 skew-fix">
          <span className="block skew-content">+ AGREGAR</span>
        </button>
      </div>

      <table className="w-full text-sm">
        <thead><tr className="bg-surface-container-highest">
          {["Torneo","País","Año","Resultado","Jugador","Acciones"].map((h) => <th key={h} className="text-left font-headline font-black text-xs uppercase tracking-widest text-outline px-4 py-3">{h}</th>)}
        </tr></thead>
        <tbody>
          {competitions.map((c, i) => (
            <tr key={c.id} className={`${i % 2 === 0 ? "bg-surface-container" : "bg-surface-container-low"}`}>
              <td className="px-4 py-3 font-headline font-bold text-on-background">{c.tournament_name}</td>
              <td className="px-4 py-3 font-body text-on-surface-variant">{c.country}</td>
              <td className="px-4 py-3 font-body text-on-surface-variant">{c.year}</td>
              <td className="px-4 py-3"><span className="bg-primary-container text-white font-headline font-black text-[10px] px-2 py-1 uppercase">{c.result}</span></td>
              <td className="px-4 py-3 font-body text-on-surface-variant">{playerName(c.player_id ?? null)}</td>
              <td className="px-4 py-3 flex gap-2">
                <button onClick={() => openEdit(c)} className="text-secondary font-headline font-bold text-xs uppercase">Editar</button>
                <button onClick={() => handleDelete(c.id)} className="text-error font-headline font-bold text-xs uppercase">Eliminar</button>
              </td>
            </tr>
          ))}
          {competitions.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-outline font-body">Sin competencias aún.</td></tr>}
        </tbody>
      </table>

      {open && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container border-4 border-primary-container p-8 w-full max-w-md">
            <h2 className="font-headline font-black text-xl mb-6 uppercase">{editing ? "EDITAR" : "NUEVA COMPETENCIA"}</h2>
            <div className="space-y-3">
              {([["tournamentName","Nombre del torneo"],["country","País"],["city","Ciudad"],["year","Año"],["result","Resultado"]] as [keyof typeof form, string][]).map(([k,lbl]) => (
                <input key={k} value={form[k]} onChange={(e) => setForm({...form,[k]:e.target.value})} placeholder={lbl} className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold" />
              ))}
              <select value={form.playerId} onChange={(e) => setForm({...form,playerId:e.target.value})} className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold appearance-none">
                <option value="">Jugador (opcional)</option>
                {players.map((p) => <option key={p.id} value={p.id}>{p.gamertag}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={loading} className="flex-1 bg-primary-container text-white font-headline font-black py-3 disabled:opacity-60">{loading?"GUARDANDO...":"GUARDAR"}</button>
              <button onClick={() => setOpen(false)} className="flex-1 bg-surface-container-highest font-headline font-black py-3">CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
