"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import type { Player } from "@/types/database.types";
import { ImageUpload } from "./ImageUpload";

interface Props { players: Player[] }

type FormState = {
  gamertag: string; realName: string; role: string;
  photoUrl: string;
  instagramUrl: string; tiktokUrl: string; kickUrl: string; youtubeUrl: string;
  sortOrder: string; isActive: boolean;
};

const EMPTY: FormState = {
  gamertag: "", realName: "", role: "",
  photoUrl: "",
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
  const [imgUploading, setImgUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  function openEdit(p: Player) {
    setEditing(p);
    setForm({
      gamertag: p.gamertag, realName: p.real_name, role: p.role ?? "",
      photoUrl: p.photo_url ?? "",
      instagramUrl: p.instagram_url ?? "", tiktokUrl: p.tiktok_url ?? "",
      kickUrl: p.kick_url ?? "", youtubeUrl: p.youtube_url ?? "",
      sortOrder: String(p.sort_order ?? 0), isActive: p.is_active ?? true,
    });
    setOpen(true);
  }

  async function handleSave() {
    setLoading(true);
    const method = editing ? "PUT" : "POST";
    const body = { ...form, sortOrder: Number(form.sortOrder), ...(editing ? { id: editing.id } : {}) };
    const res = await fetch("/api/admin/players", { method, headers: await authHeaders(), body: JSON.stringify(body) });
    if (!res.ok) { setSaveError("Error al guardar. Intenta de nuevo."); setLoading(false); return; }
    setSaveError(null);
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
              {p.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photo_url} alt={p.gamertag} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-[3rem] text-surface-container-highest">person</span>
              )}
            </div>
            <div className="font-headline font-black text-on-background italic">{p.gamertag}</div>
            <div className="font-body text-xs text-outline mt-1">{p.real_name}</div>
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

            <div className="mb-4">
              <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-2">Foto del Jugador</p>
              <ImageUpload
                currentUrl={form.photoUrl || null}
                folder="players"
                entityId={editing?.id}
                aspectRatio="square"
                onUploaded={(url) => setForm((f) => ({ ...f, photoUrl: url }))}
                onUploadingChange={setImgUploading}
                getAccessToken={getAccessToken}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {([["gamertag","Gamertag"],["realName","Nombre Real"],["role","Rol"],["instagramUrl","Instagram URL"],["tiktokUrl","TikTok URL"],["kickUrl","Kick URL"],["youtubeUrl","YouTube URL"],["sortOrder","Orden"]] as [keyof FormState, string][]).map(([k,lbl]) => (
                <input key={k} value={form[k] as string} onChange={F(k)} placeholder={lbl} className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold col-span-1" />
              ))}
            </div>
            <label className="flex items-center gap-2 mt-4 font-headline font-bold text-sm text-on-background">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4" />
              Activo en el roster
            </label>
            {saveError && <p className="text-error font-headline font-bold text-xs uppercase mb-3">{saveError}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={loading || imgUploading} className="flex-1 bg-primary-container text-white font-headline font-black py-3 disabled:opacity-60">{imgUploading ? "SUBIENDO..." : loading ? "GUARDANDO..." : "GUARDAR"}</button>
              <button onClick={() => setOpen(false)} className="flex-1 bg-surface-container-highest font-headline font-black py-3">CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
