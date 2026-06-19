"use client";

// Unified admin cockpit for a single tournament — tab-based UI.
//
// Structure:
//   • Header (sticky-ish): cover, name, status pill, lifecycle metadata
//   • Action toolbar: Pública / TV / QR / Editar / Cancelar / Eliminar
//   • Lifecycle banner (1 Inscripciones · 2 Borrador · 3 En curso · 4 Finalizado)
//   • 4 tabs:
//       - Información — read-only summary + deep-link to full edit modal
//       - Inscripciones — embeds AdminTournamentRegistrationsPanel
//       - Bracket — embeds AdminTournamentBracketPanel
//       - Premios — embeds AdminTournamentResultsPanel
//
// Each panel is a self-contained component reused from the standalone admin
// pages (or extracted from them) — the cockpit only owns the chrome.
//
// Active-tab state is held in the URL hash so refreshes + back-button work
// naturally and admins can deep-link to a specific tab.

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import QRCode from "react-qr-code";
import { AdminTournamentBracketPanel } from "@/components/admin/AdminTournamentBracketPanel";
import {
  AdminTournamentRegistrationsPanel,
  type CockpitRegistration,
} from "@/components/admin/AdminTournamentRegistrationsPanel";
import {
  AdminTournamentResultsPanel,
  type ResultRow,
  type RegistrationOption,
} from "@/components/admin/AdminTournamentResultsPanel";
import { AdminTournamentInfoEditor } from "@/components/admin/AdminTournamentInfoEditor";
import { AdminTournamentEntryOrdersPanel, type EntryOrderRow } from "@/components/admin/AdminTournamentEntryOrdersPanel";
import type { Tournament, TournamentPrize, Game } from "@/types/database.types";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://1upesports.org";

type TournamentRich = Tournament & {
  games:             Pick<Game, "id" | "name"> | null;
  tournament_prizes: TournamentPrize[];
};

interface Props {
  tournament:      TournamentRich;
  registrations:   CockpitRegistration[];
  bracket:         { id: number; status: string; format: string; participant_count: number } | null;
  results:         ResultRow[];
  games:           Pick<Game, "id" | "name">[];
  defaultPassDays: number;
  entryOrders:     EntryOrderRow[];
  treasuryWallets: TreasuryWalletOption[];
}

export type TreasuryWalletOption = { id: number; label: string; address: string };

const STATUS_LABELS: Record<string, string> = {
  upcoming: "Próximo", live: "En vivo", completed: "Finalizado",
};
const STATUS_PILL: Record<string, string> = {
  upcoming:  "bg-secondary/15 text-secondary",
  live:      "bg-primary-container/20 text-primary-container",
  completed: "bg-outline/10 text-outline",
};
const LOC_LABELS: Record<string, string> = {
  presencial: "Presencial", online: "Online", mixto: "Mixto",
};

function fmtPrize(p: TournamentPrize): string {
  const parts: string[] = [];
  if ((p.prize_type === "tokens" || p.prize_type === "both") && p.amount_tokens)
    parts.push(`${Number(p.amount_tokens).toLocaleString("es-CO")} $1UP`);
  if ((p.prize_type === "cop" || p.prize_type === "both") && p.amount_cop)
    parts.push(`$${p.amount_cop.toLocaleString("es-CO")}`);
  if (p.includes_pass && p.pass_days) parts.push(`Pase ${p.pass_days}d`);
  return parts.length ? parts.join(" + ") : "—";
}

function fmtDate(d: string | null): string {
  if (!d) return "Sin fecha";
  return new Date(d).toLocaleDateString("es-CO", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Bogota",
  });
}

type TabId = "info" | "inscripciones" | "pagos" | "bracket" | "premios";
const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "info",          label: "Información",   icon: "info"          },
  { id: "inscripciones", label: "Inscripciones", icon: "groups"        },
  { id: "pagos",         label: "Pagos",         icon: "payments"      },
  { id: "bracket",       label: "Bracket",       icon: "account_tree"  },
  { id: "premios",       label: "Premios",       icon: "emoji_events"  },
];

