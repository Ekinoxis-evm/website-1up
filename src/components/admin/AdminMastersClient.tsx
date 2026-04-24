"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import type { Master } from "@/types/database.types";
import { ImageUpload } from "./ImageUpload";

type CourseRef = { id: number; name: string; category: string; master_id: number | null };
interface Props { masters: Master[]; courses: CourseRef[] }

const MASTER_CATEGORIES = ["Gaming", "Performance", "Technology", "Marketing", "Legal"];

const CATEGORY_COLORS: Record<string, string> = {
  Gaming:      "bg-primary-container/20 text-primary-container",
  Performance: "bg-secondary-container/20 text-secondary",
  Technology:  "bg-tertiary/20 text-tertiary",
  Marketing:   "bg-error/20 text-error",
  Legal:       "bg-outline/20 text-outline",
};

const SOCIAL_FIELDS: { key: string; label: string }[] = [
  { key: "instagramUrl", label: "Instagram URL" },
  { key: "tiktokUrl",    label: "TikTok URL"    },
  { key: "youtubeUrl",   label: "YouTube URL"   },
  { key: "twitterUrl",   label: "X / Twitter URL" },
  { key: "kickUrl",      label: "Kick URL"      },
  { key: "twitchUrl",    label: "Twitch URL"    },
  { key: "githubUrl",    label: "GitHub URL"    },
  { key: "linkedinUrl",  label: "LinkedIn URL"  },
];

type FormState = {
  name: string; specialty: string; bio: string; photoUrl: string;
  instagramUrl: string; tiktokUrl: string; twitterUrl: string;
  youtubeUrl: string; linkedinUrl: string; kickUrl: string;
  twitchUrl: string; githubUrl: string;
  categories: string[]; topicsRaw: string;
  sortOrder: string; isActive: boolean;
};

const EMPTY: FormState = {
  name: "", specialty: "", bio: "", photoUrl: "",
  instagramUrl: "", tiktokUrl: "", twitterUrl: "",
  youtubeUrl: "", linkedinUrl: "", kickUrl: "",
  twitchUrl: "", githubUrl: "",
  categories: [], topicsRaw: "",
  sortOrder: "0", isActive: true,
};

