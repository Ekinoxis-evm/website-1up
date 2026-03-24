"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import type { FloorInfo } from "@/db/schema";

interface Props { floors: FloorInfo[] }
const EMPTY = { floorLabel: "", title: "", description: "", accentColor: "primary-container", sortOrder: "0" };
const ACCENT_OPTIONS = ["primary-container","secondary-container","primary","tertiary","white"];

export function AdminFloorsClient({ floors }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FloorInfo | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  async function handleSave() {
    setLoading(true);
    const method = editing ? "PUT" : "POST";
    const body = { ...form, sortOrder: Number(form.sortOrder), ...(editing ? { id: editing.id } : {}) };
    await fetch("/api/admin/floors", { method, headers: await authHeaders(), body: JSON.stringify(body) });
    setOpen(false); setLoading(false); router.refresh();
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar?")) return;
    await fetch("/api/admin/floors", { method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ id }) });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">LOS 6 <span className="text-secondary-container">PISOS</span></h1>
          <div className="h-1 w-16 bg-secondary-container mt-2" />
        </div>
        <button onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }} className="bg-secondary-container text-white font-headline font-black text-sm px-6 py-3 skew-fix">
          <span className="block skew-content">+ AGREGAR PISO</span>
        </button>
      </div>

      <div className="space-y-3">
        {floors.map((f) => (
          <div key={f.id} className="bg-surface-container flex items-start gap-0 group">
            <div className="bg-secondary-container min-w-[72px] flex items-center justify-center py-6 font-headline font-black text-2xl text-white skew-fix">
              <span className="block skew-content">{f.floorLabel}</span>
            </div>
            <div className="flex-1 p-5 flex items-start justify-between gap-4">
              <div>
                <div className="font-headline font-bold text-on-background">{f.title}</div>
                <div className="font-body text-sm text-on-surface-variant mt-1">{f.description}</div>
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={() => { setEditing(f); setForm({ floorLabel: f.floorLabel, title: f.title, description: f.description, accentColor: f.accentColor ?? "primary-container", sortOrder: String(f.sortOrder ?? 0) }); setOpen(true); }} className="text-secondary font-headline font-bold text-xs uppercase">Editar</button>
                <button onClick={() => handleDelete(f.id)} className="text-error font-headline font-bold text-xs uppercase">Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container border-4 border-secondary-container p-8 w-full max-w-md">
            <h2 className="font-headline font-black text-xl mb-6 uppercase">{editing ? "EDITAR PISO" : "NUEVO PISO"}</h2>
            <div className="space-y-3">
              <input value={form.floorLabel} onChange={(e) => setForm({...form,floorLabel:e.target.value})} placeholder='Piso (ej. "01", "02-03")' className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold" />
              <input value={form.title} onChange={(e) => setForm({...form,title:e.target.value})} placeholder="Título" className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold" />
              <textarea value={form.description} onChange={(e) => setForm({...form,description:e.target.value})} placeholder="Descripción" rows={2} className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold resize-none" />
              <select value={form.accentColor} onChange={(e) => setForm({...form,accentColor:e.target.value})} className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold appearance-none">
                {ACCENT_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <input value={form.sortOrder} onChange={(e) => setForm({...form,sortOrder:e.target.value})} type="number" placeholder="Orden" className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={loading} className="flex-1 bg-secondary-container text-white font-headline font-black py-3 disabled:opacity-60">{loading?"GUARDANDO...":"GUARDAR"}</button>
              <button onClick={() => setOpen(false)} className="flex-1 bg-surface-container-highest font-headline font-black py-3">CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
