"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import QRCode from "react-qr-code";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { AdminTorneoPrizesEditor, type PrizeFormRow } from "@/components/admin/AdminTorneoPrizesEditor";
import type { Tournament, TournamentPrize, Game } from "@/types/database.types";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://1upesports.org";

type TournamentWithGame = Tournament & {
  games:             Pick<Game, "id" | "name"> | null;
  tournament_prizes: TournamentPrize[];
};

interface Props {
  tournaments: TournamentWithGame[];
  games:       Pick<Game, "id" | "name">[];
}

type FormState = {
  name: string; gameId: string; date: string;
  maxParticipants: string; status: "upcoming" | "live" | "completed";
  locationType: "presencial" | "online" | "mixto"; imageUrl: string;
  description: string; isActive: boolean; isRegistrationOpen: boolean;
  sortOrder: number; prizes: PrizeFormRow[];
};

const EMPTY: FormState = {
  name: "", gameId: "", date: "", maxParticipants: "",
  status: "upcoming", locationType: "presencial", imageUrl: "",
  description: "", isActive: true, isRegistrationOpen: false, sortOrder: 0, prizes: [],
};

const STATUS_LABELS = { upcoming: "Próximo", live: "En vivo", completed: "Finalizado" };
const STATUS_COLORS = { upcoming: "text-secondary", live: "text-primary", completed: "text-outline" };
const LOC_LABELS    = { presencial: "Presencial", online: "Online", mixto: "Mixto" };

// Colombia is always UTC-5 (no DST). Formats a stored UTC ISO string for datetime-local input.
function toColombiaInput(utcIso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Bogota",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(utcIso)).replace(" ", "T");
}

function prizeToFormRow(p: TournamentPrize): PrizeFormRow {
  return {
    position:     p.position as 1 | 2 | 3,
    prizeType:    p.prize_type,
    amountTokens: p.amount_tokens ? String(p.amount_tokens) : "",
    amountCop:    p.amount_cop    ? String(p.amount_cop)    : "",
  };
}

function firstPrizeSummary(prizes: TournamentPrize[]): string {
  const first = prizes.find((p) => p.position === 1);
  if (!first) return "—";
  if (first.prize_type === "tokens" && first.amount_tokens)
    return `${Number(first.amount_tokens).toLocaleString("es-CO")} $1UP`;
  if (first.prize_type === "cop" && first.amount_cop)
    return `$${first.amount_cop.toLocaleString("es-CO")}`;
  if (first.prize_type === "both") {
    const parts: string[] = [];
    if (first.amount_tokens) parts.push(`${Number(first.amount_tokens).toLocaleString("es-CO")} $1UP`);
    if (first.amount_cop)    parts.push(`$${first.amount_cop.toLocaleString("es-CO")}`);
    return parts.join(" + ");
  }
  return "—";
}

