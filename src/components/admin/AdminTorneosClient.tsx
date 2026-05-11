"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ImageUpload } from "@/components/admin/ImageUpload";
import type { Tournament, Game } from "@/types/database.types";

type TournamentWithGame = Tournament & { games: Pick<Game, "id" | "name"> | null };

interface Props {
  tournaments: TournamentWithGame[];
  games: Pick<Game, "id" | "name">[];
}

type FormState = {
  name: string; gameId: string; date: string; prizePoolCop: string;
  maxParticipants: string; status: "upcoming" | "live" | "completed";
  locationType: "presencial" | "online" | "mixto"; imageUrl: string;
  description: string; isActive: boolean; isRegistrationOpen: boolean; sortOrder: number;
};

const EMPTY: FormState = {
  name: "", gameId: "", date: "", prizePoolCop: "", maxParticipants: "",
  status: "upcoming", locationType: "presencial", imageUrl: "",
  description: "", isActive: true, isRegistrationOpen: false, sortOrder: 0,
};

const STATUS_LABELS = { upcoming: "Próximo", live: "En vivo", completed: "Finalizado" };
const STATUS_COLORS = { upcoming: "text-secondary", live: "text-primary", completed: "text-outline" };
const LOC_LABELS    = { presencial: "Presencial", online: "Online", mixto: "Mixto" };

