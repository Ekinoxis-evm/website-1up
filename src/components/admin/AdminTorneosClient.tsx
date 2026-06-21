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
import QRCode from "react-qr-code";
import { TournamentCreateWizard } from "@/components/admin/TournamentCreateWizard";
import type { Tournament, TournamentPrize, Game } from "@/types/database.types";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://1upesports.org";

type TournamentWithGame = Tournament & {
  games:             Pick<Game, "id" | "name"> | null;
  tournament_prizes: TournamentPrize[];
};

type TreasuryWalletOption = { id: number; label: string; address: string };

interface Props {
  tournaments:     TournamentWithGame[];
  games:           Pick<Game, "id" | "name">[];
  treasuryWallets: TreasuryWalletOption[];
  defaultPassDays: number;
}

const STATUS_LABELS = { upcoming: "Próximo", live: "En curso", completed: "Finalizado" };
// Status pill — 0px radius chip, background-tone difference only (no borders).
const STATUS_PILL = {
  upcoming:  "bg-secondary-container/30 text-secondary",
  live:      "bg-tertiary/20 text-tertiary",
  completed: "bg-surface-container-high text-outline",
};
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

export function AdminTorneosClient({ tournaments, games, treasuryWallets, defaultPassDays }: Props) {
  const [qrTournament, setQrTournament] = useState<{ id: number; slug: string | null; name: string } | null>(null);
  const [createOpen, setCreateOpen]     = useState(false);

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
          onClick={() => setCreateOpen(true)}
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
              {["Torneo", "Juego", "1° Premio", "Ubicación", "Reg.", ""].map((h) => (
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
                      <img src={t.image_url} alt={t.name} className="w-12 h-12 object-cover shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span className="block font-headline font-black text-base text-on-surface tracking-tight leading-tight truncate">
                        {t.name}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-block px-2 py-0.5 font-headline font-bold text-[9px] uppercase tracking-widest ${STATUS_PILL[t.status as keyof typeof STATUS_PILL]}`}>
                          {STATUS_LABELS[t.status as keyof typeof STATUS_LABELS]}
                        </span>
                        <span className="font-body text-xs text-outline whitespace-nowrap">
                          {t.date ? new Date(t.date).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Bogota" }) : "Sin fecha"}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-body text-on-surface/70">{t.games?.name ?? "—"}</td>
                <td className="px-4 py-3 font-body text-on-surface/70">
                  {firstPrizeSummary(t.tournament_prizes ?? [])}
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
                <td colSpan={6} className="py-16 text-center">
                  <span className="material-symbols-outlined text-4xl text-outline/30">emoji_events</span>
                  <p className="font-headline text-sm text-outline/50 uppercase mt-2">Sin torneos aún</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Guided create wizard */}
      {createOpen && (
        <TournamentCreateWizard
          games={games}
          treasuryWallets={treasuryWallets}
          defaultPassDays={defaultPassDays}
          onClose={() => setCreateOpen(false)}
        />
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
