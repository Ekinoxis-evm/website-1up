"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import type { PassOrderStatus } from "@/types/database.types";

type Order = {
  id: number;
  status: PassOrderStatus;
  payment_method: string;
  wallet_address: string;
  tx_hash: string | null;
  comprobante_url: string | null;
  token_amount_paid: number;
  token_price_at_purchase: number;
  duration_days: number;
  paid_at: string | null;
  expires_at: string | null;
  block_number: number | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  user_profiles: { nombre: string | null; apellidos: string | null; email: string | null; username: string | null } | null;
  bank_accounts: { bank_name: string; account_type: string | null; account_number: string; holder_name: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending_tx:         "Pendiente TX",
  confirmed:          "Confirmado",
  failed:             "Fallido/Rechazado",
  expired_unverified: "No Verificado",
  pending_bank:       "Pendiente Banco",
};

const STATUS_COLORS: Record<string, string> = {
  pending_tx:         "bg-outline/10 text-outline",
  confirmed:          "bg-tertiary/20 text-tertiary",
  failed:             "bg-error/20 text-error",
  expired_unverified: "bg-outline/10 text-on-surface/40",
  pending_bank:       "bg-secondary-container/40 text-secondary",
};

const BASESCAN = "https://basescan.org/tx/";

interface Props { orders: Order[] }

function userName(o: Order) {
  const u = o.user_profiles;
  return u
    ? [u.nombre, u.apellidos].filter(Boolean).join(" ") || u.username || u.email || `#${o.id}`
    : `#${o.id}`;
}

export function AdminPassOrdersClient({ orders }: Props) {
  const { getAccessToken } = usePrivy();
  const router = useRouter();

  const [tab, setTab]               = useState<"token" | "banco">("token");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionId, setActionId]     = useState<number | null>(null);
  const [notes, setNotes]           = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState("");

  const tokenOrders = orders.filter((o) => o.payment_method === "token");
  const bancoOrders = orders.filter((o) => o.payment_method === "bank");
  const activeList  = tab === "token" ? tokenOrders : bancoOrders;

  const filtered = statusFilter === "all"
    ? activeList
    : activeList.filter((o) => o.status === statusFilter);

  const confirmedCount = orders.filter((o) => o.status === "confirmed").length;
  const activeNow      = orders.filter(
    (o) => o.status === "confirmed" && o.expires_at && new Date(o.expires_at) > new Date()
  ).length;
  const pendingBanco   = bancoOrders.filter((o) => o.status === "pending_bank").length;

  async function saveNotes(id: number) {
    setSaving(true); setErr("");
    const token = await getAccessToken();
    const res = await fetch("/api/admin/pass-orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, adminNotes: notes }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setErr(d.error ?? "Error al guardar."); return; }
    setActionId(null);
    router.refresh();
  }

  async function doAction(id: number, action: "approve" | "reject") {
    setSaving(true); setErr("");
    const token = await getAccessToken();
    const res = await fetch("/api/admin/pass-orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, action, adminNotes: notes || undefined, rejectionReason: rejectionReason || undefined }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setErr(d.error ?? "Error"); return; }
    setActionId(null); setNotes(""); setRejectionReason("");
    router.refresh();
  }

  function openAction(o: Order) {
    setActionId(actionId === o.id ? null : o.id);
    setNotes(o.admin_notes ?? "");
    setRejectionReason("");
    setErr("");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
          ÓRDENES <span className="text-primary-container">1UP PASS</span>
        </h1>
        <div className="h-1 w-16 bg-primary-container mt-2" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container p-5 border-l-4 border-primary-container">
          <p className="font-headline text-xs uppercase tracking-widest text-outline mb-1">Total Órdenes</p>
          <p className="font-headline font-black text-4xl">{orders.length}</p>
        </div>
        <div className="bg-surface-container p-5 border-l-4 border-tertiary">
          <p className="font-headline text-xs uppercase tracking-widest text-outline mb-1">Confirmadas</p>
          <p className="font-headline font-black text-4xl text-tertiary">{confirmedCount}</p>
        </div>
        <div className="bg-surface-container p-5 border-l-4 border-primary-container">
          <p className="font-headline text-xs uppercase tracking-widest text-outline mb-1">Activos Ahora</p>
          <p className="font-headline font-black text-4xl">{activeNow}</p>
        </div>
        <div className="bg-surface-container p-5 border-l-4 border-secondary-container">
          <p className="font-headline text-xs uppercase tracking-widest text-outline mb-1">Pendiente Banco</p>
          <p className={`font-headline font-black text-4xl ${pendingBanco > 0 ? "text-secondary" : ""}`}>
            {pendingBanco}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0">
        {(["token", "banco"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setStatusFilter("all"); setActionId(null); }}
            className={`px-6 py-2 font-headline font-black text-xs uppercase tracking-widest transition-colors ${
              tab === t
                ? "bg-primary-container text-white"
                : "bg-surface-container-high text-on-surface/60 hover:text-on-surface"
            }`}
          >
            {t === "token"
              ? `Token $1UP (${tokenOrders.length})`
              : `Banco (${bancoOrders.length})${pendingBanco > 0 ? ` · ${pendingBanco} pendientes` : ""}`}
          </button>
        ))}
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {["all",
          ...(tab === "token"
            ? ["confirmed", "pending_tx", "failed", "expired_unverified"]
            : ["pending_bank", "confirmed", "failed"])
        ].map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`font-headline font-bold text-xs uppercase tracking-wider px-4 py-1.5 transition-colors ${
              statusFilter === f
                ? "bg-primary-container text-white"
                : "bg-surface-container text-on-surface/60 hover:text-on-surface"
            }`}
          >
            {f === "all" ? "Todos" : STATUS_LABELS[f] ?? f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="font-body text-sm text-outline py-8 text-center">Sin órdenes.</p>
        )}

        {filtered.map((o) => {
          const name    = userName(o);
          const isOpen  = actionId === o.id;
          const isExpired = o.expires_at ? new Date(o.expires_at) < new Date() : true;

          return (
            <div key={o.id} className="bg-surface-container p-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-start">

                {/* Status + user */}
                <div className="col-span-2 md:col-span-1">
                  <div className="flex flex-wrap gap-1 mb-1">
                    <span className={`font-headline text-[10px] px-2 py-0.5 uppercase ${STATUS_COLORS[o.status] ?? ""}`}>
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                    {o.status === "confirmed" && (
                      <span className={`font-headline text-[10px] px-2 py-0.5 uppercase ${isExpired ? "bg-error/10 text-error" : "bg-primary-container/20 text-primary"}`}>
                        {isExpired ? "Expirado" : "Activo"}
                      </span>
                    )}
                  </div>
                  <p className="font-body text-sm text-on-background">{name}</p>
                  {o.user_profiles?.email && (
                    <p className="font-body text-xs text-outline truncate">{o.user_profiles.email}</p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <p className="text-[10px] font-headline uppercase text-outline mb-0.5">Pagado</p>
                  <p className="font-headline font-black">
                    {o.token_amount_paid.toLocaleString()} <span className="text-xs text-outline">$1UP</span>
                  </p>
                  <p className="font-body text-xs text-outline">{o.duration_days} días</p>
                </div>

                {/* Expiry */}
                <div>
                  <p className="text-[10px] font-headline uppercase text-outline mb-0.5">Vence</p>
                  <p className="font-body text-sm text-on-background/80">
                    {o.expires_at ? new Date(o.expires_at).toLocaleDateString("es-CO") : "—"}
                  </p>
                </div>

                {/* TX hash (token) or Bank + Comprobante (banco) */}
                {tab === "token" ? (
                  <div>
                    <p className="text-[10px] font-headline uppercase text-outline mb-0.5">TX</p>
                    {o.tx_hash ? (
                      <a
                        href={`${BASESCAN}${o.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {o.tx_hash.slice(0, 10)}…{o.tx_hash.slice(-6)}
                      </a>
                    ) : (
                      <span className="font-body text-xs text-outline">—</span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-[10px] font-headline uppercase text-outline">Banco</p>
                    {o.bank_accounts ? (
                      <p className="font-body text-xs">{o.bank_accounts.bank_name} · {o.bank_accounts.account_number}</p>
                    ) : <p className="font-body text-xs text-outline">—</p>}
                    {o.comprobante_url && (
                      <a
                        href={o.comprobante_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-headline font-bold text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                        Comprobante
                      </a>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-start justify-end">
                  {tab === "banco" && o.status === "pending_bank" ? (
                    <button
                      onClick={() => openAction(o)}
                      className="font-headline font-bold text-xs uppercase text-outline hover:text-on-surface transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">rate_review</span>
                      Revisar
                    </button>
                  ) : (
                    <button
                      onClick={() => openAction(o)}
                      className="font-headline font-bold text-xs uppercase text-outline hover:text-on-surface transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">edit_note</span>
                      Notas
                    </button>
                  )}
                </div>
              </div>

              {/* Rejection reason */}
              {o.status === "failed" && o.rejection_reason && (
                <p className="font-body text-xs text-error italic">Rechazo: {o.rejection_reason}</p>
              )}

              {/* Expandable action panel */}
              {isOpen && (
                <div className="space-y-3 pt-3 border-t border-surface-container-high">
                  <div>
                    <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">
                      Notas internas
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Notas opcionales…"
                      className="w-full bg-surface-container-lowest p-3 font-body text-sm border-none resize-none focus:outline-none"
                    />
                  </div>

                  {tab === "banco" && o.status === "pending_bank" && (
                    <div>
                      <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">
                        Motivo de rechazo <span className="font-normal normal-case text-outline/50">(solo si rechazas)</span>
                      </label>
                      <input
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Ej: Monto incorrecto, comprobante ilegible…"
                        className="w-full bg-surface-container-lowest p-3 font-body text-sm border-none focus:outline-none"
                      />
                    </div>
                  )}

                  {err && <p className="font-body text-xs text-error">{err}</p>}

                  <div className="flex gap-2 flex-wrap">
                    {tab === "banco" && o.status === "pending_bank" ? (
                      <>
                        <button
                          onClick={() => doAction(o.id, "approve")}
                          disabled={saving}
                          className="bg-tertiary text-white font-headline font-black text-xs uppercase px-5 py-2.5 disabled:opacity-50 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          {saving ? "Procesando…" : "Aprobar"}
                        </button>
                        <button
                          onClick={() => doAction(o.id, "reject")}
                          disabled={saving || !rejectionReason.trim()}
                          className="bg-error text-white font-headline font-black text-xs uppercase px-5 py-2.5 disabled:opacity-50 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                          Rechazar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => saveNotes(o.id)}
                        disabled={saving}
                        className="bg-primary-container text-white font-headline font-black text-xs uppercase px-4 py-2 disabled:opacity-50"
                      >
                        {saving ? "Guardando…" : "Guardar"}
                      </button>
                    )}
                    <button
                      onClick={() => setActionId(null)}
                      className="bg-surface-container-high text-on-surface font-headline font-black text-xs uppercase px-4 py-2"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {!isOpen && o.admin_notes && (
                <p className="font-body text-xs text-outline/70 italic">{o.admin_notes}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