export function AdminTorneosClient({ tournaments, games }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [open, setOpen]       = useState(false);
  const [editing, setEditing] = useState<TournamentWithGame | null>(null);
  const [form, setForm]       = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [qrTournament, setQrTournament] = useState<{ id: number; name: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ tournament: TournamentWithGame; registrationCount: number | null } | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<{ tournament: TournamentWithGame; registrationCount: number | null } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  function openEdit(t: TournamentWithGame) {
    setEditing(t);
    setForm({
      name:               t.name,
      gameId:             t.game_id ? String(t.game_id) : "",
      date:               t.date ? toColombiaInput(t.date) : "",
      maxParticipants:    t.max_participants ? String(t.max_participants) : "",
      status:             t.status,
      locationType:       t.location_type,
      imageUrl:           t.image_url ?? "",
      description:        t.description ?? "",
      isActive:           t.is_active,
      isRegistrationOpen: t.is_registration_open,
      sortOrder:          t.sort_order,
      prizes:             [...(t.tournament_prizes ?? [])].sort((a, b) => a.position - b.position).map(prizeToFormRow),
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name) { setSaveError("El nombre es requerido."); return; }
    setLoading(true); setSaveError(null);
    const method = editing ? "PUT" : "POST";
    const body   = {
      ...form,
      // datetime-local gives "YYYY-MM-DDTHH:mm" — append Colombia offset so PostgreSQL stores correct UTC
      date: form.date ? `${form.date}:00-05:00` : null,
      ...(editing ? { id: editing.id } : {}),
    };
    const res = await fetch("/api/admin/tournaments", {
      method, headers: await authHeaders(), body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setSaveError(err.error ?? "Error al guardar. Intenta de nuevo.");
      setLoading(false); return;
    }
    setOpen(false); setLoading(false); router.refresh();
  }

  async function fetchRegistrationCount(tournamentId: number): Promise<number | null> {
    const token = await getAccessToken();
    const res = await fetch(`/api/admin/tournament-registrations?tournamentId=${tournamentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data: { status: string }[] = await res.json();
    return data.filter((r) => r.status === "registered").length;
  }

  async function openDeleteConfirm(t: TournamentWithGame) {
    setDeleteConfirm({ tournament: t, registrationCount: null });
    const count = await fetchRegistrationCount(t.id);
    setDeleteConfirm((prev) => prev && prev.tournament.id === t.id ? { ...prev, registrationCount: count } : prev);
  }

  async function openCancelConfirm(t: TournamentWithGame) {
    setCancelConfirm({ tournament: t, registrationCount: null });
    const count = await fetchRegistrationCount(t.id);
    setCancelConfirm((prev) => prev && prev.tournament.id === t.id ? { ...prev, registrationCount: count } : prev);
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setActionLoading(true);
    await fetch("/api/admin/tournaments", {
      method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ id: deleteConfirm.tournament.id }),
    });
    setActionLoading(false);
    setDeleteConfirm(null);
    router.refresh();
  }

  async function confirmCancel() {
    if (!cancelConfirm) return;
    setActionLoading(true);
    const t = cancelConfirm.tournament;
    await fetch("/api/admin/tournaments", {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify({
        id:                 t.id,
        name:               t.name,
        gameId:             t.game_id,
        date:               t.date,
        maxParticipants:    t.max_participants,
        status:             "completed",
        locationType:       t.location_type,
        imageUrl:           t.image_url,
        description:        t.description,
        isActive:           t.is_active,
        isRegistrationOpen: false,
        sortOrder:          t.sort_order,
        cancelTournament:   true,
      }),
    });
    setActionLoading(false);
    setCancelConfirm(null);
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
              {["Torneo", "Juego", "Fecha", "1° Premio", "Estado", "Ubicación", "Reg.", ""].map((h) => (
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
                  {t.date ? new Date(t.date).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Bogota" }) : "—"}
                </td>
                <td className="px-4 py-3 font-body text-on-surface/70">
                  {firstPrizeSummary(t.tournament_prizes ?? [])}
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
                    {t.status !== "completed" && (
                      <button
                        onClick={() => setQrTournament({ id: t.id, name: t.name })}
                        className="p-1.5 bg-surface-container-high hover:bg-secondary-container/20 transition-colors"
                        title="QR Check-in"
                      >
                        <span className="material-symbols-outlined text-sm">qr_code</span>
                      </button>
                    )}
                    {t.status !== "completed" && (
                      <button
                        onClick={() => openCancelConfirm(t)}
                        className="p-1.5 bg-surface-container-high hover:bg-secondary/20 hover:text-secondary transition-colors"
                        title="Cancelar torneo"
                      >
                        <span className="material-symbols-outlined text-sm">block</span>
                      </button>
                    )}
                    <button onClick={() => openDeleteConfirm(t)} className="p-1.5 bg-surface-container-high hover:bg-error/20 hover:text-error transition-colors" title="Eliminar">
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

              {/* Max participants */}
              <div className="w-1/2 pr-2">
                <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Máx. participantes</label>
                <input type="number" value={form.maxParticipants} onChange={(e) => f("maxParticipants", e.target.value)}
                  placeholder="Ej: 32"
                  className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none" />
              </div>

              {/* Prizes editor */}
              <AdminTorneoPrizesEditor
                value={form.prizes}
                onChange={(prizes) => f("prizes", prizes)}
              />

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

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
          onClick={() => !actionLoading && setDeleteConfirm(null)}
        >
          <div
            className="bg-surface-container w-full max-w-md p-8 relative border-4 border-error"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-headline font-black text-xl uppercase tracking-tighter mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-error">warning</span>
              ELIMINAR TORNEO
            </h2>
            <p className="font-headline font-bold text-sm text-on-surface truncate mb-4">
              {deleteConfirm.tournament.name}
            </p>

            <div className="bg-error/10 border border-error/30 p-4 mb-6">
              <p className="font-body text-sm text-on-surface">
                {deleteConfirm.registrationCount === null ? (
                  <span className="text-outline">Verificando inscripciones...</span>
                ) : deleteConfirm.registrationCount === 0 ? (
                  "Este torneo no tiene inscripciones activas."
                ) : (
                  <>
                    Este torneo tiene{" "}
                    <span className="font-headline font-black text-error">
                      {deleteConfirm.registrationCount} inscripcion{deleteConfirm.registrationCount === 1 ? "" : "es"}
                    </span>{" "}
                    que también serán eliminadas permanentemente.
                  </>
                )}
              </p>
              <p className="font-body text-xs text-outline mt-2">
                Esta acción no se puede deshacer. Considera <span className="text-secondary">CANCELAR TORNEO</span> si quieres preservar el historial.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={actionLoading}
                className="flex-1 bg-surface-container-highest text-on-surface font-headline font-black py-3 uppercase tracking-tighter disabled:opacity-40"
              >
                CANCELAR
              </button>
              <button
                onClick={confirmDelete}
                disabled={actionLoading || deleteConfirm.registrationCount === null}
                className="flex-1 bg-error text-white font-headline font-black py-3 uppercase tracking-tighter disabled:opacity-40"
              >
                {actionLoading ? "ELIMINANDO..." : "ELIMINAR"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel tournament confirmation */}
      {cancelConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
          onClick={() => !actionLoading && setCancelConfirm(null)}
        >
          <div
            className="bg-surface-container w-full max-w-md p-8 relative border-4 border-secondary"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-headline font-black text-xl uppercase tracking-tighter mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">block</span>
              CANCELAR TORNEO
            </h2>
            <p className="font-headline font-bold text-sm text-on-surface truncate mb-4">
              {cancelConfirm.tournament.name}
            </p>

            <div className="bg-secondary/10 border border-secondary/30 p-4 mb-6">
              <p className="font-body text-sm text-on-surface">
                {cancelConfirm.registrationCount === null ? (
                  <span className="text-outline">Verificando inscripciones...</span>
                ) : cancelConfirm.registrationCount === 0 ? (
                  "El torneo se marcará como finalizado y el registro quedará cerrado."
                ) : (
                  <>
                    Se cancelarán{" "}
                    <span className="font-headline font-black text-secondary">
                      {cancelConfirm.registrationCount} inscripcion{cancelConfirm.registrationCount === 1 ? "" : "es"}
                    </span>{" "}
                    activas. El torneo y su historial se conservan.
                  </>
                )}
              </p>
              <p className="font-body text-xs text-outline mt-2">
                Los datos no se eliminan. Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCancelConfirm(null)}
                disabled={actionLoading}
                className="flex-1 bg-surface-container-highest text-on-surface font-headline font-black py-3 uppercase tracking-tighter disabled:opacity-40"
              >
                VOLVER
              </button>
              <button
                onClick={confirmCancel}
                disabled={actionLoading || cancelConfirm.registrationCount === null}
                className="flex-1 bg-secondary text-background font-headline font-black py-3 uppercase tracking-tighter disabled:opacity-40"
              >
                {actionLoading ? "CANCELANDO..." : "CONFIRMAR CANCELACIÓN"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Check-in modal */}
      {qrTournament && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
          onClick={() => setQrTournament(null)}
        >
          <div
            className="bg-surface-container w-full max-w-sm p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setQrTournament(null)}
              className="absolute top-4 right-4 text-outline hover:text-on-surface"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h2 className="font-headline font-black text-xl uppercase tracking-tighter mb-1">
              QR CHECK-IN
            </h2>
            <p className="font-body text-xs text-outline mb-6 truncate">{qrTournament.name}</p>

            <div className="flex justify-center mb-6 bg-white p-4">
              <QRCode
                value={`${BASE_URL}/torneos/${qrTournament.id}/checkin`}
                size={200}
                bgColor="#ffffff"
                fgColor="#0a0a0a"
              />
            </div>

            <p className="font-body text-xs text-outline/60 text-center mb-4 break-all">
              {BASE_URL}/torneos/{qrTournament.id}/checkin
            </p>

            <p className="font-body text-xs text-outline/50 text-center">
              Muestra este QR a los participantes al inicio del torneo para que confirmen su asistencia.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
