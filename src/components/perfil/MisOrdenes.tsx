"use client";

import { useState, useEffect } from "react";
import type { TokenPurchaseStatus } from "@/types/database.types";

type Order = {
  id: number;
  cop_amount: number;
  token_amount: string | number;
  status: TokenPurchaseStatus;
  created_at: string;
  bank_accounts: { bank_name: string } | null;
};

interface Props {
  getAccessToken: () => Promise<string | null>;
}

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

function formatCop(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

export function MisOrdenes({ getAccessToken }: Props) {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<number | null>(null);

  async function authHeader(): Promise<Record<string, string>> {
    const token = await getAccessToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  async function loadOrders() {
    setLoading(true);
    const res = await fetch("/api/user/token-orders", { headers: await authHeader() }).catch(() => null);
    if (!res?.ok) { setLoading(false); return; }
    const data = await res.json() as Order[];
    setOrders(data.slice(0, 10));
    setLoading(false);
  }

  useEffect(() => { loadOrders(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function handleCancel(id: number) {
    if (!confirm("¿Cancelar esta orden?")) return;
    setCancelling(id);
    const token = await getAccessToken();
    await fetch("/api/user/token-orders/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ id }),
    });
    setCancelling(null);
    loadOrders();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="material-symbols-outlined text-primary text-2xl animate-spin">refresh</span>
      </div>
    );
  }

  if (orders.length === 0) return null;

  return (
    <div className="bg-surface-container-low border-t-8 border-primary-container/30">
      <div className="p-6">
        <h3 className="font-headline font-bold text-base uppercase tracking-wider text-on-surface mb-4">
          Mis Órdenes $1UP
        </h3>
        <div className="space-y-2">
          {orders.map((order) => (
            <div key={order.id} className="bg-surface-container p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-headline font-black text-sm text-on-surface">
                    {parseFloat(String(order.token_amount)).toLocaleString()} <span className="text-primary/70 text-xs font-bold">$1UP</span>
                  </span>
                  <span className="text-on-surface/30 text-xs">·</span>
                  <span className="font-body text-xs text-on-surface/60">{formatCop(order.cop_amount)}</span>
                  <span className={`font-headline font-bold text-[10px] uppercase px-2 py-0.5 ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>
                <p className="font-body text-[10px] text-on-surface/30 mt-0.5">
                  #{order.id} · {new Date(order.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                  {order.bank_accounts ? ` · ${order.bank_accounts.bank_name}` : ""}
                </p>
              </div>
              {order.status === "pending" && (
                <button
                  onClick={() => handleCancel(order.id)}
                  disabled={cancelling === order.id}
                  className="bg-error/10 text-error font-headline font-bold text-[10px] uppercase px-3 py-1.5 hover:bg-error/20 transition-colors disabled:opacity-50"
                >
                  {cancelling === order.id ? "..." : "CANCELAR"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