export function AdminMastersClient({ masters, courses }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Master | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  function openEdit(m: Master) {
    setEditing(m);
    setForm({
      name: m.name, specialty: m.specialty ?? "", bio: m.bio ?? "",
      photoUrl: m.photo_url ?? "",
      instagramUrl: m.instagram_url ?? "", tiktokUrl: m.tiktok_url ?? "",
      twitterUrl: m.twitter_url ?? "", youtubeUrl: m.youtube_url ?? "",
      linkedinUrl: m.linkedin_url ?? "", kickUrl: m.kick_url ?? "",
      twitchUrl: m.twitch_url ?? "", githubUrl: m.github_url ?? "",
      categories: m.categories ?? [],
      topicsRaw: (m.topics ?? []).join(", "),
      sortOrder: String(m.sort_order ?? 0), isActive: m.is_active ?? true,
    });
    setOpen(true);
  }

  function toggleCategory(cat: string) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  }

  async function handleSave() {
    setLoading(true);
    setSaveError(null);
    const method = editing ? "PUT" : "POST";
    const topics = form.topicsRaw.split(",").map((t) => t.trim()).filter(Boolean);
    const body = {
      ...form, topics,
      sortOrder: Number(form.sortOrder),
      ...(editing ? { id: editing.id } : {}),
    };
    const res = await fetch("/api/admin/masters", { method, headers: await authHeaders(), body: JSON.stringify(body) });
    if (!res.ok) { setSaveError("Error al guardar. Intenta de nuevo."); setLoading(false); return; }
    setOpen(false); setLoading(false); router.refresh();
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
        {masters.map((m) => {
          const assignedCourses = courses.filter((c) => c.master_id === m.id);
          return (
            <div key={m.id} className="bg-surface-container p-4 border-l-4 border-primary-container">
              <div className="w-full aspect-square bg-surface-container-high mb-3 flex items-center justify-center overflow-hidden">
                {m.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[3rem] text-surface-container-highest">school</span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="font-headline font-black text-on-background truncate">{m.name}</div>
                <span className={`shrink-0 font-headline font-black text-[9px] px-2 py-0.5 uppercase ${m.is_active ? "bg-primary-container/20 text-primary-container" : "bg-error/20 text-error"}`}>
                  {m.is_active ? "Activo" : "Inactivo"}
                </span>
              </div>

              {m.specialty && <div className="font-body text-xs text-outline mb-2">{m.specialty}</div>}

              {/* Categories */}
              {(m.categories ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {(m.categories ?? []).map((cat) => (
                    <span key={cat} className={`font-headline font-black text-[9px] px-2 py-0.5 uppercase ${CATEGORY_COLORS[cat] ?? "bg-surface-container-high text-outline"}`}>
                      {cat}
                    </span>
                  ))}
                </div>
              )}

              {/* Topics */}
              {(m.topics ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {(m.topics ?? []).map((t) => (
                    <span key={t} className="bg-secondary-container/20 text-secondary font-headline text-[9px] px-2 py-0.5 uppercase">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Assigned courses */}
              <div className="mt-2 pt-2 border-t border-surface-container-highest">
                <p className="font-headline font-bold text-[9px] uppercase tracking-widest text-outline mb-1">
                  Cursos ({assignedCourses.length})
                </p>
                {assignedCourses.length === 0 ? (
                  <p className="font-body text-[10px] text-outline/40">Sin cursos asignados</p>
                ) : (
                  assignedCourses.map((c) => (
                    <div key={c.id} className="flex items-center gap-1.5 mt-1">
                      <span className={`font-headline font-black text-[8px] px-1.5 py-0.5 uppercase shrink-0 ${CATEGORY_COLORS[c.category] ?? "bg-surface-container-high text-outline"}`}>{c.category}</span>
                      <span className="font-body text-xs text-on-surface/60 truncate">{c.name}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2 mt-3">
                <button onClick={() => openEdit(m)} className="flex-1 text-secondary font-headline font-bold text-xs uppercase hover:text-secondary-container">Editar</button>
                <button onClick={() => handleDelete(m.id)} className="flex-1 text-error font-headline font-bold text-xs uppercase">Eliminar</button>
              </div>
            </div>
          );
        })}
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

            {/* Photo */}
            <div className="mb-4">
              <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-2">Foto</p>
              <ImageUpload
                currentUrl={form.photoUrl || null}
                folder="masters"
                aspectRatio="square"
                onUploaded={(url) => setForm((f) => ({ ...f, photoUrl: url }))}
                onUploadingChange={setImgUploading}
                getAccessToken={getAccessToken}
              />
            </div>

            {/* Name + Role */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input value={form.name} onChange={F("name")} placeholder="Nombre *" className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold" />
              <input value={form.specialty} onChange={F("specialty")} placeholder="Cargo / Rol (ej: Game Coach)" className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold" />
            </div>

            {/* Categories */}
            <div className="mb-4">
              <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-2">Categorías que enseña</p>
              <div className="flex flex-wrap gap-2">
                {MASTER_CATEGORIES.map((cat) => {
                  const active = form.categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`font-headline font-black text-xs px-3 py-1.5 uppercase transition-all ${active ? (CATEGORY_COLORS[cat] ?? "bg-primary-container text-white") + " border-2 border-current" : "bg-surface-container-lowest text-outline/50 border-2 border-transparent hover:border-outline/30"}`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bio */}
            <textarea value={form.bio} onChange={F("bio")} placeholder="Bio" rows={3} className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-body mb-3" />

            {/* Topics */}
            <input value={form.topicsRaw} onChange={F("topicsRaw")} placeholder="Temas específicos (separados por coma, ej: FPS, Fortnite)" className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-body mb-4" />

            {/* Social links */}
            <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-2">Redes Sociales</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {SOCIAL_FIELDS.map(({ key, label }) => (
                <input
                  key={key}
                  value={form[key as keyof FormState] as string}
                  onChange={F(key as keyof FormState)}
                  placeholder={label}
                  className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold text-sm"
                />
              ))}
            </div>

            {/* Sort + Active */}
            <div className="flex items-center gap-4 mb-4">
              <input value={form.sortOrder} onChange={F("sortOrder")} placeholder="Orden" className="w-24 bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold" />
              <label className="flex items-center gap-2 font-headline font-bold text-sm text-on-background">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4" />
                Activo
              </label>
            </div>

            {/* Assigned courses (read-only) */}
            {editing && (
              <div className="mb-4 p-3 bg-surface-container-lowest">
                <p className="font-headline font-bold text-[9px] uppercase tracking-widest text-outline mb-2">
                  Cursos asignados ({courses.filter((c) => c.master_id === editing.id).length})
                </p>
                {courses.filter((c) => c.master_id === editing.id).length === 0 ? (
                  <p className="font-body text-[10px] text-outline/40">Sin cursos. Asigna desde la sección Cursos.</p>
                ) : (
                  courses.filter((c) => c.master_id === editing.id).map((c) => (
                    <div key={c.id} className="flex items-center gap-2 mt-1">
                      <span className={`font-headline font-black text-[8px] px-1.5 py-0.5 uppercase shrink-0 ${CATEGORY_COLORS[c.category] ?? "bg-surface-container-high text-outline"}`}>{c.category}</span>
                      <span className="font-body text-xs text-on-surface/70">{c.name}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {saveError && <p className="text-error font-headline font-bold text-xs uppercase mb-3">{saveError}</p>}
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={loading || imgUploading} className="flex-1 bg-primary-container text-white font-headline font-black py-3 disabled:opacity-60">
                {imgUploading ? "SUBIENDO..." : loading ? "GUARDANDO..." : "GUARDAR"}
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
