"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import type { Player } from "@/db/schema";

interface Props { players: Player[] }

type FormState = {
  gamertag: string; realName: string; role: string;
  instagramUrl: string; tiktokUrl: string; kickUrl: string; youtubeUrl: string;
  sortOrder: string; isActive: boolean;
};

const EMPTY: FormState = {
  gamertag: "", realName: "", role: "",
  instagramUrl: "", tiktokUrl: "", kickUrl: "", youtubeUrl: "",
  sortOrder: "0", isActive: true,
};

export function AdminPlayersClient({ players }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [open, setOpen]     = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [form, setForm]     = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  function openEdit(p: Player) {
    setEditing(p);
    setForm({ gamertag: p.gamertag, realName: p.realName, role: p.role ?? "", instagramUrl: p.instagramUrl ?? "", tiktokUrl: p.tiktokUrl ?? "", kickUrl: p.kickUrl ?? "", youtubeUrl: p.youtubeUrl ?? "", sortOrder: String(p.sortOrder ?? 0), isActive: p.isActive ?? true });
    setOpen(true);
  }

  async function handleSave() {
    setLoading(true);
    const method = editing ? "PUT" : "POST";
    const body = { ...form, sortOrder: Number(form.sortOrder), ...(editing ? { id: editing.id } : {}) };
    await fetch("/api/admin/players", { method, headers: await authHeaders(), body: JSON.stringify(body) });
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este jugador?")) return;
    await fetch("/api/admin/players", { method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ id }) });
    router.refresh();
  }

  const F = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">JUGADORES <span className="text-primary-container">ROSTER</span></h1>
          <div className="h-1 w-16 bg-primary-container mt-2" />
        </div>
        <button onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }} className="bg-primary-container text-white font-headline font-black text-sm px-6 py-3 skew-fix hover:neo-shadow-pink transition-all">
          <span className="block skew-content">+ AGREGAR JUGADOR</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {players.map((p) => (
          <div key={p.id} className="bg-surface-container p-4 border-l-4 border-primary-container">
            <div className="w-full aspect-square bg-surface-container-high mb-3 flex items-center justify-center overflow-hidden">
              {p.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photoUrl} alt={p.gamertag} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-[3rem] text-surface-container-highest">person</span>
              )}
            </div>
            <div className="font-headline font-black text-on-background italic">{p.gamertag}</div>
            <div className="font-body text-xs text-outline mt-1">{p.realName}</div>
            {p.role && <span className="bg-primary-container text-white font-headline font-black text-[10px] px-2 py-0.5 uppercase mt-2 inline-block">{p.role}</span>}
            <div className="flex gap-2 mt-3">
              <button onClick={() => openEdit(p)} className="flex-1 text-secondary font-headline font-bold text-xs uppercase hover:text-secondary-container">Editar</button>
              <button onClick={() => handleDelete(p.id)} className="flex-1 text-error font-headline font-bold text-xs uppercase">Eliminar</button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-surface-container border-4 border-primary-container p-8 w-full max-w-lg my-8">
            <h2 className="font-headline font-black text-xl mb-6 uppercase">{editing ? "EDITAR JUGADOR" : "NUEVO JUGADOR"}</h2>
            <div className="grid grid-cols-2 gap-4">
              {([["gamertag","Gamertag"],["realName","Nombre Real"],["role","Rol"],["instagramUrl","Instagram URL"],["tiktokUrl","TikTok URL"],["kickUrl","Kick URL"],["youtubeUrl","YouTube URL"],["sortOrder","Orden"]] as [keyof FormState, string][]).map(([k,lbl]) => (
                <input key={k} value={form[k] as string} onChange={F(k)} placeholder={lbl} className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold col-span-1" />
              ))}
            </div>
            <label className="flex items-center gap-2 mt-4 font-headline font-bold text-sm text-on-background">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4" />
              Activo en el roster
            </label>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={loading} className="flex-1 bg-primary-container text-white font-headline font-black py-3 disabled:opacity-60">{loading ? "GUARDANDO..." : "GUARDAR"}</button>
              <button onClick={() => setOpen(false)} className="flex-1 bg-surface-container-highest font-headline font-black py-3">CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
