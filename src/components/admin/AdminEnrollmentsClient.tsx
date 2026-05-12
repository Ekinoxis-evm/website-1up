"use client";

import { Fragment, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { formatCop } from "@/lib/utils";

interface EnrollmentRow {
  id: number;
  product_type: string;
  original_price_cop: number;
  discount_pct_applied: number | null;
  final_price_cop: number;
  payment_method: string;
  payment_status: string | null;
  mp_payment_id: string | null;
  paid_at: string | null;
  tx_hash: string | null;
  approved_tx_hash: string | null;
  comprobante_url: string | null;
  bank_account_id: number | null;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  user_profiles: {
    email: string | null;
    nombre: string | null;
    apellidos: string | null;
    tipo_documento: string | null;
    numero_documento: string | null;
    comfenalco_afiliado: boolean | null;
  } | null;
  courses: { name: string; category: string } | null;
  discount_rules: { name: string; trigger_type: string } | null;
  bank_accounts: { bank_name: string; account_number: string } | null;
}

interface Props { enrollments: EnrollmentRow[] }

const STATUS_STYLE: Record<string, { bg: string; label: string }> = {
  approved:  { bg: "bg-primary-container text-white",           label: "Aprobado"  },
  pending:   { bg: "bg-tertiary text-background",               label: "Pendiente" },
  rejected:  { bg: "bg-error text-white",                       label: "Rechazado" },
  cancelled: { bg: "bg-surface-container-highest text-outline", label: "Cancelado" },
};

const METHOD_STYLE: Record<string, { bg: string; label: string }> = {
  mercadopago: { bg: "bg-secondary-container/40 text-secondary", label: "MercadoPago" },
  token:       { bg: "bg-tertiary/20 text-tertiary",             label: "$1UP Token"  },
  bank:        { bg: "bg-primary-container/20 text-primary",     label: "Banco"       },
};

const STATUS_FILTERS  = ["Todos", "approved", "pending", "rejected", "cancelled"] as const;
const METHOD_FILTERS  = ["Todos", "mercadopago", "token", "bank"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];
type MethodFilter = (typeof METHOD_FILTERS)[number];

const BASESCAN = "https://basescan.org/tx/";

const TH = "font-headline text-[10px] uppercase tracking-widest text-outline text-left px-3 py-2.5 whitespace-nowrap";
const TD = "px-3 py-3 align-top";

export function AdminEnrollmentsClient({ enrollments }: Props) {
  const { getAccessToken } = usePrivy();
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Todos");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("Todos");
  const [actionId, setActionId]         = useState<number | null>(null);
  const [approvedTxHash, setApprovedTxHash] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const visible = enrollments.filter((e) => {
    if (statusFilter !== "Todos" && e.payment_status !== statusFilter) return false;
    if (methodFilter !== "Todos" && e.payment_method !== methodFilter) return false;
    return true;
  });

  const totalRevenue = enrollments
    .filter((e) => e.payment_status === "approved")
    .reduce((sum, e) => sum + e.final_price_cop, 0);

  function openAction(e: EnrollmentRow) {
    setActionId(actionId === e.id ? null : e.id);
    setApprovedTxHash("");
    setRejectionReason("");
    setErr("");
  }

  async function doAction(id: number, action: "approve" | "reject") {
    setSaving(true); setErr("");
    const token = await getAccessToken();
    const res = await fetch("/api/admin/enrollments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id,
        action,
        approvedTxHash:  approvedTxHash.trim() || undefined,
        rejectionReason: rejectionReason.trim() || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error ?? "Error");
      return;
    }
    setActionId(null);
    setApprovedTxHash("");
    setRejectionReason("");
    router.refresh();
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
            INSCRIPCIONES <span className="text-primary">PAGOS</span>
          </h1>
          <div className="h-1 w-16 bg-primary mt-2" />
        </div>
        <div className="text-right">
          <div className="font-headline font-black text-2xl text-primary">{formatCop(totalRevenue)}</div>
          <div className="font-body text-xs text-outline uppercase tracking-widest">Ingresos totales aprobados</div>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-6">
        {/* Status */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline w-16 shrink-0">Estado</span>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`font-headline font-black text-xs px-3 py-1.5 uppercase tracking-widest transition-all ${
                statusFilter === f
                  ? "bg-primary-container text-white"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {f === "Todos" ? "Todos" : (STATUS_STYLE[f]?.label ?? f)}
            </button>
          ))}
        </div>

        {/* Method */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline w-16 shrink-0">Método</span>
          {METHOD_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setMethodFilter(f)}
              className={`font-headline font-black text-xs px-3 py-1.5 uppercase tracking-widest transition-all ${
                methodFilter === f
                  ? "bg-secondary-container text-white"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {f === "Todos" ? "Todos" : (METHOD_STYLE[f]?.label ?? f)}
            </button>
          ))}
          <span className="ml-auto font-body text-xs text-outline">
            {visible.length} registro{visible.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              <th className={TH}>#</th>
              <th className={TH}>Usuario</th>
              <th className={TH}>Curso</th>
              <th className={TH}>Método</th>
              <th className={TH}>Estado</th>
              <th className={TH}>Precio</th>
              <th className={TH}>Comprobante / TX</th>
              <th className={TH}>Fecha</th>
              <th className={TH}></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((e) => {
              const statusStyle = STATUS_STYLE[e.payment_status ?? "pending"] ?? STATUS_STYLE.pending;
              const methodStyle = METHOD_STYLE[e.payment_method] ?? METHOD_STYLE.mercadopago;
              const u = e.user_profiles;
              const displayName = u
                ? ([u.nombre, u.apellidos].filter(Boolean).join(" ").trim() || u.email || `#${e.id}`)
                : `#${e.id}`;
              const canReview =
                (e.payment_method === "token" || e.payment_method === "bank") &&
                e.payment_status === "pending";
              const isOpen = actionId === e.id;

              return (
                <Fragment key={e.id}>
                  <tr
                    className="border-t border-surface-container-high bg-surface-container hover:bg-surface-container-high/50 transition-colors"
                  >
                    {/* # */}
                    <td className={`${TD} font-mono text-xs text-outline`}>{e.id}</td>

                    {/* Usuario */}
                    <td className={TD}>
                      <p className="font-body text-sm text-on-background leading-tight">{displayName}</p>
                      <p className="font-body text-[10px] text-outline truncate max-w-[160px]">{u?.email ?? "—"}</p>
                      {u?.tipo_documento && u?.numero_documento && (
                        <p className="font-body text-[10px] text-outline/70">{u.tipo_documento} {u.numero_documento}</p>
                      )}
                      {u?.comfenalco_afiliado && (
                        <span className="font-headline font-black text-[9px] bg-secondary-container text-white px-1.5 py-0.5 uppercase">
                          Comfenalco
                        </span>
                      )}
                    </td>

                    {/* Curso */}
                    <td className={TD}>
                      <p className="font-headline font-bold text-sm text-on-background leading-tight">{e.courses?.name ?? "—"}</p>
                      <p className="font-body text-[10px] text-outline">{e.courses?.category ?? ""}</p>
                    </td>

                    {/* Método */}
                    <td className={TD}>
                      <span className={`font-headline text-[10px] px-2 py-0.5 uppercase whitespace-nowrap ${methodStyle.bg}`}>
                        {methodStyle.label}
                      </span>
                      {e.payment_method === "bank" && e.bank_accounts && (
                        <p className="font-body text-[10px] text-outline mt-1">{e.bank_accounts.bank_name}</p>
                      )}
                    </td>

                    {/* Estado */}
                    <td className={TD}>
                      <span className={`font-headline font-black text-[10px] px-2 py-0.5 uppercase whitespace-nowrap ${statusStyle.bg}`}>
                        {statusStyle.label}
                      </span>
                      {e.payment_status === "rejected" && e.rejection_reason && (
                        <p className="font-body text-[10px] text-error italic mt-1 max-w-[140px] line-clamp-2">{e.rejection_reason}</p>
                      )}
                    </td>

                    {/* Precio */}
                    <td className={TD}>
                      <p className="font-headline font-black text-sm text-on-background whitespace-nowrap">{formatCop(e.final_price_cop)}</p>
                      {(e.discount_pct_applied ?? 0) > 0 && (
                        <p className="font-headline text-[10px] text-primary">-{e.discount_pct_applied}%</p>
                      )}
                    </td>

                    {/* Comprobante / TX */}
                    <td className={TD}>
                      {e.payment_method === "token" && e.tx_hash ? (
                        <a
                          href={`${BASESCAN}${e.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-primary hover:underline whitespace-nowrap"
                        >
                          {e.tx_hash.slice(0, 8)}…{e.tx_hash.slice(-6)}
                        </a>
                      ) : e.payment_method === "bank" && e.comprobante_url ? (
                        <a
                          href={e.comprobante_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-headline font-bold text-xs text-primary hover:underline flex items-center gap-1 whitespace-nowrap"
                        >
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                          Ver
                        </a>
                      ) : e.payment_method === "mercadopago" && e.mp_payment_id ? (
                        <span className="font-mono text-[10px] text-outline">MP #{e.mp_payment_id}</span>
                      ) : (
                        <span className="text-outline text-xs">—</span>
                      )}
                      {e.payment_status === "approved" && e.approved_tx_hash && (
                        <a
                          href={`${BASESCAN}${e.approved_tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[10px] text-outline hover:text-primary block mt-1 whitespace-nowrap"
                        >
                          Aprobación: {e.approved_tx_hash.slice(0, 8)}…
                        </a>
                      )}
                    </td>

                    {/* Fecha */}
                    <td className={`${TD} font-body text-xs text-outline whitespace-nowrap`}>
                      {e.created_at
                        ? new Date(e.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                    </td>

                    {/* Acciones */}
                    <td className={TD}>
                      {canReview && (
                        <button
                          onClick={() => openAction(e)}
                          className="font-headline font-bold text-xs uppercase text-outline hover:text-on-surface transition-colors flex items-center gap-1 whitespace-nowrap"
                        >
                          <span className="material-symbols-outlined text-sm">rate_review</span>
                          Revisar
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Inline action panel */}
                  {isOpen && canReview && (
                    <tr className="bg-surface-container-low border-t border-tertiary/30">
                      <td colSpan={9} className="px-4 py-4">
                        <div className="flex flex-wrap gap-4 items-start">
                          {e.payment_method === "bank" && (
                            <div className="flex-1 min-w-[200px]">
                              <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">
                                TX de aprobación <span className="font-normal normal-case text-outline/50">(opcional)</span>
                              </label>
                              <input
                                value={approvedTxHash}
                                onChange={(ev) => setApprovedTxHash(ev.target.value)}
                                placeholder="0x…"
                                className="w-full bg-surface-container-lowest p-2.5 font-mono text-xs border-none focus:outline-none"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-[200px]">
                            <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">
                              Motivo de rechazo <span className="font-normal normal-case text-outline/50">(solo si rechazas)</span>
                            </label>
                            <input
                              value={rejectionReason}
                              onChange={(ev) => setRejectionReason(ev.target.value)}
                              placeholder="Ej: Comprobante ilegible…"
                              className="w-full bg-surface-container-lowest p-2.5 font-body text-sm border-none focus:outline-none"
                            />
                          </div>
                          <div className="flex items-end gap-2 flex-wrap pb-0.5">
                            {err && <p className="w-full font-body text-xs text-error">{err}</p>}
                            <button
                              onClick={() => doAction(e.id, "approve")}
                              disabled={saving}
                              className="bg-tertiary text-white font-headline font-black text-xs uppercase px-5 py-2.5 disabled:opacity-50 flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                              {saving ? "Procesando…" : "Aprobar"}
                            </button>
                            <button
                              onClick={() => doAction(e.id, "reject")}
                              disabled={saving || !rejectionReason.trim()}
                              className="bg-error text-white font-headline font-black text-xs uppercase px-5 py-2.5 disabled:opacity-50 flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                              Rechazar
                            </button>
                            <button
                              onClick={() => setActionId(null)}
                              className="bg-surface-container-high text-on-surface font-headline font-black text-xs uppercase px-4 py-2.5"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>

        {visible.length === 0 && (
          <p className="text-outline font-body text-center py-12">Sin inscripciones.</p>
        )}
      </div>
    </div>
  );
}
