"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import type { Tables } from "@/types/database.types";
import { useAdminToast } from "@/components/admin/ui/Toast";
import { PAYMENT_METHODS, METHOD_META, type PaymentMethod } from "@/lib/payments/methodRegistry";
import { ORDER_KIND_META, type OrderKind } from "@/lib/payments/orderKind";

type ServicePaymentMethods = Tables<"service_payment_methods">;

const METHOD_TO_COLUMN: Record<PaymentMethod, keyof ServicePaymentMethods> = {
  token: "token_enabled",
  wire:  "wire_enabled",
  cash:  "cash_enabled",
  card:  "card_enabled",
};

export function AdminPaymentMethodsClient({ rows }: { rows: ServicePaymentMethods[] }) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const { showError, showSuccess } = useAdminToast();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function toggle(row: ServicePaymentMethods, method: PaymentMethod) {
    const key = `${row.service}:${method}`;
    setSavingKey(key);

    const next = {
      tokenEnabled: row.token_enabled,
      wireEnabled:  row.wire_enabled,
      cashEnabled:  row.cash_enabled,
      cardEnabled:  row.card_enabled,
    };
    const flag = (
      { token: "tokenEnabled", wire: "wireEnabled", cash: "cashEnabled", card: "cardEnabled" } as const
    )[method];
    next[flag] = !row[METHOD_TO_COLUMN[method]];

    try {
      const token = await getAccessToken();
      const res = await fetch("/api/admin/service-payment-methods", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ service: row.service, ...next }),
      });
      if (!res.ok) {
        showError("No se pudo actualizar el método de pago.");
        setSavingKey(null);
        return;
      }
      showSuccess("Método actualizado.");
      setSavingKey(null);
      router.refresh();
    } catch {
      showError("No se pudo actualizar el método de pago.");
      setSavingKey(null);
    }
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-10 max-w-4xl">
      <header className="mb-8">
        <h1 className="font-headline font-black text-4xl uppercase tracking-tighter">
          MÉTODOS DE <span className="text-primary-container">PAGO</span>
        </h1>
        <div className="h-1 w-20 bg-primary-container mt-2" />
        <p className="font-body text-sm text-on-surface-variant mt-4 max-w-2xl">
          Define qué métodos de pago acepta cada servicio. <span className="text-on-surface">$1UP y
          transferencia</span> ya operan en el flujo de compra. <span className="text-on-surface">Efectivo</span>{" "}
          (registro manual desde el panel) y <span className="text-on-surface">tarjeta / Apple Pay</span>{" "}
          se habilitan progresivamente — al activarlos aquí quedan preconfigurados.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {rows.map((row) => (
          <section key={row.service} className="bg-surface-container p-5">
            <div className="mb-4">
              <h2 className="font-headline font-bold uppercase tracking-tight text-lg">
                {ORDER_KIND_META[row.service as OrderKind].label}
              </h2>
              {row.updated_by && (
                <p className="font-body text-xs text-outline mt-1">
                  Última edición por {row.updated_by}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const enabled = row[METHOD_TO_COLUMN[method]];
                const isCard = method === "card";
                const busy = savingKey === `${row.service}:${method}`;
                return (
                  <button
                    key={method}
                    type="button"
                    disabled={busy}
                    onClick={() => toggle(row, method)}
                    className={`flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors disabled:opacity-50 ${
                      enabled
                        ? "bg-primary-container/20 text-on-surface"
                        : "bg-surface-container-high text-on-surface/60 hover:bg-surface-container-highest"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="material-symbols-outlined text-base shrink-0"
                        style={enabled ? { fontVariationSettings: "'FILL' 1" } : undefined}
                      >
                        {enabled ? "check_circle" : "radio_button_unchecked"}
                      </span>
                      <span className="flex flex-col min-w-0">
                        <span className="font-headline font-bold uppercase text-xs tracking-tight truncate">
                          {METHOD_META[method].label}
                        </span>
                        {isCard && (
                          <span className="font-body text-[10px] text-outline leading-tight flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[12px]">lock</span>
                            Disponible cuando se active Stripe (PAYMENTS_CARD_LIVE)
                          </span>
                        )}
                      </span>
                    </span>
                    <span
                      className={`font-headline font-bold uppercase text-[10px] tracking-widest shrink-0 ${
                        enabled ? "text-primary" : "text-outline"
                      }`}
                    >
                      {busy ? "..." : enabled ? "Activo" : "Inactivo"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
