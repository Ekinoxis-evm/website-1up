"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import type { Master } from "@/types/database.types";
import { ImageUpload } from "./ImageUpload";

interface Props { masters: Master[] }

type FormState = {
  name: string; specialty: string; bio: string;
  photoUrl: string; instagramUrl: string; tiktokUrl: string;
  twitterUrl: string; youtubeUrl: string; linkedinUrl: string;
  topicsRaw: string; sortOrder: string; isActive: boolean;
};

const EMPTY: FormState = {
  name: "", specialty: "", bio: "",
  photoUrl: "", instagramUrl: "", tiktokUrl: "",
  twitterUrl: "", youtubeUrl: "", linkedinUrl: "",
  topicsRaw: "", sortOrder: "0", isActive: true,
};

export function AdminMastersClient({ masters }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Master | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  function openEdit(m: Master) {
    setEditing(m);
    setForm({
      name: m.name, specialty: m.specialty ?? "", bio: m.bio ?? "",
      photoUrl: m.photo_url ?? "", instagramUrl: m.instagram_url ?? "",
      tiktokUrl: m.tiktok_url ?? "", twitterUrl: m.twitter_url ?? "",
      youtubeUrl: m.youtube_url ?? "", linkedinUrl: m.linkedin_url ?? "",
      topicsRaw: (m.topics ?? []).join(", "),
      sortOrder: String(m.sort_order ?? 0), isActive: m.is_active ?? true,
    });
    setOpen(true);
  }

  async function handleSave() {
    setLoading(true);
    const method = editing ? "PUT" : "POST";
    const topics = form.topicsRaw.split(",").map((t) => t.trim()).filter(Boolean);
    const body = { ...form, topics, sortOrder: Number(form.sortOrder), ...(editing ? { id: editing.id } : {}) };
    const res = await fetch("/api/admin/masters", { method, headers: await authHeaders(), body: JSON.stringify(body) });
    if (!res.ok) { setSaveError("Error al guardar. Intenta de nuevo."); setLoading(false); return; }
    setSaveError(null); setOpen(false); setLoading(false); router.refresh();
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este master?")) return;
    await fetch("/api/admin/masters", { method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ id }) });
    router.refresh();
  }

  const F = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
            MASTERS <span className="text-primary-container">CLASE</span>
          </h1>
          <div className="h-1 w-16 bg-primary-container mt-2" />
        </div>
        <button
          onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }}
          className="bg-primary-container text-white font-headline font-black text-sm px-6 py-3 skew-fix hover:neo-shadow-pink transition-all"
        >
          <span className="block skew-content">+ AGREGAR MASTER</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {masters.map((m) => (
          <div key={m.id} className="bg-surface-container p-4 border-l-4 border-primary-container">
            <div className="w-full aspect-square bg-surface-container-high mb-3 flex items-center justify-center overflow-hidden">
              {m.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-[3rem] text-surface-container-highest">school</span>
              )}
            </div>
            <div className="font-headline font-black text-on-background">{m.name}</div>
            {m.specialty && <div className="font-body text-xs text-outline mt-1">{m.specialty}</div>}
            {(m.topics ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {(m.topics ?? []).slice(0, 3).map((t) => (
                  <span key={t} className="bg-secondary-container/20 text-secondary font-headline text-[9px] px-2 py-0.5 uppercase">
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <button onClick={() => openEdit(m)} className="flex-1 text-secondary font-headline font-bold text-xs uppercase hover:text-secondary-container">Editar</button>
              <button onClick={() => handleDelete(m.id)} className="flex-1 text-error font-headline font-bold text-xs uppercase">Eliminar</button>
            </div>
          </div>
        ))}
        {masters.length === 0 && (
          <div className="col-span-full py-20 text-center text-on-surface/30 font-headline uppercase text-sm">
            Sin masters. Agrega el primero.
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 bg-background/80 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-surface-container border-4 border-primary-container p-8 w-full max-w-lg my-8">
            <h2 className="font-headline font-black text-xl mb-6 uppercase">
              {editing ? "EDITAR MASTER" : "NUEVO MASTER"}
            </h2>

            <div className="mb-4">
              <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-2">Foto</p>
              <ImageUpload
                currentUrl={form.photoUrl || null}
                folder="masters"
                aspectRatio="square"
                onUploaded={(url) => setForm((f) => ({ ...f, photoUrl: url }))}
                getAccessToken={getAccessToken}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              {([
                ["name",         "Nombre *"],
                ["specialty",    "Especialidad"],
                ["instagramUrl", "Instagram URL"],
                ["tiktokUrl",    "TikTok URL"],
                ["twitterUrl",   "Twitter / X URL"],
                ["youtubeUrl",   "YouTube URL"],
                ["linkedinUrl",  "LinkedIn URL"],
                ["sortOrder",    "Orden"],
              ] as [keyof FormState, string][]).map(([k, lbl]) => (
                <input
                  key={k}
                  value={form[k] as string}
                  onChange={F(k)}
                  placeholder={lbl}
                  className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold"
                />
              ))}
            </div>

            <textarea
              value={form.bio}
              onChange={F("bio")}
              placeholder="Bio"
              rows={3}
              className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-body mb-3"
            />
            <input
              value={form.topicsRaw}
              onChange={F("topicsRaw")}
              placeholder="Temas (separados por coma)"
              className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-body mb-3"
            />

            <label className="flex items-center gap-2 mb-6 font-headline font-bold text-sm text-on-background">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              Activo
            </label>

            {saveError && <p className="text-error font-headline font-bold text-xs uppercase mb-3">{saveError}</p>}
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={loading} className="flex-1 bg-primary-container text-white font-headline font-black py-3 disabled:opacity-60">
                {loading ? "GUARDANDO..." : "GUARDAR"}
              </button>
              <button onClick={() => setOpen(false)} className="flex-1 bg-surface-container-highest font-headline font-black py-3">
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
