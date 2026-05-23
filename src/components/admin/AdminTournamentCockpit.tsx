"use client";

// Single-tournament admin cockpit. Renders the header (status pill, action
// buttons), a lifecycle banner, and four management cards (Información,
// Participantes, Bracket, Premios). Each card shows an inline preview of
// the current state and a deep-link button to the corresponding admin
// sub-page where the heavy editing happens.
//
// Modals owned here (lightweight): QR for check-in, cancel-tournament,
// delete-tournament. The big edit form (PrizesEditor + ImageUpload + many
// fields) lives on `/admin/torneos`; the cockpit's EDIT action navigates
// there. This keeps the cockpit ~300 lines, not 600+.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import QRCode from "react-qr-code";
import { Avatar } from "@/components/ui/Avatar";
import type {
  Tournament,
  TournamentPrize,
  TournamentResult,
  Game,
} from "@/types/database.types";

const BASE_URL  = process.env.NEXT_PUBLIC_BASE_URL  ?? "https://1upesports.org";

type TournamentRich = Tournament & {
  games:             Pick<Game, "id" | "name"> | null;
  tournament_prizes: TournamentPrize[];
};

type ResultRow = TournamentResult & {
  user_profiles: { nombre: string | null; apellidos: string | null; username: string | null; avatar_url: string | null } | null;
};

interface Props {
  tournament: TournamentRich;
  counts:     { total: number; registered: number; attended: number };
  bracket:    { id: number; status: string; format: string; participant_count: number } | null;
  results:    ResultRow[];
}

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
const BRACKET_LABEL: Record<string, string> = {
  draft: "Borrador (privado)", in_progress: "En curso", completed: "Finalizado",
};

function fmtPrize(p: TournamentPrize): string {
  if (p.prize_type === "tokens" && p.amount_tokens)
    return `${Number(p.amount_tokens).toLocaleString("es-CO")} $1UP`;
  if (p.prize_type === "cop" && p.amount_cop)
    return `$${p.amount_cop.toLocaleString("es-CO")}`;
  if (p.prize_type === "both") {
    const parts: string[] = [];
    if (p.amount_tokens) parts.push(`${Number(p.amount_tokens).toLocaleString("es-CO")} $1UP`);
    if (p.amount_cop)    parts.push(`$${p.amount_cop.toLocaleString("es-CO")}`);
    return parts.join(" + ");
  }
  return "—";
}

function fmtDate(d: string | null): string {
  if (!d) return "Sin fecha";
  return new Date(d).toLocaleDateString("es-CO", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Bogota",
  });
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const PRIZE_STATUS_PILL: Record<string, string> = {
  no_prize: "bg-outline/10 text-outline",
  pending:  "bg-secondary/15 text-secondary",
  sent:     "bg-tertiary/20 text-tertiary",
};

