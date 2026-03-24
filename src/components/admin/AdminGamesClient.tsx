"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import type { Game, GameCategory } from "@/db/schema";

interface Props { games: Game[]; categories: GameCategory[] }

export function AdminGamesClient({ games, categories }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [open, setOpen]   = useState(false);
  const [editing, setEditing] = useState<Game | null>(null);
  const [form, setForm]   = useState({ name: "", categoryId: "", sortOrder: "0" });
  const [loading, setLoading] = useState(false);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  function openCreate() { setEditing(null); setForm({ name: "", categoryId: "", sortOrder: "0" }); setOpen(true); }
  function openEdit(g: Game) { setEditing(g); setForm({ name: g.name, categoryId: String(g.categoryId), sortOrder: String(g.sortOrder ?? 0) }); setOpen(true); }

  async function handleSave() {
    setLoading(true);
    const method = editing ? "PUT" : "POST";
    const body = { ...form, categoryId: Number(form.categoryId), sortOrder: Number(form.sortOrder), ...(editing ? { id: editing.id } : {}) };
    await fetch("/api/admin/games", { method, headers: await authHeaders(), body: JSON.stringify(body) });
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este juego?")) return;
    await fetch("/api/admin/games", { method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ id }) });
    router.refresh();
  }

  const catName = (id: number) => categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter text-on-background">
            JUEGOS <span className="text-primary-container">& CATEGORÍAS</span>
          </h1>
          <div className="h-1 w-16 bg-primary-container mt-2" />
        </div>
        <button onClick={openCreate} className="bg-primary-container text-white font-headline font-black text-sm px-6 py-3 skew-fix hover:neo-shadow-pink transition-all">
          <span className="block skew-content">+ AGREGAR JUEGO</span>
        </button>
      </div>

      <table className="w-full text-sm">
        <thead><tr className="bg-surface-container-highest">
          {["Juego", "Categoría", "Orden", "Acciones"].map((h) => (
            <th key={h} className="text-left font-headline font-black text-xs uppercase tracking-widest text-outline px-4 py-3">{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {games.map((g, i) => (
            <tr key={g.id} className={`${i % 2 === 0 ? "bg-surface-container" : "bg-surface-container-low"}`}>
              <td className="px-4 py-3 font-headline font-bold text-on-background">{g.name}</td>
              <td className="px-4 py-3 font-body text-on-surface-variant">{catName(g.categoryId)}</td>
              <td className="px-4 py-3 font-body text-outline">{g.sortOrder}</td>
              <td className="px-4 py-3 flex gap-2">
                <button onClick={() => openEdit(g)} className="text-secondary hover:text-secondary-container font-headline font-bold text-xs uppercase">Editar</button>
                <button onClick={() => handleDelete(g.id)} className="text-error hover:text-primary-container font-headline font-bold text-xs uppercase">Eliminar</button>
              </td>
            </tr>
          ))}
          {games.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-outline font-body">Sin juegos aún.</td></tr>}
        </tbody>
      </table>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container border-4 border-primary-container p-8 w-full max-w-md">
            <h2 className="font-headline font-black text-xl mb-6 uppercase">{editing ? "EDITAR JUEGO" : "NUEVO JUEGO"}</h2>
            <div className="space-y-4">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre del juego" className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold" />
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold appearance-none">
                <option value="">Selecciona categoría</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} type="number" placeholder="Orden" className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={loading} className="flex-1 bg-primary-container text-white font-headline font-black py-3 hover:neo-shadow-pink transition-all disabled:opacity-60">
                {loading ? "GUARDANDO..." : "GUARDAR"}
              </button>
              <button onClick={() => setOpen(false)} className="flex-1 bg-surface-container-highest text-on-background font-headline font-black py-3 hover:bg-surface-container-high transition-colors">
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