export function AdminTournamentCockpit({ tournament, registrations, bracket, results, games, defaultPassDays, entryOrders, treasuryWallets }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();

  // Active tab persisted in the URL hash so refresh / back-button / share-link work.
  const [activeTab, setActiveTab] = useState<TabId>("info");
  useEffect(() => {
    const fromHash = (window.location.hash.replace("#", "") || "info") as TabId;
    if (TABS.some(t => t.id === fromHash)) setActiveTab(fromHash);
  }, []);
  function selectTab(id: TabId) {
    setActiveTab(id);
    history.replaceState(null, "", `#${id}`);
  }

  // Modal state for cross-cutting actions on the header toolbar
  const [qrOpen,     setQrOpen]     = useState(false);
  const [shareOpen,  setShareOpen]  = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError,   setActionError]   = useState<string | null>(null);
  const [copyDone,      setCopyDone]      = useState(false);

  const publicUrl  = `${BASE_URL}/torneos/${tournament.slug}`;
  const checkinUrl = `${BASE_URL}/torneos/${tournament.slug}/checkin`;
  const tvUrl      = `${BASE_URL}/torneos/${tournament.slug}/tv`;

  const sortedPrizes = [...(tournament.tournament_prizes ?? [])].sort((a, b) => a.position - b.position);

  // Counts derived from the full registration list — single source of truth
  const counts = {
    total:      registrations.length,
    registered: registrations.filter(r => r.status === "registered").length,
    attended:   registrations.filter(r => r.status === "attended").length,
    cancelled:  registrations.filter(r => r.status === "cancelled").length,
  };

  // Lifecycle stage — same as the bracket admin
  const stage: 1 | 2 | 3 | 4 =
    tournament.status === "completed" ? 4 :
    bracket?.status === "in_progress" ? 3 :
    bracket?.status === "draft"        ? 2 : 1;
  const stageLabel: Record<1 | 2 | 3 | 4, string> = {
    1: "Inscripciones abiertas",
    2: "Borrador del bracket",
    3: "Torneo en curso",
    4: "Torneo finalizado",
  };
  // Shorter versions used on narrow viewports — the 4-step stepper needs the
  // labels to fit under ~80px wide nodes without wrapping to 3 lines.
  const stageLabelShort: Record<1 | 2 | 3 | 4, string> = {
    1: "Inscripción",
    2: "Borrador",
    3: "En curso",
    4: "Finalizado",
  };

  // Eligible candidates for manual podium assignment — only registered/attended
  const candidates: RegistrationOption[] = registrations
    .filter(r => r.status === "registered" || r.status === "attended")
    .map(r => ({
      user_profile_id: r.user_profile_id,
      name:            [r.user_profiles?.nombre, r.user_profiles?.apellidos].filter(Boolean).join(" ") || r.user_profiles?.username || `Perfil #${r.user_profile_id}`,
      username:        r.user_profiles?.username ?? null,
      avatar_url:      r.user_profiles?.avatar_url ?? null,
    }));

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  async function doCancel() {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/tournaments", {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({
          id:                 tournament.id,
          name:               tournament.name,
          gameId:             tournament.game_id,
          date:               tournament.date,
          maxParticipants:    tournament.max_participants,
          status:             "completed",
          locationType:       tournament.location_type,
          imageUrl:           tournament.image_url,
          description:        tournament.description,
          isActive:           tournament.is_active,
          isRegistrationOpen: false,
          sortOrder:          tournament.sort_order,
          cancelTournament:   true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error ?? "No se pudo cancelar el torneo.");
        return;
      }
      router.refresh();
      setCancelOpen(false);
    } finally {
      setActionLoading(false);
    }
  }

  async function doDelete() {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/tournaments", {
        method: "DELETE",
        headers: await authHeaders(),
        body: JSON.stringify({ id: tournament.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error ?? "No se pudo eliminar el torneo.");
        return;
      }
      router.replace("/admin/torneos");
    } finally {
      setActionLoading(false);
    }
  }

  // ── Share/copy summary ────────────────────────────────────────────
  // Compose a social-friendly summary that includes name, date, game,
  // 1° prize, location, sponsor (when set), and the public inscription URL.
  function buildShareText(): string {
    const lines: string[] = [];
    lines.push(`🏆 ${tournament.name.toUpperCase()}`);
    if (tournament.games?.name) lines.push(`🎮 ${tournament.games.name}`);
    if (tournament.date)        lines.push(`📅 ${fmtDate(tournament.date)}`);
    const firstPrize = sortedPrizes.find((p) => p.position === 1);
    if (firstPrize)             lines.push(`🥇 1° lugar: ${fmtPrize(firstPrize)}`);
    lines.push(`📍 ${LOC_LABELS[tournament.location_type] ?? tournament.location_type}`);
    if (tournament.sponsor_name) lines.push(`🤝 Patrocinado por ${tournament.sponsor_name}`);
    lines.push("");
    lines.push(`👉 Inscríbete: ${publicUrl}`);
    return lines.join("\n");
  }

  async function copyShareText() {
    try {
      await navigator.clipboard.writeText(buildShareText());
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      // clipboard.writeText can fail in HTTP contexts — best-effort, no toast.
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: tournament.name,
          text:  buildShareText(),
          url:   publicUrl,
        });
      } catch { /* user cancelled */ }
    }
  }

  const tournamentForBracket = {
    id:                   tournament.id,
    name:                 tournament.name,
    status:               tournament.status,
    is_registration_open: tournament.is_registration_open,
    max_participants:     tournament.max_participants,
  };

  return (
    <div>
      {/* ── Back link ────────────────────────────────────────────────── */}
      <Link
        href="/admin/torneos"
        className="inline-flex items-center gap-1 text-outline hover:text-on-surface font-headline font-bold text-xs uppercase tracking-widest mb-4 transition-colors"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        Torneos
      </Link>

      {/* ── Stats strip (above header) ───────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <Stat label="Inscritos"  value={counts.registered} />
        <Stat label="Asistieron" value={counts.attended}   />
        <Stat label="Capacidad"  value={tournament.max_participants ?? "—"} />
        <Stat label="Premios"    value={sortedPrizes.length} />
      </div>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div className="flex items-start gap-4 min-w-0">
          {tournament.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tournament.image_url} alt={tournament.name} className="w-20 h-20 object-cover shrink-0" />
          )}
          <div className="min-w-0">
            <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">
              {tournament.games?.name ?? "Sin juego asignado"}
            </p>
            <h1 className="font-headline font-black text-3xl md:text-4xl uppercase tracking-tighter text-on-surface truncate">
              {tournament.name}
            </h1>
            <div className="h-1 w-16 bg-primary-container mt-2 mb-3" />
            <div className="flex flex-wrap items-center gap-2">
              <span className={`font-headline font-black text-xs uppercase tracking-widest px-2 py-1 ${STATUS_PILL[tournament.status] ?? "bg-outline/10 text-outline"}`}>
                {STATUS_LABELS[tournament.status] ?? tournament.status}
              </span>
              <span className="font-headline font-bold text-xs uppercase tracking-widest text-outline">
                · {LOC_LABELS[tournament.location_type] ?? tournament.location_type}
              </span>
              <span className="font-headline font-bold text-xs uppercase tracking-widest text-outline">
                · {fmtDate(tournament.date)}
              </span>
              {tournament.is_registration_open && (
                <span className="font-headline font-black text-xs uppercase tracking-widest px-2 py-0.5 bg-secondary/15 text-secondary">
                  Inscripción abierta
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action toolbar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-surface-container-high hover:bg-primary-container/20 transition-colors p-2 font-headline font-bold text-[10px] uppercase tracking-widest"
            title="Ver página pública"
          >
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            <span className="hidden sm:inline">Pública</span>
          </a>
          <a
            href={tvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-surface-container-high hover:bg-primary-container/20 transition-colors p-2 font-headline font-bold text-[10px] uppercase tracking-widest"
            title="Vista TV (pantalla completa)"
          >
            <span className="material-symbols-outlined text-sm">tv</span>
            <span className="hidden sm:inline">TV</span>
          </a>
          {tournament.status !== "completed" && (
            <button
              onClick={() => setQrOpen(true)}
              className="flex items-center gap-1.5 bg-surface-container-high hover:bg-secondary-container/20 transition-colors p-2 font-headline font-bold text-[10px] uppercase tracking-widest"
              title="QR de Check-in"
            >
              <span className="material-symbols-outlined text-sm">qr_code</span>
              <span className="hidden sm:inline">QR</span>
            </button>
          )}
          <button
            onClick={() => { setShareOpen(true); setCopyDone(false); }}
            className="flex items-center gap-1.5 bg-surface-container-high hover:bg-primary-container/20 transition-colors p-2 font-headline font-bold text-[10px] uppercase tracking-widest"
            title="Compartir torneo"
          >
            <span className="material-symbols-outlined text-sm">share</span>
            <span className="hidden sm:inline">Compartir</span>
          </button>
          {tournament.status !== "completed" && (
            <button
              onClick={() => setCancelOpen(true)}
              className="flex items-center gap-1.5 bg-surface-container-high hover:bg-secondary/20 hover:text-secondary transition-colors p-2 font-headline font-bold text-[10px] uppercase tracking-widest"
              title="Cancelar torneo"
            >
              <span className="material-symbols-outlined text-sm">block</span>
              <span className="hidden sm:inline">Cancelar</span>
            </button>
          )}
          <button
            onClick={() => setDeleteOpen(true)}
            className="flex items-center gap-1.5 bg-surface-container-high hover:bg-error/20 hover:text-error transition-colors p-2 font-headline font-bold text-[10px] uppercase tracking-widest"
            title="Eliminar torneo"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            <span className="hidden sm:inline">Eliminar</span>
          </button>
        </div>
      </div>

      {/* ── Phase stepper ────────────────────────────────────────────── */}
      {/* Stage is driven by the bracket lifecycle — not clickable. The
         stepper just visualises where the tournament is, with completed
         stages filled, the current one highlighted, future ones dim. */}
      <div className="bg-surface-container p-5 mb-6">
        <ol
          className="flex items-center justify-between gap-2"
          role="list"
          aria-label="Etapas del torneo"
        >
          {([1, 2, 3, 4] as const).map((s, i, arr) => {
            const isCurrent = s === stage;
            const isPast    = s <  stage;
            const label     = stageLabel[s];
            return (
              <li key={s} className="flex items-center flex-1 min-w-0 last:flex-none">
                <div className="flex flex-col items-center flex-shrink-0 min-w-0">
                  <div
                    className={`w-10 h-10 flex items-center justify-center font-headline font-black text-sm transition-all ${
                      isCurrent
                        ? "bg-primary-container text-white ring-4 ring-primary-container/25"
                        : isPast
                          ? "bg-tertiary text-background"
                          : "bg-surface-container-high text-outline/40"
                    }`}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`Etapa ${s}: ${label}${isPast ? " (completada)" : isCurrent ? " (actual)" : ""}`}
                  >
                    {isPast ? (
                      <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">check</span>
                    ) : s}
                  </div>
                  <p
                    className={`font-headline font-bold text-[10px] uppercase tracking-widest mt-2 text-center max-w-[90px] leading-tight ${
                      isCurrent
                        ? "text-on-surface"
                        : isPast
                          ? "text-tertiary"
                          : "text-outline/40"
                    }`}
                  >
                    <span className="sm:hidden">{stageLabelShort[s]}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </p>
                </div>
                {i < arr.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 mb-7 transition-colors ${
                      s < stage ? "bg-tertiary" : "bg-surface-container-high"
                    }`}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {actionError && (
        <div className="bg-error/10 text-error font-body text-sm p-3 mb-4">{actionError}</div>
      )}

      {/* ── Tab bar ──────────────────────────────────────────────────── */}
      {/* Visual separation between the tab strip and content below comes from
         the bg-surface-container shift on the content panel — no 1px divider. */}
      <div className="flex flex-wrap items-center gap-1" role="tablist">
        {TABS.map(t => {
          const active = activeTab === t.id;
          const pendingPayments = entryOrders.filter((o) => o.status === "pending_bank").length;
          const badge =
            t.id === "inscripciones" ? counts.total :
            t.id === "pagos"          ? (entryOrders.length > 0 ? pendingPayments : undefined) :
            t.id === "premios"        ? sortedPrizes.length :
            undefined;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => selectTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 font-headline font-black text-xs uppercase tracking-tight transition-colors ${
                active
                  ? "bg-surface-container text-primary-container"
                  : "text-outline hover:text-on-surface hover:bg-surface-container/40"
              }`}
            >
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: active ? "'FILL' 1" : undefined }}>
                {t.icon}
              </span>
              {t.label}
              {badge !== undefined && (
                <span className={`font-headline font-black text-[10px] px-1.5 py-0.5 ${
                  active ? "bg-primary-container/20 text-primary-container" : "bg-surface-container-high text-outline"
                }`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────── */}
      <div className="bg-surface-container/40 p-4 md:p-6">
        {activeTab === "info" && (
          <AdminTournamentInfoEditor
            tournament={tournament}
            games={games}
            defaultPassDays={defaultPassDays}
            treasuryWallets={treasuryWallets}
            onSaved={() => router.refresh()}
          />
        )}
        {activeTab === "inscripciones" && (
          <AdminTournamentRegistrationsPanel
            registrations={registrations}
            tournamentName={tournament.name}
            onChange={() => router.refresh()}
          />
        )}
        {activeTab === "pagos" && (
          <AdminTournamentEntryOrdersPanel
            orders={entryOrders}
            tournamentName={tournament.name}
            entryFeeTokens={tournament.entry_fee_tokens}
            entryFeeCop={tournament.entry_fee_cop}
            onChange={() => router.refresh()}
          />
        )}
        {activeTab === "bracket" && (
          <AdminTournamentBracketPanel
            tournament={tournamentForBracket}
            onChange={() => router.refresh()}
          />
        )}
        {activeTab === "premios" && (
          <AdminTournamentResultsPanel
            tournamentId={tournament.id}
            tournamentName={tournament.name}
            prizes={sortedPrizes}
            results={results}
            candidates={candidates}
            onChange={() => router.refresh()}
          />
        )}
      </div>

      {/* ── Share modal ──────────────────────────────────────────── */}
      {shareOpen && (
        <Modal onClose={() => setShareOpen(false)}>
          <h2 className="font-headline font-black text-2xl uppercase tracking-tighter mb-2">
            COM<span className="text-primary-container">PARTIR</span>
          </h2>
          <p className="font-body text-sm text-outline mb-4">
            Copia el texto para WhatsApp, Discord o Instagram, o usa compartir nativo.
          </p>
          <pre className="bg-surface-container-lowest text-on-surface font-body text-sm p-4 whitespace-pre-wrap break-words mb-4">
{buildShareText()}
          </pre>
          <div className="flex gap-2">
            <button
              onClick={copyShareText}
              className="flex-1 bg-primary-container text-white font-headline font-black py-3 uppercase tracking-tight hover:opacity-90 transition-opacity"
            >
              {copyDone ? "✓ COPIADO" : "COPIAR TEXTO"}
            </button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                onClick={nativeShare}
                className="px-5 bg-surface-container-high text-on-surface font-headline font-black uppercase"
                title="Compartir nativo (móvil)"
              >
                <span className="material-symbols-outlined">ios_share</span>
              </button>
            )}
          </div>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-4 font-headline font-bold text-[10px] uppercase tracking-widest text-secondary hover:underline text-center"
          >
            Abrir página pública →
          </a>
        </Modal>
      )}

      {/* ── QR modal ─────────────────────────────────────────────── */}
      {qrOpen && (
        <Modal onClose={() => setQrOpen(false)}>
          <h2 className="font-headline font-black text-2xl uppercase tracking-tighter mb-2">
            QR <span className="text-primary-container">CHECK-IN</span>
          </h2>
          <p className="font-body text-sm text-outline mb-6">
            Comparte este QR en la entrada del evento. Los inscritos lo escanean
            con su celular para marcar asistencia.
          </p>
          <div className="bg-white p-6 flex justify-center mb-4">
            <QRCode value={checkinUrl} size={256} />
          </div>
          <p className="font-mono text-xs text-on-surface/60 break-all">{checkinUrl}</p>
        </Modal>
      )}

      {/* ── Cancel modal ─────────────────────────────────────────── */}
      {cancelOpen && (
        <Modal onClose={() => setCancelOpen(false)}>
          <h2 className="font-headline font-black text-2xl uppercase tracking-tighter mb-2">
            ¿Cancelar <span className="text-secondary">torneo</span>?
          </h2>
          <p className="font-body text-sm text-outline mb-2">
            Esto marcará el torneo como <strong>finalizado</strong> sin haberse jugado y cerrará las inscripciones.
            Los inscritos seguirán visibles para registro histórico.
          </p>
          <p className="font-body text-sm text-on-surface/70 mb-6">
            Inscritos actuales: <strong>{counts.registered + counts.attended}</strong>
          </p>
          <div className="flex gap-3">
            <button
              onClick={doCancel}
              disabled={actionLoading}
              className="flex-1 bg-secondary text-white font-headline font-black py-3 uppercase tracking-tight disabled:opacity-40"
            >
              {actionLoading ? "CANCELANDO…" : "SÍ, CANCELAR"}
            </button>
            <button
              onClick={() => setCancelOpen(false)}
              disabled={actionLoading}
              className="px-6 bg-surface-container-high text-on-surface font-headline font-black uppercase disabled:opacity-40"
            >
              VOLVER
            </button>
          </div>
        </Modal>
      )}

      {/* ── Delete modal ─────────────────────────────────────────── */}
      {deleteOpen && (
        <Modal onClose={() => setDeleteOpen(false)}>
          <h2 className="font-headline font-black text-2xl uppercase tracking-tighter mb-2">
            ¿Eliminar <span className="text-error">torneo</span>?
          </h2>
          <p className="font-body text-sm text-outline mb-2">
            Esta acción es <strong>permanente</strong>. Se eliminarán también:
          </p>
          <ul className="font-body text-sm text-on-surface/80 list-disc pl-5 mb-4 space-y-1">
            <li>{counts.total} inscripción{counts.total === 1 ? "" : "es"}</li>
            <li>Bracket {bracket ? `(${bracket.status})` : "(no hay)"}</li>
            <li>{sortedPrizes.length} premio{sortedPrizes.length === 1 ? "" : "s"} configurado{sortedPrizes.length === 1 ? "" : "s"}</li>
            <li>{results.length} resultado{results.length === 1 ? "" : "s"} del podio</li>
          </ul>
          <p className="font-body text-xs text-error mb-6">
            Recomendado: usa <strong>Cancelar</strong> para preservar el historial.
          </p>
          <div className="flex gap-3">
            <button
              onClick={doDelete}
              disabled={actionLoading}
              className="flex-1 bg-error text-white font-headline font-black py-3 uppercase tracking-tight disabled:opacity-40"
            >
              {actionLoading ? "ELIMINANDO…" : "SÍ, ELIMINAR"}
            </button>
            <button
              onClick={() => setDeleteOpen(false)}
              disabled={actionLoading}
              className="px-6 bg-surface-container-high text-on-surface font-headline font-black uppercase disabled:opacity-40"
            >
              VOLVER
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-surface-container px-4 py-3 flex items-baseline justify-between gap-3 min-w-0">
      <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline truncate">{label}</p>
      <p className="font-headline font-black text-xl text-primary-container leading-none shrink-0">{value}</p>
    </div>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-container w-full max-w-lg p-8 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-outline hover:text-on-surface"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        {children}
      </div>
    </div>
  );
}

