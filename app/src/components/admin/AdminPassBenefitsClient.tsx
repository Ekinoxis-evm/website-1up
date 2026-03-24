"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import type { PassBenefit } from "@/db/schema";

interface Props { benefits: PassBenefit[] }
const EMPTY = { title: "", description: "", sortOrder: "0" };

export function AdminPassBenefitsClient({ benefits }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PassBenefit | null>(null);
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
    await fetch("/api/admin/pass-benefits", { method, headers: await authHeaders(), body: JSON.stringify(body) });
    setOpen(false); setLoading(false); router.refresh();
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar?")) return;
    await fetch("/api/admin/pass-benefits", { method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ id }) });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">1UP PASS <span className="text-primary-container">BENEFITS</span></h1>
          <div className="h-1 w-16 bg-primary-container mt-2" />
        </div>
        <button onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }} className="bg-primary-container text-white font-headline font-black text-sm px-6 py-3 skew-fix">
          <span className="block skew-content">+ AGREGAR</span>
        </button>
      </div>

      <div className="space-y-3">
        {benefits.map((b) => (
          <div key={b.id} className="bg-surface-container p-5 border-l-4 border-primary-container flex items-start justify-between gap-4">
            <div>
              <div className="font-headline font-bold text-on-background">{b.title}</div>
              {b.description && <div className="font-body text-sm text-on-surface-variant mt-1">{b.description}</div>}
            </div>
            <div className="flex gap-3 shrink-0">
              <button onClick={() => { setEditing(b); setForm({ title: b.title, description: b.description ?? "", sortOrder: String(b.sortOrder ?? 0) }); setOpen(true); }} className="text-secondary font-headline font-bold text-xs uppercase">Editar</button>
              <button onClick={() => handleDelete(b.id)} className="text-error font-headline font-bold text-xs uppercase">Eliminar</button>
            </div>
          </div>
        ))}
        {benefits.length === 0 && <p className="text-outline font-body py-12 text-center">Sin beneficios configurados.</p>}
      </div>

      {open && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container border-4 border-primary-container p-8 w-full max-w-md">
            <h2 className="font-headline font-black text-xl mb-6 uppercase">{editing ? "EDITAR" : "NUEVO BENEFICIO"}</h2>
            <div className="space-y-3">
              <input value={form.title} onChange={(e) => setForm({...form,title:e.target.value})} placeholder="Título del beneficio" className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold" />
              <textarea value={form.description} onChange={(e) => setForm({...form,description:e.target.value})} placeholder="Descripción (opcional)" rows={2} className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold resize-none" />
              <input value={form.sortOrder} onChange={(e) => setForm({...form,sortOrder:e.target.value})} type="number" placeholder="Orden" className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold" />
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
