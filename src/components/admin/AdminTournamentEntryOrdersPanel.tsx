"use client";

// Cockpit tab: entry-fee payment orders for one tournament (v2.41.0).
// Pending bank orders are approved/rejected here — approval registers the
// player via the same atomic RPC, so a full tournament surfaces the
// manual-refund situation instead of silently failing. Token orders arrive
// already confirmed (on-chain verified); a confirmed order without a
// registration is flagged as a manual-refund case.

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAdminToast } from "@/components/admin/ui/Toast";
import type { TournamentEntryOrder } from "@/types/database.types";

export type EntryOrderRow = TournamentEntryOrder & {
  user_profiles: {
    nombre:     string | null;
    apellidos:  string | null;
    email:      string | null;
    username:   string | null;
    avatar_url: string | null;
  } | null;
};

interface Props {
  orders:         EntryOrderRow[];
  tournamentName: string;
  entryFeeTokens: number | null;
  entryFeeCop:    number | null;
  onChange:       () => void;
}

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  pending_bank: { label: "Pendiente",  cls: "bg-secondary/15 text-secondary" },
  confirmed:    { label: "Confirmada", cls: "bg-tertiary/15 text-tertiary" },
  rejected:     { label: "Rechazada",  cls: "bg-error/15 text-error" },
  cancelled:    { label: "Cancelada",  cls: "bg-outline/10 text-outline" },
};

function orderUserName(o: EntryOrderRow): string {
  const p = o.user_profiles;
  if (!p) return `Perfil #${o.user_profile_id}`;
  return [p.nombre, p.apellidos].filter(Boolean).join(" ").trim() || p.username || p.email || `Perfil #${o.user_profile_id}`;
}

function fmtAmount(o: EntryOrderRow): string {
  if (o.payment_method === "token" && o.amount_tokens != null)
    return `${Number(o.amount_tokens).toLocaleString("es-CO")} $1UP`;
  if (o.amount_cop != null) return `$${o.amount_cop.toLocaleString("es-CO")} COP`;
  return "—";
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("es-CO", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Bogota",
  });
}

