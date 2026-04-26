"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import type { PassOrderStatus } from "@/types/database.types";

type Order = {
  id: number;
  status: PassOrderStatus;
  wallet_address: string;
  tx_hash: string;
  token_amount_paid: number;
  token_price_at_purchase: number;
  duration_days: number;
  paid_at: string | null;
  expires_at: string | null;
  block_number: number | null;
  admin_notes: string | null;
  created_at: string;
  user_profiles: { nombre: string | null; apellidos: string | null; email: string | null; username: string | null } | null;
};

const STATUS_LABELS: Record<PassOrderStatus, string> = {
  pending_tx:         "Pendiente",
  confirmed:          "Confirmado",
  failed:             "Fallido",
  expired_unverified: "No Verificado",
};

const STATUS_COLORS: Record<PassOrderStatus, string> = {
  pending_tx:         "bg-outline/10 text-outline",
  confirmed:          "bg-tertiary/20 text-tertiary",
  failed:             "bg-error/20 text-error",
  expired_unverified: "bg-outline/10 text-on-surface/40",
};

const FILTER_OPTIONS: { label: string; value: PassOrderStatus | "all" }[] = [
  { label: "Todos",      value: "all"               },
  { label: "Activos",    value: "confirmed"          },
  { label: "Pendiente",  value: "pending_tx"         },
  { label: "Fallidos",   value: "failed"             },
];

const BASESCAN = "https://basescan.org/tx/";

interface Props { orders: Order[] }

export function AdminPassOrdersClient({ orders }: Props) {
  const { getAccessToken } = usePrivy();
  const router = useRouter();

  const [filter, setFilter]       = useState<PassOrderStatus | "all">("all");
  const [editId, setEditId]       = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const confirmedCount = orders.filter((o) => o.status === "confirmed").length;
  const activeNow      = orders.filter(
    (o) => o.status === "confirmed" && o.expires_at && new Date(o.expires_at) > new Date()
  ).length;

  async function saveNotes(id: number) {
    setSaving(true);
    setError("");
    const token = await getAccessToken();
    const res = await fetch("/api/admin/pass-orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, adminNotes: editNotes }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Error al guardar.");
      return;
    }
    setEditId(null);
    router.refresh();
  }

  function openEdit(o: Order) {
    setEditId(o.id);
    setEditNotes(o.admin_notes ?? "");
    setError("");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
          COMPRAS <span className="text-primary-container">1UP PASS</span>
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
        <div className="bg-surface-container p-5 border-l-4 border-secondary-container">
          <p className="font-headline text-xs uppercase tracking-widest text-outline mb-1">Activos Ahora</p>
          <p className="font-headline font-black text-4xl">{activeNow}</p>
        </div>
        <div className="bg-surface-container p-5 border-l-4 border-error">
          <p className="font-headline text-xs uppercase tracking-widest text-outline mb-1">Fallidos</p>
          <p className="font-headline font-black text-4xl text-error">
            {orders.filter((o) => o.status === "failed").length}
          </p>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`font-headline font-bold text-xs uppercase tracking-wider px-4 py-1.5 transition-colors ${
              filter === f.value
                ? "bg-primary-container text-white"
                : "bg-surface-container text-on-surface/60 hover:text-on-surface"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="font-body text-sm text-outline py-8 text-center">Sin órdenes.</p>
        )}
        {filtered.map((o) => {
          const user = o.user_profiles;
          const userName = user
            ? [user.nombre, user.apellidos].filter(Boolean).join(" ") || user.username || user.email || `#${o.id}`
            : `#${o.id}`;
          const isExpired = o.expires_at ? new Date(o.expires_at) < new Date() : true;

          return (
            <div key={o.id} className="bg-surface-container p-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-start">
                {/* Status + user */}
                <div className="col-span-2 md:col-span-1">
                  <span className={`font-headline text-[10px] px-2 py-0.5 uppercase ${STATUS_COLORS[o.status]}`}>
                    {STATUS_LABELS[o.status]}
                  </span>
                  {o.status === "confirmed" && (
                    <span className={`ml-2 font-headline text-[10px] px-2 py-0.5 uppercase ${isExpired ? "bg-error/10 text-error" : "bg-primary-container/20 text-primary"}`}>
                      {isExpired ? "Expirado" : "Activo"}
                    </span>
                  )}
                  <p className="font-body text-sm text-on-background mt-1">{userName}</p>
                </div>

                {/* Amount */}
                <div>
                  <p className="text-[10px] font-headline uppercase text-outline mb-0.5">Pagado</p>
                  <p className="font-headline font-black text-on-background">
                    {o.token_amount_paid.toLocaleString()} <span className="text-xs text-outline">$1UP</span>
                  </p>
                </div>

                {/* Duration / expiry */}
                <div>
                  <p className="text-[10px] font-headline uppercase text-outline mb-0.5">Vence</p>
                  <p className="font-body text-sm text-on-background/80">
                    {o.expires_at ? new Date(o.expires_at).toLocaleDateString("es-CO") : "—"}
                  </p>
                </div>

                {/* TX hash */}
                <div>
                  <p className="text-[10px] font-headline uppercase text-outline mb-0.5">TX</p>
                  <a
                    href={`${BASESCAN}${o.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    {o.tx_hash.slice(0, 10)}…{o.tx_hash.slice(-6)}
                  </a>
                </div>

                {/* Actions */}
                <div className="flex items-start justify-end">
                  <button
                    onClick={() => openEdit(o)}
                    className="font-headline font-bold text-xs uppercase text-outline hover:text-on-surface transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">edit_note</span>
                    Notas
                  </button>
                </div>
              </div>

              {/* Admin notes */}
              {editId === o.id ? (
                <div className="space-y-2 pt-2 border-t border-surface-container-high">
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={2}
                    placeholder="Notas internas..."
                    className="w-full bg-surface-container-lowest p-3 font-body text-sm text-on-background border-none resize-none"
                  />
                  {error && <p className="font-body text-xs text-error">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveNotes(o.id)}
                      disabled={saving}
                      className="bg-primary-container text-white font-headline font-black text-xs uppercase px-4 py-2 disabled:opacity-50"
                    >
                      {saving ? "Guardando…" : "Guardar"}
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="bg-surface-container-high text-on-surface font-headline font-black text-xs uppercase px-4 py-2"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : o.admin_notes ? (
                <p className="font-body text-xs text-outline/70 pt-2 border-t border-surface-container-high italic">
                  {o.admin_notes}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