export function AdminTournamentCockpit({ tournament, counts, bracket, results }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();

  const [qrOpen,     setQrOpen]     = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError,   setActionError]   = useState<string | null>(null);

  const publicUrl = `${BASE_URL}/torneos/${tournament.slug}`;
  const checkinUrl = `${BASE_URL}/torneos/${tournament.slug}/checkin`;
  const tvUrl     = `${BASE_URL}/torneos/${tournament.slug}/tv`;

  const sorted = [...(tournament.tournament_prizes ?? [])].sort((a, b) => a.position - b.position);

  // Lifecycle stage — same convention as AdminTournamentBracketsClient
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

  return (
    <div>
      {/* ── Breadcrumb + back link ────────────────────────────────────── */}
      <Link
        href="/admin/torneos"
        className="inline-flex items-center gap-1 text-outline hover:text-on-surface font-headline font-bold text-xs uppercase tracking-widest mb-4 transition-colors"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        Torneos
      </Link>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
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

        {/* ── Action toolbar ──────────────────────────────── */}
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
          <Link
            href={`/admin/torneos?edit=${tournament.id}`}
            className="flex items-center gap-1.5 bg-primary-container text-white hover:opacity-90 transition-opacity p-2 font-headline font-black text-[10px] uppercase tracking-widest"
            title="Editar configuración"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            <span className="hidden sm:inline">Editar</span>
          </Link>
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

      {/* ── Stage banner ────────────────────────────────────────────── */}
      <div className="bg-surface-container p-4 mb-6 flex flex-wrap items-center gap-3">
        <span className="font-headline font-bold text-xs uppercase tracking-widest text-outline">Etapa</span>
        {([1, 2, 3, 4] as const).map((s) => (
          <span
            key={s}
            className={`font-headline font-black text-xs uppercase tracking-widest px-2 py-1 ${
              s === stage
                ? "bg-primary-container text-white"
                : s < stage
                  ? "bg-tertiary/15 text-tertiary"
                  : "bg-surface-container-high text-outline/60"
            }`}
          >
            {s}. {stageLabel[s]}
          </span>
        ))}
      </div>

      {actionError && (
        <div className="bg-error/10 text-error font-body text-sm p-3 mb-4">{actionError}</div>
      )}

      {/* ── Stat row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Inscritos"     value={counts.registered} />
        <Stat label="Asistieron"    value={counts.attended}   />
        <Stat label="Capacidad"     value={tournament.max_participants ?? "—"} />
        <Stat label="Premios"       value={sorted.length} />
      </div>

      {/* ── Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Información */}
        <Card title="INFORMACIÓN" icon="info">
          <Row label="Slug">
            <code className="font-mono text-xs text-on-surface/70">{tournament.slug}</code>
          </Row>
          <Row label="Sponsor">
            {tournament.sponsor_name ? (
              <a
                href={tournament.sponsor_website_url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:underline"
              >
                {tournament.sponsor_name}
              </a>
            ) : <span className="text-outline">Sin sponsor</span>}
          </Row>
          <Row label="Estado">
            <span className={`font-headline font-black text-xs uppercase ${STATUS_PILL[tournament.status] ?? ""} px-2 py-0.5`}>
              {STATUS_LABELS[tournament.status] ?? tournament.status}
            </span>
          </Row>
          <Row label="Visible">
            <span className={tournament.is_active ? "text-secondary" : "text-outline"}>
              {tournament.is_active ? "Sí" : "Oculto"}
            </span>
          </Row>
          {tournament.description && (
            <Row label="Descripción">
              <p className="font-body text-sm text-on-surface/80 whitespace-pre-line">{tournament.description}</p>
            </Row>
          )}
          <div className="pt-3 mt-3 bg-background/40 -mx-4 px-4 py-3">
            <Link
              href={`/admin/torneos?edit=${tournament.id}`}
              className="flex items-center justify-center gap-2 bg-primary-container text-white font-headline font-black text-xs uppercase tracking-widest py-2 hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Editar configuración completa
            </Link>
          </div>
        </Card>

        {/* Participantes */}
        <Card title="PARTICIPANTES" icon="groups" badge={String(counts.total)}>
          <Row label="Inscritos">{counts.registered}</Row>
          <Row label="Asistieron">{counts.attended}</Row>
          <Row label="Cancelaron">{counts.total - counts.registered - counts.attended}</Row>
          <Row label="Capacidad">
            {tournament.max_participants
              ? `${counts.registered + counts.attended} / ${tournament.max_participants}`
              : "Sin límite"}
          </Row>
          <div className="pt-3 mt-3 bg-background/40 -mx-4 px-4 py-3 space-y-2">
            <Link
              href={`/admin/tournament-registrations?tournamentId=${tournament.id}`}
              className="flex items-center justify-center gap-2 bg-primary-container text-white font-headline font-black text-xs uppercase tracking-widest py-2 hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-sm">list</span>
              Ver y gestionar inscripciones
            </Link>
            {tournament.status !== "completed" && (
              <button
                onClick={() => setQrOpen(true)}
                className="w-full flex items-center justify-center gap-2 bg-surface-container-high text-on-surface font-headline font-bold text-xs uppercase tracking-widest py-2 hover:bg-secondary-container/20 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                Mostrar QR de Check-in
              </button>
            )}
          </div>
        </Card>

        {/* Bracket */}
        <Card title="BRACKET" icon="tournament" badge={bracket ? BRACKET_LABEL[bracket.status] ?? bracket.status : "No creado"}>
          {bracket ? (
            <>
              <Row label="Formato">
                {bracket.format === "single_elimination" ? "Eliminación simple" : "Doble eliminación"}
              </Row>
              <Row label="Participantes">{bracket.participant_count}</Row>
              <Row label="Estado">
                <span className="font-headline font-black text-xs uppercase">
                  {BRACKET_LABEL[bracket.status] ?? bracket.status}
                </span>
              </Row>
            </>
          ) : (
            <p className="font-body text-sm text-outline">
              No se ha creado un bracket aún. Crea uno para iniciar el torneo.
            </p>
          )}
          <div className="pt-3 mt-3 bg-background/40 -mx-4 px-4 py-3">
            <Link
              href="/admin/tournament-brackets"
              className="flex items-center justify-center gap-2 bg-primary-container text-white font-headline font-black text-xs uppercase tracking-widest py-2 hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-sm">tournament</span>
              {bracket ? "Gestionar bracket" : "Crear bracket"}
            </Link>
          </div>
        </Card>

        {/* Premios y Resultados */}
        <Card title="PREMIOS Y RESULTADOS" icon="emoji_events" badge={sorted.length > 0 ? String(sorted.length) : undefined}>
          {sorted.length === 0 ? (
            <p className="font-body text-sm text-outline">
              No se han configurado premios. Edítalos en la configuración.
            </p>
          ) : (
            <div className="space-y-1.5">
              {sorted.map((p) => {
                const result = results.find(r => r.position === p.position);
                return (
                  <div key={p.id} className="flex items-center gap-3 bg-background/40 px-3 py-2">
                    <span className="text-lg shrink-0">{MEDAL[p.position]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-headline font-black text-xs uppercase tracking-widest text-on-surface">
                        {fmtPrize(p)}
                      </p>
                      {result?.user_profiles ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar
                            src={result.user_profiles.avatar_url}
                            name={[result.user_profiles.nombre, result.user_profiles.apellidos].filter(Boolean).join(" ") || result.user_profiles.username || null}
                            size="xs"
                            square
                          />
                          <p className="font-body text-xs text-on-surface/80 truncate">
                            {[result.user_profiles.nombre, result.user_profiles.apellidos].filter(Boolean).join(" ") || result.user_profiles.username || "—"}
                          </p>
                        </div>
                      ) : (
                        <p className="font-body text-xs text-outline mt-0.5">Sin ganador asignado</p>
                      )}
                    </div>
                    {result && (
                      <span className={`font-headline font-black text-[10px] uppercase tracking-widest px-2 py-0.5 ${PRIZE_STATUS_PILL[result.prize_status] ?? ""}`}>
                        {result.prize_status === "no_prize" ? "Sin premio" :
                         result.prize_status === "pending"  ? "Pendiente" :
                         result.prize_status === "sent"     ? "Entregado" : result.prize_status}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="pt-3 mt-3 bg-background/40 -mx-4 px-4 py-3">
            <Link
              href={`/admin/tournament-results?tournamentId=${tournament.id}`}
              className="flex items-center justify-center gap-2 bg-primary-container text-white font-headline font-black text-xs uppercase tracking-widest py-2 hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-sm">workspace_premium</span>
              Gestionar premios y entrega
            </Link>
          </div>
        </Card>
      </div>

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
            <li>Bracket {bracket ? `(${BRACKET_LABEL[bracket.status]})` : "(no hay)"}</li>
            <li>{sorted.length} premio{sorted.length === 1 ? "" : "s"} configurado{sorted.length === 1 ? "" : "s"}</li>
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
    <div className="bg-surface-container p-4">
      <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-1">{label}</p>
      <p className="font-headline font-black text-3xl text-primary-container leading-none">{value}</p>
    </div>
  );
}

function Card({
  title, icon, badge, children,
}: {
  title: string; icon: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-container p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-container">{icon}</span>
          <h3 className="font-headline font-black text-sm uppercase tracking-widest text-on-surface">{title}</h3>
        </div>
        {badge && (
          <span className="font-headline font-black text-[10px] uppercase tracking-widest px-2 py-1 bg-primary-container/20 text-primary-container">
            {badge}
          </span>
        )}
      </div>
      <div className="flex-1 space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px,1fr] gap-2 items-baseline">
      <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline">{label}</p>
      <div className="font-body text-sm text-on-surface min-w-0">{children}</div>
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