export function AdminTournamentEntryOrdersPanel({ orders, tournamentName, entryFeeTokens, entryFeeCop, onChange }: Props) {
  const { getAccessToken } = usePrivy();
  const { showError, showSuccess } = useAdminToast();

  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectingId, setRejectingId]     = useState<number | null>(null);
  const [rejectReason, setRejectReason]   = useState("");

  const hasFee = (entryFeeTokens ?? 0) > 0 || (entryFeeCop ?? 0) > 0;
  const pending     = orders.filter((o) => o.status === "pending_bank");
  const confirmed   = orders.filter((o) => o.status === "confirmed");
  const unlinked    = confirmed.filter((o) => o.registration_id == null);

  async function review(id: number, action: "approve" | "reject", rejectionReason?: string) {
    setActionLoading(id);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/admin/tournament-entry-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, action, rejectionReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showError(data.error ?? "No se pudo procesar la orden.");
        return;
      }
      showSuccess(action === "approve" ? "Pago aprobado — jugador inscrito." : "Orden rechazada.");
      setRejectingId(null);
      setRejectReason("");
      onChange();
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi label="Pendientes"   value={pending.length} highlight={pending.length > 0} />
        <Kpi label="Confirmadas"  value={confirmed.length} />
        <Kpi label="Rechazadas"   value={orders.filter((o) => o.status === "rejected").length} />
        <Kpi label="Sin cupo"     value={unlinked.length} highlight={unlinked.length > 0} />
      </div>

      {!hasFee && (
        <p className="font-body text-sm text-outline">
          Este torneo no tiene costo de inscripción configurado — define el costo en la
          pestaña Información para activar los pagos.
        </p>
      )}

      {unlinked.length > 0 && (
        <div className="bg-error/10 p-4">
          <p className="font-headline font-bold text-xs uppercase tracking-widest text-error mb-1">
            Pagos confirmados sin cupo — reembolso manual
          </p>
          <p className="font-body text-xs text-on-surface/70">
            {unlinked.length === 1 ? "Hay 1 pago verificado" : `Hay ${unlinked.length} pagos verificados`} cuyo
            cupo no pudo asignarse (torneo lleno al confirmar). Coordina el reembolso manual con
            {unlinked.length === 1 ? " el usuario" : " los usuarios"} marcados abajo.
          </p>
        </div>
      )}

      {orders.length === 0 ? (
        <p className="font-body text-sm text-outline py-6 text-center">
          Aún no hay órdenes de pago para {tournamentName}.
        </p>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => {
            const pill = STATUS_PILL[o.status] ?? { label: o.status, cls: "bg-outline/10 text-outline" };
            const isPending = o.status === "pending_bank";
            const noSlot    = o.status === "confirmed" && o.registration_id == null;
            return (
              <div key={o.id} className="bg-surface-container p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-headline font-bold text-sm text-on-surface truncate">{orderUserName(o)}</p>
                    <p className="font-body text-xs text-outline">
                      {o.user_profiles?.email ?? "—"} · {fmtDate(o.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-headline font-black text-[10px] uppercase tracking-widest px-2 py-1 bg-surface-container-high text-on-surface">
                      {o.payment_method === "token" ? "$1UP" : "Banco"}
                    </span>
                    <span className="font-headline font-bold text-sm">{fmtAmount(o)}</span>
                    <span className={`font-headline font-black text-[10px] uppercase tracking-widest px-2 py-1 ${pill.cls}`}>
                      {pill.label}
                    </span>
                  </div>
                </div>

                {noSlot && (
                  <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-error">
                    ⚠ Pago sin cupo — gestionar reembolso manual
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  {o.payment_method === "token" && o.tx_hash && (
                    <a
                      href={`https://basescan.org/tx/${o.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      TX {o.tx_hash.slice(0, 10)}…{o.tx_hash.slice(-6)} →
                    </a>
                  )}
                  {o.comprobante_url && (
                    <a
                      href={o.comprobante_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-headline font-bold text-[10px] uppercase tracking-widest text-secondary hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">receipt_long</span>
                      Ver comprobante
                    </a>
                  )}
                  {o.rejection_reason && (
                    <span className="font-body text-xs text-error">Motivo: {o.rejection_reason}</span>
                  )}
                  {o.reviewed_by && (
                    <span className="font-body text-xs text-outline">Revisado por {o.reviewed_by}</span>
                  )}
                </div>

                {/* Comprobante inline preview for image receipts */}
                {isPending && o.comprobante_url && !o.comprobante_url.includes(".pdf") && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.comprobante_url} alt="Comprobante" className="max-h-48 object-contain bg-surface-container-lowest" />
                )}

                {isPending && rejectingId !== o.id && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => review(o.id, "approve")}
                      disabled={actionLoading === o.id}
                      className="bg-tertiary text-background font-headline font-black text-xs uppercase tracking-tight px-4 py-2 disabled:opacity-40"
                    >
                      {actionLoading === o.id ? "PROCESANDO…" : "APROBAR E INSCRIBIR"}
                    </button>
                    <button
                      onClick={() => { setRejectingId(o.id); setRejectReason(""); }}
                      disabled={actionLoading === o.id}
                      className="bg-surface-container-high text-error font-headline font-black text-xs uppercase tracking-tight px-4 py-2 disabled:opacity-40"
                    >
                      RECHAZAR
                    </button>
                  </div>
                )}

                {isPending && rejectingId === o.id && (
                  <div className="space-y-2">
                    <input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Motivo del rechazo (ej: comprobante ilegible, torneo lleno — reembolso manual)"
                      className="w-full bg-surface-container-lowest text-on-background p-3 font-body text-sm border-none focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => review(o.id, "reject", rejectReason)}
                        disabled={actionLoading === o.id}
                        className="bg-error text-white font-headline font-black text-xs uppercase tracking-tight px-4 py-2 disabled:opacity-40"
                      >
                        {actionLoading === o.id ? "PROCESANDO…" : "CONFIRMAR RECHAZO"}
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectReason(""); }}
                        disabled={actionLoading === o.id}
                        className="bg-surface-container-high font-headline font-black text-xs uppercase tracking-tight px-4 py-2 disabled:opacity-40"
                      >
                        VOLVER
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="bg-surface-container px-4 py-3 flex items-baseline justify-between gap-3 min-w-0">
      <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline truncate">{label}</p>
      <p className={`font-headline font-black text-xl leading-none shrink-0 ${highlight ? "text-secondary" : "text-primary-container"}`}>{value}</p>
    </div>
  );
}