export function AdminTorneosClient({ tournaments, games }: Props) {
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
      gameId:           t.game_id ? String(t.game_id) : "",
      date:             t.date ? t.date.slice(0, 16) : "",
      prizePoolCop:     t.prize_pool_cop ? String(t.prize_pool_cop) : "",
      maxParticipants:  t.max_participants ? String(t.max_participants) : "",
      status:           t.status,
      locationType:     t.location_type,
      imageUrl:         t.image_url ?? "",
      description:      t.description ?? "",
      isActive:         t.is_active,
      isRegistrationOpen: t.is_registration_open,
      sortOrder:        t.sort_order,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name) { setSaveError("El nombre es requerido."); return; }
    setLoading(true); setSaveError(null);
    const method = editing ? "PUT" : "POST";
    const body   = { ...form, ...(editing ? { id: editing.id } : {}) };
    const res = await fetch("/api/admin/tournaments", {
      method, headers: await authHeaders(), body: JSON.stringify(body),
    });
    if (!res.ok) { setSaveError("Error al guardar. Intenta de nuevo."); setLoading(false); return; }
    setOpen(false); setLoading(false); router.refresh();
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este torneo?")) return;
    await fetch("/api/admin/tournaments", {
      method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  function f(k: keyof FormState, v: FormState[keyof FormState]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
            TOR<span className="text-primary-container">NEOS</span>
          </h1>
          <div className="h-1 w-16 bg-primary-container mt-2" />
          <p className="font-body text-sm text-outline mt-2">
            Gestiona los torneos del ecosistema 1UP.
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }}
          className="bg-primary-container text-white font-headline font-black text-sm px-6 py-3 skew-fix hover:neo-shadow-pink transition-all"
        >
          <span className="block skew-content">+ NUEVO TORNEO</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-container-high">
              {["Torneo", "Juego", "Fecha", "Premio", "Estado", "Ubicación", "Reg.", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-headline font-black text-xs uppercase tracking-widest text-outline">
                  {h}
                </th>
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
                <td className="px-4 py-3 font-body text-on-surface/70">{t.games?.name ?? "—"}</td>
                <td className="px-4 py-3 font-body text-on-surface/70 whitespace-nowrap">
                  {t.date ? new Date(t.date).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                </td>
                <td className="px-4 py-3 font-body text-on-surface/70">
                  {t.prize_pool_cop ? `$${t.prize_pool_cop.toLocaleString("es-CO")}` : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-headline font-bold text-xs uppercase ${STATUS_COLORS[t.status]}`}>
                    {STATUS_LABELS[t.status]}
                  </span>
                </td>
                <td className="px-4 py-3 font-body text-on-surface/70">{LOC_LABELS[t.location_type]}</td>
                <td className="px-4 py-3">
                  <span className={`font-headline font-bold text-xs uppercase ${t.is_registration_open ? "text-secondary" : "text-outline/40"}`}>
                    {t.is_registration_open ? "Abierto" : "Cerrado"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => openEdit(t)} className="p-1.5 bg-surface-container-high hover:bg-primary-container/20 transition-colors" title="Editar">
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="p-1.5 bg-surface-container-high hover:bg-error/20 hover:text-error transition-colors" title="Eliminar">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {tournaments.length === 0 && (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <span className="material-symbols-outlined text-4xl text-outline/30">emoji_events</span>
                  <p className="font-headline text-sm text-outline/50 uppercase mt-2">Sin torneos aún</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="bg-surface-container w-full max-w-2xl p-8 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-outline hover:text-on-surface">
              <span className="material-symbols-outlined">close</span>
            </button>

            <h2 className="font-headline font-black text-2xl uppercase tracking-tighter mb-6">
              {editing ? "EDITAR" : "NUEVO"} <span className="text-primary-container">TORNEO</span>
            </h2>

            <div className="space-y-4">
              {/* Image */}
              <div>
                <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-2">
                  Imagen
                </label>
                <ImageUpload
                  currentUrl={form.imageUrl || null}
                  folder="tournaments"
                  entityId={editing?.id}
                  onUploaded={(url) => f("imageUrl", url)}
                  getAccessToken={getAccessToken}
                  aspectRatio="video"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Nombre *</label>
                <input value={form.name} onChange={(e) => f("name", e.target.value)}
                  placeholder="Ej: Copa 1UP — Valorant S1"
                  className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none" />
              </div>

              {/* Game + Status row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Juego</label>
                  <select value={form.gameId} onChange={(e) => f("gameId", e.target.value)}
                    className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none">
                    <option value="">— Sin juego —</option>
                    {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Estado</label>
                  <select value={form.status} onChange={(e) => f("status", e.target.value as FormState["status"])}
                    className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none">
                    <option value="upcoming">Próximo</option>
                    <option value="live">En vivo</option>
                    <option value="completed">Finalizado</option>
                  </select>
                </div>
              </div>

              {/* Date + Location row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Fecha y hora</label>
                  <input type="datetime-local" value={form.date} onChange={(e) => f("date", e.target.value)}
                    className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none" />
                </div>
                <div>
                  <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Modalidad</label>
                  <select value={form.locationType} onChange={(e) => f("locationType", e.target.value as FormState["locationType"])}
                    className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none">
                    <option value="presencial">Presencial</option>
                    <option value="online">Online</option>
                    <option value="mixto">Mixto</option>
                  </select>
                </div>
              </div>

              {/* Prize + Max participants row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Premio (COP)</label>
                  <input type="number" value={form.prizePoolCop} onChange={(e) => f("prizePoolCop", e.target.value)}
                    placeholder="Ej: 500000"
                    className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none" />
                </div>
                <div>
                  <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Máx. participantes</label>
                  <input type="number" value={form.maxParticipants} onChange={(e) => f("maxParticipants", e.target.value)}
                    placeholder="Ej: 32"
                    className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Descripción</label>
                <textarea value={form.description} onChange={(e) => f("description", e.target.value)}
                  rows={3} placeholder="Detalles del torneo..."
                  className="w-full bg-surface-container-lowest text-on-background p-3 font-body text-sm border-none focus:outline-none resize-none" />
              </div>

              {/* Sort + toggles row */}
              <div className="flex gap-6 items-center">
                <div className="w-24">
                  <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Orden</label>
                  <input type="number" value={form.sortOrder} onChange={(e) => f("sortOrder", parseInt(e.target.value) || 0)}
                    className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer self-end pb-3">
                  <input type="checkbox" checked={form.isRegistrationOpen} onChange={(e) => f("isRegistrationOpen", e.target.checked)} className="w-4 h-4 accent-primary-container" />
                  <span className="font-headline font-bold text-xs uppercase tracking-widest text-outline">Registro abierto</span>
                </label>
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
