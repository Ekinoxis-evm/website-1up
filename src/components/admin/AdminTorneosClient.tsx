"use client";

// Tournament directory page — slim list view.
//
// Per-tournament management (edit info, cancel, delete, manage bracket,
// register podium winners, send prizes on-chain) all live inside the
// cockpit at /admin/torneos/{slug}/manage.
//
// This page is just the directory + a name-only quick-create that
// redirects into the cockpit so admins fill in everything inline.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import QRCode from "react-qr-code";
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

const STATUS_LABELS = { upcoming: "Próximo", live: "En vivo", completed: "Finalizado" };
const STATUS_COLORS = { upcoming: "text-secondary", live: "text-primary", completed: "text-outline" };
const LOC_LABELS    = { presencial: "Presencial", online: "Online", mixto: "Mixto" };

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

  const [qrTournament, setQrTournament] = useState<{ id: number; slug: string | null; name: string } | null>(null);
  const [createOpen, setCreateOpen]     = useState(false);
  const [newName, setNewName]           = useState("");
  const [newGameId, setNewGameId]       = useState("");
  const [creating, setCreating]         = useState(false);
  const [createError, setCreateError]   = useState<string | null>(null);

  // Name-only quick-create — POST a stub tournament then jump straight to
  // the cockpit where the admin fills in the rest inline. Mirrors the
  // /admin/courses/new pattern documented in CLAUDE.md.
  async function handleCreate() {
    if (!newName.trim()) { setCreateError("El nombre es requerido."); return; }
    setCreating(true); setCreateError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/admin/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name:   newName.trim(),
          gameId: newGameId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setCreateError(err.error ?? "No se pudo crear el torneo.");
        return;
      }
      const data: { slug: string | null; id: number } = await res.json();
      if (data.slug) {
        router.push(`/admin/torneos/${data.slug}/manage`);
      } else {
        // Defensive fallback — slug is normally always set by the API.
        router.refresh();
        setCreateOpen(false);
      }
    } finally {
      setCreating(false);
    }
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
            Gestiona los torneos del ecosistema 1UP. Edita, cancela y entrega premios desde el panel de cada torneo.
          </p>
        </div>
        <button
          onClick={() => { setNewName(""); setNewGameId(""); setCreateError(null); setCreateOpen(true); }}
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
                  <span className={`font-headline font-bold text-xs uppercase ${STATUS_COLORS[t.status as keyof typeof STATUS_COLORS]}`}>
                    {STATUS_LABELS[t.status as keyof typeof STATUS_LABELS]}
                  </span>
                </td>
                <td className="px-4 py-3 font-body text-on-surface/70">{LOC_LABELS[t.location_type as keyof typeof LOC_LABELS]}</td>
                <td className="px-4 py-3">
                  <span className={`font-headline font-bold text-xs uppercase ${t.is_registration_open ? "text-secondary" : "text-outline/40"}`}>
                    {t.is_registration_open ? "Abierto" : "Cerrado"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    {t.slug && (
                      <Link
                        href={`/admin/torneos/${t.slug}/manage`}
                        className="p-1.5 bg-primary-container/10 hover:bg-primary-container/30 text-primary-container transition-colors"
                        title="Gestionar (info, inscripciones, bracket, premios)"
                      >
                        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
                      </Link>
                    )}
                    {t.status !== "completed" && (
                      <button
                        onClick={() => setQrTournament({ id: t.id, slug: t.slug ?? null, name: t.name })}
                        className="p-1.5 bg-surface-container-high hover:bg-secondary-container/20 transition-colors"
                        title="QR Check-in"
                      >
                        <span className="material-symbols-outlined text-sm">qr_code</span>
                      </button>
                    )}
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

      {/* Quick-create modal */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
          onClick={() => !creating && setCreateOpen(false)}
        >
          <div
            className="bg-surface-container w-full max-w-md p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setCreateOpen(false)}
              disabled={creating}
              className="absolute top-4 right-4 text-outline hover:text-on-surface disabled:opacity-40"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h2 className="font-headline font-black text-2xl uppercase tracking-tighter mb-2">
              NUEVO <span className="text-primary-container">TORNEO</span>
            </h2>
            <p className="font-body text-sm text-outline mb-6">
              Empieza con un nombre. Al guardar te llevamos al panel del torneo donde editas todo lo demás.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-1">Nombre *</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: Copa 1UP — Valorant S1"
                  autoFocus
                  className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-1">Juego (opcional)</label>
                <select
                  value={newGameId}
                  onChange={(e) => setNewGameId(e.target.value)}
                  className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none"
                >
                  <option value="">— Asignar después —</option>
                  {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>

              {createError && <p className="font-body text-sm text-error">{createError}</p>}

              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="w-full bg-primary-container text-white font-headline font-black py-3 uppercase tracking-tighter disabled:opacity-40 hover:neo-shadow-pink transition-all"
              >
                {creating ? "CREANDO…" : "CREAR Y EDITAR"}
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
                value={`${BASE_URL}/torneos/${qrTournament.slug ?? qrTournament.id}/checkin`}
                size={200}
                bgColor="#ffffff"
                fgColor="#0a0a0a"
              />
            </div>

            <p className="font-body text-xs text-outline/60 text-center mb-4 break-all">
              {BASE_URL}/torneos/{qrTournament.slug ?? qrTournament.id}/checkin
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
