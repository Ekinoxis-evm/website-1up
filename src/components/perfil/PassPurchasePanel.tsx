"use client";

import { useState, useCallback, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { BuyPassWizard } from "./BuyPassWizard";
import { MisPassOrders } from "./MisPassOrders";
import type { PassConfig, PassBenefit, PassOrder } from "@/types/database.types";

interface Props {
  config:   PassConfig | null;
  benefits: PassBenefit[];
}

export function PassPurchasePanel({ config, benefits }: Props) {
  const { getAccessToken, ready, authenticated } = usePrivy();
  const { wallets } = useWallets();

  const [buyOpen, setBuyOpen]         = useState(false);
  const [activeOrder, setActiveOrder] = useState<PassOrder | null>(null);
  const [ordersKey, setOrdersKey]     = useState(0);

  const embeddedWallet  = wallets.find((w) => w.walletClientType === "privy");
  const walletAddress   = embeddedWallet?.address ?? "";
  const walletLoading   = ready && authenticated && wallets.length === 0;

  const fetchActiveOrder = useCallback(async () => {
    const token = await getAccessToken();
    const res = await fetch("/api/user/pass-orders", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const orders: PassOrder[] = await res.json();
    const active = orders.find(
      (o) => o.status === "confirmed" && o.expires_at && new Date(o.expires_at) > new Date()
    ) ?? null;
    setActiveOrder(active);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready && authenticated) fetchActiveOrder();
  }, [ready, authenticated, fetchActiveOrder]);

  function handleSuccess() {
    fetchActiveOrder();
    setOrdersKey((k) => k + 1);
  }

  const canBuy = config?.is_active && ready && authenticated;

  return (
    <div className="space-y-8">
      {/* Pass status card */}
      <div className="bg-surface-container-low border-l-8 border-primary-container p-8 flex flex-col items-center justify-center gap-5 text-center">
        <span
          className="material-symbols-outlined text-primary-container text-6xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          card_membership
        </span>

        {activeOrder ? (
          <div className="space-y-2">
            <h2 className="font-headline font-black text-3xl text-on-surface uppercase tracking-tighter">
              Tu 1UP Pass está activo
            </h2>
            <p className="font-body text-on-surface/60">
              Vence el{" "}
              <span className="font-headline font-bold text-primary">
                {new Date(activeOrder.expires_at!).toLocaleDateString("es-CO", {
                  day: "2-digit", month: "long", year: "numeric",
                })}
              </span>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="font-headline font-black text-3xl text-on-surface uppercase tracking-tighter">
              No tienes un 1UP Pass
            </h2>
            <p className="font-body text-on-surface/50 max-w-md">
              El 1UP Pass te da acceso a beneficios exclusivos del Gaming Tower, descuentos en cursos y torneos privados.
            </p>
          </div>
        )}

        {config && (
          <div className="flex items-center gap-6 text-center">
            <div>
              <p className="font-headline text-xs uppercase tracking-widest text-outline">Precio</p>
              <p className="font-headline font-black text-xl">
                {config.price_token.toLocaleString()} <span className="text-sm text-primary-container">$1UP</span>
              </p>
            </div>
            <div>
              <p className="font-headline text-xs uppercase tracking-widest text-outline">Acceso</p>
              <p className="font-headline font-black text-xl">{config.duration_days} días</p>
            </div>
          </div>
        )}

        {canBuy && walletLoading && (
          <div className="flex items-center gap-2 text-outline font-headline text-xs uppercase tracking-widest">
            <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
            Preparando tu wallet…
          </div>
        )}

        {canBuy && !walletLoading && (
          <button
            onClick={() => setBuyOpen(true)}
            className="bg-primary-container text-white px-12 py-4 font-headline font-black text-xl uppercase tracking-tighter hover:opacity-90 transition-opacity"
          >
            {activeOrder ? "RENOVAR PASS" : "OBTENER 1UP PASS"}
          </button>
        )}

        {!config?.is_active && (
          <div className="bg-surface-container border border-tertiary/50 text-tertiary font-headline text-xs uppercase tracking-widest px-5 py-2">
            PRÓXIMAMENTE
          </div>
        )}
      </div>

      {/* Benefits */}
      {benefits.length > 0 && (
        <div className="bg-surface-container p-6">
          <h3 className="font-headline font-black text-lg uppercase tracking-tighter mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">stars</span>
            Beneficios del Pass
          </h3>
          <div className="space-y-2">
            {benefits.map((b) => (
              <div key={b.id} className="flex items-start gap-3">
                <span
                  className="material-symbols-outlined text-primary-container text-base mt-0.5 shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <div>
                  <p className="font-headline font-bold text-sm">{b.title}</p>
                  {b.description && <p className="font-body text-xs text-on-surface/50">{b.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order history */}
      {ready && authenticated && (
        <div className="bg-surface-container p-6">
          <h3 className="font-headline font-black text-lg uppercase tracking-tighter mb-4">
            Historial de Compras
          </h3>
          <MisPassOrders key={ordersKey} getAccessToken={getAccessToken} />
        </div>
      )}

      {/* Wizard modal */}
      {buyOpen && config && walletAddress ? (
        <BuyPassWizard
          priceToken={config.price_token}
          recipientAddress={config.recipient_address}
          durationDays={config.duration_days}
          walletAddress={walletAddress}
          getAccessToken={getAccessToken}
          onClose={() => setBuyOpen(false)}
          onSuccess={handleSuccess}
        />
      ) : null}
    </div>
  );
}
