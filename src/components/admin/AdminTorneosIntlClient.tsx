"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ImageUpload } from "@/components/admin/ImageUpload";
import type { InternationalTournament, Game } from "@/types/database.types";

type TournamentWithGame = InternationalTournament & { games: Pick<Game, "id" | "name"> | null };

interface Props {
  tournaments: TournamentWithGame[];
  games:       Pick<Game, "id" | "name">[];
}

type FormState = {
  name: string; organizer: string; date: string; country: string; city: string;
  gameId: string; registrationLink: string; imageUrl: string; description: string;
  isActive: boolean; sortOrder: number;
};

const EMPTY: FormState = {
  name: "", organizer: "", date: "", country: "", city: "",
  gameId: "", registrationLink: "", imageUrl: "", description: "",
  isActive: true, sortOrder: 0,
};

export function AdminTorneosIntlClient({ tournaments, games }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [open, setOpen]       = useState(false);
  const [editing, setEditing] = useState<TournamentWithGame | null>(null);
  const [form, setForm]       = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  function openEdit(t: TournamentWithGame) {
    setEditing(t);
    setForm({
      name:             t.name,
      organizer:        t.organizer ?? "",
      date:             t.date ? t.date.slice(0, 16) : "",
      country:          t.country ?? "",
      city:             t.city ?? "",
      gameId:           t.game_id ? String(t.game_id) : "",
      registrationLink: t.registration_link ?? "",
      imageUrl:         t.image_url ?? "",
      description:      t.description ?? "",
      isActive:         t.is_active,
      sortOrder:        t.sort_order,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name) { setSaveError("El nombre es requerido."); return; }
    setLoading(true); setSaveError(null);
    const method = editing ? "PUT" : "POST";
    const body   = { ...form, ...(editing ? { id: editing.id } : {}) };
    const res = await fetch("/api/admin/international-tournaments", {
      method, headers: await authHeaders(), body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setSaveError(err.error ?? "Error al guardar. Intenta de nuevo.");
      setLoading(false); return;
    }
    setOpen(false); setLoading(false); router.refresh();
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este torneo internacional?")) return;
    await fetch("/api/admin/international-tournaments", {
      method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  function f<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
            TORNEOS <span className="text-primary-container">INTERNACIONALES</span>
          </h1>
          <div className="h-1 w-16 bg-primary-container mt-2" />
          <p className="font-body text-sm text-outline mt-2">
            Torneos de alcance internacional y circuitos globales.
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }}
          className="bg-primary-container text-white font-headline font-black text-sm px-6 py-3 skew-fix hover:neo-shadow-pink transition-all"
        >
          <span className="block skew-content">+ NUEVO</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-container-high">
              {["Torneo", "Organizador", "Juego", "País / Ciudad", "Fecha", "Registro", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-headline font-black text-xs uppercase tracking-widest text-outline">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tournaments.map((t) => (
              <tr key={t.id} className={`even:bg-surface-container-low ${!t.is_active ? "opacity-40" : ""}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {t.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.image_url} alt={t.name} className="w-10 h-10 object-cover shrink-0" />
                    )}
                    <span className="font-headline font-bold text-on-surface">{t.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-body text-on-surface/70">{t.organizer ?? "—"}</td>
                <td className="px-4 py-3 font-body text-on-surface/70">{t.games?.name ?? "—"}</td>
                <td className="px-4 py-3 font-body text-on-surface/70">
                  {[t.city, t.country].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-3 font-body text-on-surface/70 whitespace-nowrap">
                  {t.date ? new Date(t.date).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                </td>
                <td className="px-4 py-3">
                  {t.registration_link ? (
                    <a href={t.registration_link} target="_blank" rel="noopener noreferrer"
                      className="font-headline font-bold text-xs text-secondary hover:text-primary uppercase tracking-widest transition-colors">
                      VER →
                    </a>
                  ) : <span className="text-outline/30 text-xs">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => openEdit(t)} className="p-1.5 bg-surface-container-high hover:bg-primary-container/20 transition-colors">
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="p-1.5 bg-surface-container-high hover:bg-error/20 hover:text-error transition-colors">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {tournaments.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <span className="material-symbols-outlined text-4xl text-outline/30">public</span>
                  <p className="font-headline text-sm text-outline/50 uppercase mt-2">Sin torneos internacionales aún</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="bg-surface-container w-full max-w-2xl p-8 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-outline hover:text-on-surface">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="font-headline font-black text-2xl uppercase tracking-tighter mb-6">
              {editing ? "EDITAR" : "NUEVO"} <span className="text-primary-container">TORNEO INTL.</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-2">Imagen</label>
                <ImageUpload
                  currentUrl={form.imageUrl || null}
                  folder="tournaments"
                  entityId={editing?.id}
                  onUploaded={(url) => f("imageUrl", url)}
                  getAccessToken={getAccessToken}
                  aspectRatio="video"
                />
              </div>

              <div>
                <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Nombre *</label>
                <input value={form.name} onChange={(e) => f("name", e.target.value)}
                  placeholder="Ej: IEM Katowice 2026"
                  className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Organizador</label>
                  <input value={form.organizer} onChange={(e) => f("organizer", e.target.value)}
                    placeholder="Ej: ESL Gaming"
                    className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none" />
                </div>
                <div>
                  <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Juego</label>
                  <select value={form.gameId} onChange={(e) => f("gameId", e.target.value)}
                    className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none">
                    <option value="">— Sin juego —</option>
                    {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">País</label>
                  <input value={form.country} onChange={(e) => f("country", e.target.value)}
                    placeholder="Ej: Polonia"
                    className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none" />
                </div>
                <div>
                  <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Ciudad</label>
                  <input value={form.city} onChange={(e) => f("city", e.target.value)}
                    placeholder="Ej: Katowice"
                    className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Fecha y hora</label>
                <input type="datetime-local" value={form.date} onChange={(e) => f("date", e.target.value)}
                  className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none" />
              </div>

              <div>
                <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Link de inscripción</label>
                <input value={form.registrationLink} onChange={(e) => f("registrationLink", e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none" />
              </div>

              <div>
                <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Descripción</label>
                <textarea value={form.description} onChange={(e) => f("description", e.target.value)}
                  rows={3} placeholder="Detalles del torneo..."
                  className="w-full bg-surface-container-lowest text-on-background p-3 font-body text-sm border-none focus:outline-none resize-none" />
              </div>

              <div className="flex gap-6 items-center">
                <div className="w-24">
                  <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Orden</label>
                  <input type="number" value={form.sortOrder} onChange={(e) => f("sortOrder", parseInt(e.target.value) || 0)}
                    className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer self-end pb-3">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => f("isActive", e.target.checked)} className="w-4 h-4 accent-primary-container" />
                  <span className="font-headline font-bold text-xs uppercase tracking-widest text-outline">Activo</span>
                </label>
              </div>

              {saveError && <p className="font-body text-sm text-error">{saveError}</p>}

              <button onClick={handleSave} disabled={loading}
                className="w-full bg-primary-container text-white font-headline font-black py-3 uppercase tracking-tighter disabled:opacity-40 hover:neo-shadow-pink transition-all">
                {loading ? "GUARDANDO…" : "GUARDAR"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
