"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import type { TokenPurchaseOrder, TokenPurchaseStatus } from "@/types/database.types";

type OrderWithJoins = TokenPurchaseOrder & {
  user_profiles: { nombre: string | null; apellidos: string | null } | null;
  bank_accounts:  { bank_name: string; account_type: string | null; account_number: string } | null;
};

interface Props { orders: OrderWithJoins[] }

const STATUS_LABELS: Record<TokenPurchaseStatus, string> = {
  pending:   "PENDIENTE",
  approved:  "APROBADO",
  rejected:  "RECHAZADO",
  cancelled: "CANCELADO",
};

const STATUS_COLORS: Record<TokenPurchaseStatus, string> = {
  pending:   "bg-secondary-container/20 text-secondary",
  approved:  "bg-tertiary/20 text-tertiary",
  rejected:  "bg-error/20 text-error",
  cancelled: "bg-on-surface/10 text-on-surface/40",
};

const FILTERS: { label: string; value: string }[] = [
  { label: "Todos",      value: "" },
  { label: "Pendientes", value: "pending" },
  { label: "Aprobados",  value: "approved" },
  { label: "Rechazados", value: "rejected" },
  { label: "Cancelados", value: "cancelled" },
];

function formatCop(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

function truncate(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function AdminTokenOrdersClient({ orders }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [filter, setFilter] = useState("");
  const [approveModal, setApproveModal] = useState<OrderWithJoins | null>(null);
  const [rejectModal, setRejectModal]   = useState<OrderWithJoins | null>(null);
  const [txHash, setTxHash]             = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes]     = useState("");
  const [loading, setLoading]           = useState(false);
  const [actionError, setActionError]   = useState<string | null>(null);
  const [lightbox, setLightbox]         = useState<string | null>(null);
  const [copiedWallet, setCopiedWallet] = useState<number | null>(null);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  const filtered = filter ? orders.filter((o) => o.status === filter) : orders;

  const totalApprovedCop = orders.filter((o) => o.status === "approved").reduce((s, o) => s + (o.cop_amount ?? 0), 0);
  const totalApproved1up = orders.filter((o) => o.status === "approved").reduce((s, o) => s + parseFloat(String(o.token_amount ?? 0)), 0);
  const pendingCount     = orders.filter((o) => o.status === "pending").length;

  async function handleApprove() {
    if (!approveModal || !txHash.trim()) return;
    setLoading(true); setActionError(null);
    const res = await fetch("/api/admin/token-orders", {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify({ id: approveModal.id, action: "approve", txHash: txHash.trim(), adminNotes: adminNotes.trim() }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setActionError(d.error ?? "Error al aprobar");
      setLoading(false); return;
    }
    setApproveModal(null); setTxHash(""); setAdminNotes(""); setLoading(false); router.refresh();
  }

  async function handleReject() {
    if (!rejectModal || !rejectionReason.trim()) return;
    setLoading(true); setActionError(null);
    const res = await fetch("/api/admin/token-orders", {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify({ id: rejectModal.id, action: "reject", rejectionReason: rejectionReason.trim(), adminNotes: adminNotes.trim() }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setActionError(d.error ?? "Error al rechazar");
      setLoading(false); return;
    }
    setRejectModal(null); setRejectionReason(""); setAdminNotes(""); setLoading(false); router.refresh();
  }

  function copyWallet(id: number, addr: string) {
    navigator.clipboard.writeText(addr);
    setCopiedWallet(id);
    setTimeout(() => setCopiedWallet(null), 1800);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
            ÓRDENES <span className="text-primary-container">$1UP</span>
          </h1>
          <div className="h-1 w-16 bg-primary-container mt-2" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-container border-l-4 border-tertiary p-4">
          <p className="font-headline text-[10px] uppercase tracking-widest text-on-surface/50">COP Aprobado</p>
          <p className="font-headline font-black text-xl text-tertiary">{formatCop(totalApprovedCop)}</p>
        </div>
        <div className="bg-surface-container border-l-4 border-secondary-container p-4">
          <p className="font-headline text-[10px] uppercase tracking-widest text-on-surface/50">$1UP Aprobados</p>
          <p className="font-headline font-black text-xl text-secondary">{totalApproved1up.toLocaleString()} 1UP</p>
        </div>
        <div className="bg-surface-container border-l-4 border-primary-container p-4">
          <p className="font-headline text-[10px] uppercase tracking-widest text-on-surface/50">Pendientes</p>
          <p className="font-headline font-black text-xl text-primary-container">{pendingCount}</p>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`font-headline font-bold text-xs uppercase px-4 py-2 transition-colors ${
              filter === f.value
                ? "bg-primary-container text-white"
                : "bg-surface-container text-on-surface/60 hover:bg-surface-container-high"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-container-highest">
              <th className="px-4 py-3 text-left font-headline text-[10px] uppercase tracking-widest text-on-surface/50">#</th>
              <th className="px-4 py-3 text-left font-headline text-[10px] uppercase tracking-widest text-on-surface/50">Usuario</th>
              <th className="px-4 py-3 text-left font-headline text-[10px] uppercase tracking-widest text-on-surface/50">Wallet</th>
              <th className="px-4 py-3 text-right font-headline text-[10px] uppercase tracking-widest text-on-surface/50">COP</th>
              <th className="px-4 py-3 text-right font-headline text-[10px] uppercase tracking-widest text-on-surface/50">1UP</th>
              <th className="px-4 py-3 text-left font-headline text-[10px] uppercase tracking-widest text-on-surface/50">Banco</th>
              <th className="px-4 py-3 text-left font-headline text-[10px] uppercase tracking-widest text-on-surface/50">Comprobante</th>
              <th className="px-4 py-3 text-left font-headline text-[10px] uppercase tracking-widest text-on-surface/50">Estado</th>
              <th className="px-4 py-3 text-left font-headline text-[10px] uppercase tracking-widest text-on-surface/50">Fecha</th>
              <th className="px-4 py-3 text-left font-headline text-[10px] uppercase tracking-widest text-on-surface/50">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr key={order.id} className="border-t border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-on-surface/50">#{order.id}</td>
                <td className="px-4 py-3">
                  <p className="font-headline font-bold text-xs text-on-surface">{order.nombre}</p>
                  <p className="font-body text-[10px] text-on-surface/40">{order.email}</p>
                  {order.celular_contacto && (
                    <p className="font-body text-[10px] text-on-surface/40">{order.celular_contacto}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => copyWallet(order.id, order.wallet_address)}
                    className="flex items-center gap-1 font-mono text-[10px] text-secondary hover:text-secondary-container transition-colors"
                  >
                    {truncate(order.wallet_address)}
                    <span className="material-symbols-outlined text-[10px]">
                      {copiedWallet === order.id ? "check" : "content_copy"}
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3 text-right font-headline font-bold text-xs text-on-surface">
                  {formatCop(order.cop_amount ?? 0)}
                </td>
                <td className="px-4 py-3 text-right font-headline font-bold text-xs text-tertiary">
                  {parseFloat(String(order.token_amount ?? 0)).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {order.bank_accounts ? (
                    <div>
                      <p className="font-headline text-xs text-on-surface">{order.bank_accounts.bank_name}</p>
                      <p className="font-body text-[10px] text-on-surface/40">{order.bank_accounts.account_type}</p>
                    </div>
                  ) : (
                    <span className="text-on-surface/30 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {order.comprobante_url ? (
                    <button
                      onClick={() => setLightbox(order.comprobante_url!)}
                      className="w-12 h-12 overflow-hidden bg-surface-container-highest flex items-center justify-center group"
                    >
                      {order.comprobante_url.includes(".pdf") ? (
                        <span className="material-symbols-outlined text-xl text-on-surface/40 group-hover:text-primary transition-colors">picture_as_pdf</span>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={order.comprobante_url} alt="comprobante" className="w-full h-full object-cover" />
                      )}
                    </button>
                  ) : (
                    <span className="text-on-surface/30 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-headline font-bold text-[10px] uppercase px-2 py-1 ${STATUS_COLORS[order.status as TokenPurchaseStatus]}`}>
                    {STATUS_LABELS[order.status as TokenPurchaseStatus]}
                  </span>
                  {order.approved_tx_hash && (
                    <a
                      href={`https://basescan.org/tx/${order.approved_tx_hash}`}
                      target="_blank" rel="noopener noreferrer"
                      className="block font-mono text-[10px] text-tertiary/60 hover:text-tertiary mt-1"
                    >
                      {truncate(order.approved_tx_hash)}
                    </a>
                  )}
                  {order.rejection_reason && (
                    <p className="font-body text-[10px] text-error/70 mt-0.5">{order.rejection_reason}</p>
                  )}
                </td>
                <td className="px-4 py-3 font-body text-[10px] text-on-surface/40">
                  {new Date(order.created_at!).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-3">
                  {order.status === "pending" && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => { setApproveModal(order); setTxHash(""); setAdminNotes(""); setActionError(null); }}
                        className="bg-tertiary/20 text-tertiary font-headline font-bold text-[10px] uppercase px-3 py-1.5 hover:bg-tertiary/30 transition-colors"
                      >
                        APROBAR
                      </button>
                      <button
                        onClick={() => { setRejectModal(order); setRejectionReason(""); setAdminNotes(""); setActionError(null); }}
                        className="bg-error/10 text-error font-headline font-bold text-[10px] uppercase px-3 py-1.5 hover:bg-error/20 transition-colors"
                      >
                        RECHAZAR
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center font-headline text-sm text-on-surface/30 uppercase">
                  No hay órdenes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Approve Modal */}
      {approveModal && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container border-4 border-tertiary p-8 w-full max-w-md">
            <h2 className="font-headline font-black text-xl uppercase mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary">check_circle</span>
              APROBAR ORDEN #{approveModal.id}
            </h2>
            <p className="font-body text-sm text-on-surface/50 mb-6">
              {approveModal.nombre} · {formatCop(approveModal.cop_amount ?? 0)} · {parseFloat(String(approveModal.token_amount ?? 0)).toLocaleString()} 1UP
            </p>
            <div className="space-y-4">
              <div>
                <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">TX Hash (Base L2) *</label>
                <input
                  value={txHash} onChange={(e) => setTxHash(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-surface-container-lowest text-on-background p-3 font-mono text-sm border-none focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">Notas (opcional)</label>
                <textarea
                  value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-surface-container-lowest text-on-background p-3 font-body text-sm border-none focus:outline-none resize-none"
                />
              </div>
            </div>
            {actionError && <p className="text-error font-body text-sm mt-3">{actionError}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={handleApprove} disabled={loading || !txHash.trim()} className="flex-1 bg-tertiary text-background font-headline font-black py-3 disabled:opacity-50">
                {loading ? "APROBANDO..." : "CONFIRMAR APROBACIÓN"}
              </button>
              <button onClick={() => setApproveModal(null)} className="flex-1 bg-surface-container-highest font-headline font-black py-3">
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container border-4 border-error p-8 w-full max-w-md">
            <h2 className="font-headline font-black text-xl uppercase mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-error">cancel</span>
              RECHAZAR ORDEN #{rejectModal.id}
            </h2>
            <p className="font-body text-sm text-on-surface/50 mb-6">
              {rejectModal.nombre} · {formatCop(rejectModal.cop_amount ?? 0)}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">Motivo de rechazo *</label>
                <textarea
                  value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  placeholder="Comprobante ilegible / monto incorrecto / ..."
                  className="w-full bg-surface-container-lowest text-on-background p-3 font-body text-sm border-none focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">Notas internas (opcional)</label>
                <textarea
                  value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-surface-container-lowest text-on-background p-3 font-body text-sm border-none focus:outline-none resize-none"
                />
              </div>
            </div>
            {actionError && <p className="text-error font-body text-sm mt-3">{actionError}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={handleReject} disabled={loading || !rejectionReason.trim()} className="flex-1 bg-error text-white font-headline font-black py-3 disabled:opacity-50">
                {loading ? "RECHAZANDO..." : "CONFIRMAR RECHAZO"}
              </button>
              <button onClick={() => setRejectModal(null)} className="flex-1 bg-surface-container-highest font-headline font-black py-3">
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-background/90 flex items-center justify-center z-50 p-4 cursor-pointer"
          onClick={() => setLightbox(null)}
        >
          {lightbox.includes(".pdf") ? (
            <a href={lightbox} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="bg-surface-container p-6 text-center">
              <span className="material-symbols-outlined text-5xl text-primary-container">picture_as_pdf</span>
              <p className="font-headline text-sm uppercase mt-2 text-on-surface">Abrir PDF</p>
            </a>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lightbox} alt="comprobante" className="max-w-2xl max-h-[80vh] object-contain" onClick={(e) => e.stopPropagation()} />
          )}
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 bg-surface-container-highest p-2 font-headline text-xs uppercase"
          >
            CERRAR
          </button>
        </div>
      )}
    </div>
  );
}
