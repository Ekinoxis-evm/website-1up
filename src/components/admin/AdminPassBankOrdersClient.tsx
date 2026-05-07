"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

type BankPassOrder = {
  id: number;
  status: string;
  wallet_address: string;
  comprobante_url: string | null;
  token_amount_paid: number;
  duration_days: number;
  expires_at: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  user_profiles: { nombre: string | null; apellidos: string | null; email: string | null; username: string | null } | null;
  bank_accounts: { bank_name: string; account_type: string | null; account_number: string; holder_name: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending_bank: "Pendiente",
  confirmed:    "Aprobado",
  failed:       "Rechazado",
};
const STATUS_COLOR: Record<string, string> = {
  pending_bank: "bg-secondary-container/40 text-secondary",
  confirmed:    "bg-tertiary/20 text-tertiary",
  failed:       "bg-error/20 text-error",
};

interface Props { orders: BankPassOrder[] }

export function AdminPassBankOrdersClient({ orders }: Props) {
  const { getAccessToken } = usePrivy();
  const router = useRouter();

  const [filter, setFilter]           = useState<"all" | "pending_bank" | "confirmed" | "failed">("all");
  const [actionId, setActionId]       = useState<number | null>(null);
  const [notes, setNotes]             = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [saving, setSaving]           = useState(false);
  const [err, setErr]                 = useState("");

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const pending  = orders.filter((o) => o.status === "pending_bank").length;

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
          PASS <span className="text-primary-container">TRANSFERENCIAS</span>
        </h1>
        <div className="h-1 w-16 bg-primary-container mt-2" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-container p-5 border-l-4 border-secondary-container">
          <p className="font-headline text-xs uppercase tracking-widest text-outline mb-1">Pendientes</p>
          <p className="font-headline font-black text-4xl text-secondary">{pending}</p>
        </div>
        <div className="bg-surface-container p-5 border-l-4 border-tertiary">
          <p className="font-headline text-xs uppercase tracking-widest text-outline mb-1">Aprobadas</p>
          <p className="font-headline font-black text-4xl text-tertiary">
            {orders.filter((o) => o.status === "confirmed").length}
          </p>
        </div>
        <div className="bg-surface-container p-5 border-l-4 border-error">
          <p className="font-headline text-xs uppercase tracking-widest text-outline mb-1">Rechazadas</p>
          <p className="font-headline font-black text-4xl text-error">
            {orders.filter((o) => o.status === "failed").length}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "pending_bank", "confirmed", "failed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`font-headline font-bold text-xs uppercase tracking-wider px-4 py-1.5 transition-colors ${
              filter === f ? "bg-primary-container text-white" : "bg-surface-container text-on-surface/60 hover:text-on-surface"
            }`}
          >
            {f === "all" ? "Todas" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="font-body text-sm text-outline py-8 text-center">Sin órdenes.</p>
        )}
        {filtered.map((o) => {
          const user = o.user_profiles;
          const userName = user
            ? [user.nombre, user.apellidos].filter(Boolean).join(" ") || user.username || user.email || `#${o.id}`
            : `#${o.id}`;
          const isOpen = actionId === o.id;

          return (
            <div key={o.id} className="bg-surface-container p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-start">
                {/* Status + user */}
                <div className="col-span-2 md:col-span-1">
                  <span className={`font-headline text-[10px] px-2 py-0.5 uppercase ${STATUS_COLOR[o.status] ?? ""}`}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                  <p className="font-body text-sm mt-1">{userName}</p>
                  <p className="font-body text-xs text-outline">{user?.email ?? "—"}</p>
                </div>

                {/* Pass info */}
                <div>
                  <p className="text-[10px] font-headline uppercase text-outline mb-0.5">Pass</p>
                  <p className="font-headline font-black">{o.token_amount_paid.toLocaleString()} <span className="text-xs text-outline">$1UP</span></p>
                  <p className="font-body text-xs text-outline">{o.duration_days} días</p>
                </div>

                {/* Bank */}
                <div>
                  <p className="text-[10px] font-headline uppercase text-outline mb-0.5">Banco</p>
                  {o.bank_accounts ? (
                    <>
                      <p className="font-body text-sm">{o.bank_accounts.bank_name}</p>
                      <p className="font-body text-xs text-outline">{o.bank_accounts.account_number}</p>
                    </>
                  ) : <p className="font-body text-xs text-outline">—</p>}
                </div>

                {/* Comprobante */}
                <div>
                  <p className="text-[10px] font-headline uppercase text-outline mb-0.5">Comprobante</p>
                  {o.comprobante_url ? (
                    <a
                      href={o.comprobante_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-headline font-bold text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      Ver archivo
                    </a>
                  ) : <p className="font-body text-xs text-outline">—</p>}
                </div>

                {/* Actions */}
                <div className="flex items-start justify-end gap-2">
                  {o.status === "pending_bank" && (
                    <button
                      onClick={() => { setActionId(isOpen ? null : o.id); setNotes(""); setRejectionReason(""); setErr(""); }}
                      className="font-headline font-bold text-xs uppercase text-outline hover:text-on-surface transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">rate_review</span>
                      Revisar
                    </button>
                  )}
                </div>
              </div>

              {/* Rejection reason shown on rejected orders */}
              {o.status === "failed" && o.rejection_reason && (
                <p className="font-body text-xs text-error italic">
                  Rechazo: {o.rejection_reason}
                </p>
              )}

              {/* Review panel */}
              {isOpen && o.status === "pending_bank" && (
                <div className="space-y-3 pt-3 border-t border-surface-container-high">
                  <div>
                    <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">Notas internas</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Notas opcionales…"
                      className="w-full bg-surface-container-lowest p-3 font-body text-sm border-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">
                      Motivo de rechazo <span className="text-outline/50 font-normal normal-case">(solo si rechazas)</span>
                    </label>
                    <input
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Ej: Monto incorrecto, comprobante ilegible…"
                      className="w-full bg-surface-container-lowest p-3 font-body text-sm border-none"
                    />
                  </div>
                  {err && <p className="font-body text-xs text-error">{err}</p>}
                  <div className="flex gap-2">
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
                    <button
                      onClick={() => setActionId(null)}
                      className="bg-surface-container-high text-on-surface font-headline font-black text-xs uppercase px-4 py-2.5"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {o.admin_notes && (
                <p className="font-body text-xs text-outline/70 italic">{o.admin_notes}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
