"use client";

// Inline editable form for a single tournament — embedded as the cockpit's
// Info tab. Replaces the previous "edit-in-popup" pattern.
//
// Status is owned by the bracket lifecycle (see /api/admin/tournaments PUT
// + the brackets API). The editor only saves metadata, prizes, sponsor,
// dates, and registration. `currentStatus` is shown read-only so the admin
// knows where the tournament is in its lifecycle.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { AdminTorneoPrizesEditor, type PrizeFormRow } from "@/components/admin/AdminTorneoPrizesEditor";
import type { Tournament, TournamentPrize, Game } from "@/types/database.types";

type TournamentRich = Tournament & {
  games:             Pick<Game, "id" | "name"> | null;
  tournament_prizes: TournamentPrize[];
};

interface Props {
  tournament:      TournamentRich;
  games:           Pick<Game, "id" | "name">[];
  defaultPassDays: number;
  onSaved?:        () => void;
}

// Colombia is always UTC-5 (no DST). Formats a stored UTC ISO string for datetime-local input.
function toColombiaInput(utcIso: string | null): string {
  if (!utcIso) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Bogota",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(utcIso)).replace(" ", "T");
}

function prizeToFormRow(p: TournamentPrize, fallbackPassDays: number): PrizeFormRow {
  return {
    position:     p.position as 1 | 2 | 3,
    prizeType:    p.prize_type as PrizeFormRow["prizeType"],
    amountTokens: p.amount_tokens ? String(p.amount_tokens) : "",
    amountCop:    p.amount_cop    ? String(p.amount_cop)    : "",
    includesPass: !!p.includes_pass,
    passDays:     p.pass_days != null ? String(p.pass_days) : (p.includes_pass ? String(fallbackPassDays) : ""),
  };
}

const STATUS_LABELS = { upcoming: "Próximo", live: "En vivo", completed: "Finalizado" } as const;
const STATUS_COLORS = { upcoming: "text-secondary", live: "text-primary-container", completed: "text-outline" } as const;

