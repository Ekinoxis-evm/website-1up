"use client";

import { useState, useEffect, useCallback } from "react";
import type { PassOrder, PassOrderStatus } from "@/types/database.types";

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

const BASESCAN = "https://basescan.org/tx/";

interface Props {
  getAccessToken: () => Promise<string | null>;
}

export function MisPassOrders({ getAccessToken }: Props) {
  const [orders, setOrders]   = useState<PassOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const token = await getAccessToken();
    const res = await fetch("/api/user/pass-orders", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setOrders(await res.json());
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <span className="material-symbols-outlined text-primary text-2xl animate-spin">refresh</span>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <p className="font-body text-sm text-on-surface/40 py-4 text-center">
        Sin historial de compras del pass.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {orders.map((o) => {
        const isExpired = o.expires_at ? new Date(o.expires_at) < new Date() : true;
        return (
          <div key={o.id} className="bg-surface-container-low p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-headline text-[10px] px-2 py-0.5 uppercase shrink-0 ${STATUS_COLORS[o.status]}`}>
                  {STATUS_LABELS[o.status]}
                </span>
                {o.status === "confirmed" && (
                  <span className={`font-headline text-[10px] px-2 py-0.5 uppercase shrink-0 ${isExpired ? "bg-error/10 text-error" : "bg-primary-container/20 text-primary"}`}>
                    {isExpired ? "Expirado" : "Activo"}
                  </span>
                )}
              </div>
              <p className="font-headline font-black">
                {o.token_amount_paid.toLocaleString()} <span className="text-xs text-outline">$1UP</span>
              </p>
              {o.expires_at && (
                <p className="font-body text-xs text-on-surface/50 mt-0.5">
                  Vence: {new Date(o.expires_at).toLocaleDateString("es-CO")}
                </p>
              )}
            </div>
            <a
              href={`${BASESCAN}${o.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-primary hover:underline shrink-0"
            >
              {o.tx_hash.slice(0, 8)}…
            </a>
          </div>
        );
      })}
    </div>
  );
}