export function AdminTournamentInfoEditor({ tournament, games, defaultPassDays, onSaved }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();

  const [name, setName]                       = useState(tournament.name);
  const [gameId, setGameId]                   = useState(tournament.game_id ? String(tournament.game_id) : "");
  const [date, setDate]                       = useState(toColombiaInput(tournament.date));
  const [maxParticipants, setMaxParticipants] = useState(tournament.max_participants ? String(tournament.max_participants) : "");
  const [locationType, setLocationType]       = useState<"presencial" | "online" | "mixto">(tournament.location_type as "presencial" | "online" | "mixto");
  const [imageUrl, setImageUrl]               = useState(tournament.image_url ?? "");
  const [description, setDescription]         = useState(tournament.description ?? "");
  const [isActive, setIsActive]               = useState(tournament.is_active);
  const [isRegistrationOpen, setIsRegOpen]    = useState(tournament.is_registration_open);
  const [sortOrder, setSortOrder]             = useState(tournament.sort_order);
  const [prizes, setPrizes]                   = useState<PrizeFormRow[]>(
    [...(tournament.tournament_prizes ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((p) => prizeToFormRow(p, defaultPassDays)),
  );
  const [sponsorName, setSponsorName]           = useState(tournament.sponsor_name ?? "");
  const [sponsorWebsiteUrl, setSponsorWebUrl]   = useState(tournament.sponsor_website_url ?? "");
  const [sponsorLogoUrl, setSponsorLogoUrl]     = useState(tournament.sponsor_logo_url ?? "");

  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Registration toggle is only allowed while the tournament is `upcoming`.
  // After the bracket starts, the API force-closes registration regardless of
  // what we send — mirror that in the UI so it doesn't look enabled.
  const regToggleDisabled = tournament.status !== "upcoming";

  async function handleSave() {
    if (!name.trim()) { setError("El nombre es requerido."); return; }
    setSaving(true); setError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/admin/tournaments", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id:                 tournament.id,
          name,
          gameId:             gameId || null,
          // datetime-local gives "YYYY-MM-DDTHH:mm" — append Colombia offset.
          date:               date ? `${date}:00-05:00` : null,
          maxParticipants:    maxParticipants || null,
          locationType,
          imageUrl,
          description,
          isActive,
          isRegistrationOpen,
          sortOrder,
          sponsorName,
          sponsorWebsiteUrl,
          sponsorLogoUrl,
          prizes,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al guardar. Intenta de nuevo.");
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ── Left: identity + media ─────────────────────────────────── */}
      <div className="bg-surface-container p-5 space-y-4">
        <h3 className="font-headline font-black text-sm uppercase tracking-widest text-on-surface mb-1">
          Información del torneo
        </h3>

        <div>
          <label className="block font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-2">Imagen</label>
          <ImageUpload
            currentUrl={imageUrl || null}
            folder="tournaments"
            entityId={tournament.id}
            onUploaded={(url) => setImageUrl(url)}
            getAccessToken={getAccessToken}
            aspectRatio="video"
          />
        </div>

        <div>
          <label className="block font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-1">Nombre *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Copa 1UP — Valorant S1"
            className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-1">Juego</label>
            <select
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none"
            >
              <option value="">— Sin juego —</option>
              {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-1">Estado</label>
            <div className="w-full bg-surface-container-lowest p-3 flex items-center justify-between">
              <span className={`font-headline font-bold text-xs uppercase tracking-widest ${STATUS_COLORS[tournament.status as keyof typeof STATUS_COLORS]}`}>
                {STATUS_LABELS[tournament.status as keyof typeof STATUS_LABELS]}
              </span>
              <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-outline/60">Automático</span>
            </div>
            <p className="font-body text-[10px] text-outline mt-1 leading-snug">
              Lo controla el bracket: iniciar → En vivo · último ganador → Finalizado.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-1">Fecha y hora</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-1">Modalidad</label>
            <select
              value={locationType}
              onChange={(e) => setLocationType(e.target.value as "presencial" | "online" | "mixto")}
              className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none"
            >
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
              <option value="mixto">Mixto</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-1">Máx. participantes</label>
            <input
              type="number"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              placeholder="Ej: 32"
              className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-1">Orden</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-1">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Detalles del torneo..."
            className="w-full bg-surface-container-lowest text-on-background p-3 font-body text-sm border-none focus:outline-none resize-none"
          />
        </div>

        <div className="flex gap-4 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRegistrationOpen}
              disabled={regToggleDisabled}
              onChange={(e) => setIsRegOpen(e.target.checked)}
              className="w-4 h-4 accent-primary-container disabled:opacity-40"
            />
            <span className={`font-headline font-bold text-xs uppercase tracking-widest ${regToggleDisabled ? "text-outline/40" : "text-outline"}`}>
              Registro abierto
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-primary-container"
            />
            <span className="font-headline font-bold text-xs uppercase tracking-widest text-outline">Visible al público</span>
          </label>
        </div>
        {regToggleDisabled && (
          <p className="font-body text-[10px] text-outline">
            El registro solo puede abrirse mientras el torneo está en estado <strong className="text-on-surface">Próximo</strong>.
          </p>
        )}
      </div>

      {/* ── Right: prizes + sponsor ────────────────────────────────── */}
      <div className="space-y-4">
        <div className="bg-surface-container p-5">
          <AdminTorneoPrizesEditor value={prizes} onChange={setPrizes} defaultPassDays={defaultPassDays} />
        </div>

        <div className="bg-surface-container p-5 space-y-3">
          <h3 className="font-headline font-black text-sm uppercase tracking-widest text-on-surface mb-1">
            Patrocinador <span className="font-headline font-bold text-xs text-outline/60 normal-case">(opcional)</span>
          </h3>
          <input
            value={sponsorName}
            onChange={(e) => setSponsorName(e.target.value)}
            placeholder="Nombre del patrocinador"
            className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none"
          />
          <input
            value={sponsorWebsiteUrl}
            onChange={(e) => setSponsorWebUrl(e.target.value)}
            placeholder="https://sitio-del-sponsor.com"
            className="w-full bg-surface-container-lowest text-on-background p-3 font-body text-sm border-none focus:outline-none"
          />
          <input
            value={sponsorLogoUrl}
            onChange={(e) => setSponsorLogoUrl(e.target.value)}
            placeholder="URL del logo"
            className="w-full bg-surface-container-lowest text-on-background p-3 font-body text-sm border-none focus:outline-none"
          />
        </div>

        {/* Slug — informational only */}
        <div className="bg-surface-container/50 px-4 py-3 flex items-center justify-between">
          <span className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline">URL pública</span>
          <code className="font-mono text-xs text-on-surface/70 truncate">/torneos/{tournament.slug}</code>
        </div>

        {error && (
          <div className="bg-error/10 text-error font-body text-sm p-3">{error}</div>
        )}
        {savedAt && !error && (
          <div className="bg-tertiary/10 text-tertiary font-headline font-bold text-xs uppercase tracking-widest p-3">
            ✓ Guardado
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary-container text-white font-headline font-black py-3 uppercase tracking-tighter disabled:opacity-40 hover:neo-shadow-pink transition-all"
        >
          {saving ? "GUARDANDO…" : "GUARDAR CAMBIOS"}
        </button>
      </div>
    </div>
  );
}
