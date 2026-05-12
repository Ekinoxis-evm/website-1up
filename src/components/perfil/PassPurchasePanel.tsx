"use client";

import { useState, useCallback, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { BuyPassWizard } from "./BuyPassWizard";
import { BuyPassBankWizard } from "./BuyPassBankWizard";
import { PassCalendar } from "./PassCalendar";
import type { PassConfig, PassBenefit, PassOrder, PassOrderStatus } from "@/types/database.types";

const BASESCAN = "https://basescan.org/tx/";

const STATUS_LABELS: Record<PassOrderStatus, string> = {
  pending_tx:         "Pendiente TX",
  confirmed:          "Confirmado",
  failed:             "Fallido",
  expired_unverified: "No Verificado",
  pending_bank:       "En revisión",
};

const STATUS_COLORS: Record<PassOrderStatus, string> = {
  pending_tx:         "bg-outline/10 text-outline",
  confirmed:          "bg-tertiary/20 text-tertiary",
  failed:             "bg-error/20 text-error",
  expired_unverified: "bg-outline/10 text-on-surface/40",
  pending_bank:       "bg-secondary-container/40 text-secondary",
};

interface Props {
  config:   PassConfig | null;
  benefits: PassBenefit[];
}

export function PassPurchasePanel({ config, benefits }: Props) {
  const { getAccessToken, ready, authenticated } = usePrivy();
  const { wallets } = useWallets();

  const [buyOpen, setBuyOpen]         = useState(false);
  const [buyBankOpen, setBuyBankOpen] = useState(false);
  const [orders, setOrders]           = useState<PassOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const walletAddress  = embeddedWallet?.address ?? "";
  const walletLoading  = ready && authenticated && wallets.length === 0;

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    const token = await getAccessToken();
    const res = await fetch("/api/user/pass-orders", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setOrders(await res.json());
    setOrdersLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready && authenticated) fetchOrders();
  }, [ready, authenticated, fetchOrders]);

  // Derive pass state from orders
  const now = new Date();
  const confirmedOrders = orders.filter((o) => o.status === "confirmed" && o.expires_at);
  const maxExpiry = confirmedOrders.reduce<Date | null>((max, o) => {
    const d = new Date(o.expires_at!);
    return !max || d > max ? d : max;
  }, null);
  const isActive   = !!maxExpiry && maxExpiry > now;
  const hasHistory = confirmedOrders.length > 0;
  const daysLeft   = isActive && maxExpiry
    ? Math.ceil((maxExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  function handleSuccess() {
    fetchOrders();
  }

  const canBuy = config?.is_active && ready && authenticated;

  return (
    <div className="space-y-8">

      {/* ── Status + CTA ─────────────────────────────────── */}
      <div className="bg-surface-container-low border-l-8 border-primary-container p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">

          {/* Left: status info */}
          <div className="space-y-3 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`font-headline font-black text-xs px-3 py-1 uppercase tracking-widest shrink-0 ${
                isActive        ? "bg-tertiary/20 text-tertiary" :
                hasHistory      ? "bg-error/15 text-error"        :
                                  "bg-outline/10 text-outline"
              }`}>
                {isActive ? "ACTIVO" : hasHistory ? "EXPIRADO" : "SIN PASS"}
              </span>

              {isActive && (
                <span className="font-headline text-sm uppercase tracking-widest text-on-surface/50">
                  {daysLeft} día{daysLeft !== 1 ? "s" : ""} restante{daysLeft !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {isActive && maxExpiry && (
              <h2 className="font-headline font-black text-2xl md:text-3xl text-on-surface uppercase tracking-tighter leading-tight">
                Acceso hasta{" "}
                <span className="text-primary-container">
                  {maxExpiry.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
                </span>
              </h2>
            )}

            {!isActive && hasHistory && maxExpiry && (
              <h2 className="font-headline font-black text-2xl md:text-3xl text-on-surface uppercase tracking-tighter leading-tight">
                Expiró el{" "}
                <span className="text-on-surface/40">
                  {maxExpiry.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
                </span>
              </h2>
            )}

            {!isActive && !hasHistory && (
              <div className="space-y-1">
                <h2 className="font-headline font-black text-2xl md:text-3xl text-on-surface uppercase tracking-tighter">
                  No tienes un 1UP Pass
                </h2>
                <p className="font-body text-sm text-on-surface/50 max-w-sm">
                  El 1UP Pass te da acceso a beneficios exclusivos del Gaming Tower, descuentos en cursos y torneos privados.
                </p>
              </div>
            )}

            {config && (
              <p className="font-body text-sm text-on-surface/40">
                {config.price_token.toLocaleString()} $1UP · {config.duration_days} días de acceso
              </p>
            )}
          </div>

          {/* Right: CTA buttons */}
          <div className="flex flex-col gap-2 shrink-0">
            {canBuy && walletLoading && (
              <div className="flex items-center gap-2 text-outline font-headline text-xs uppercase tracking-widest">
                <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                Preparando tu wallet…
              </div>
            )}

            {canBuy && !walletLoading && (
              <>
                <button
                  onClick={() => setBuyOpen(true)}
                  className="bg-primary-container text-white px-6 py-3 font-headline font-black text-sm uppercase tracking-tighter hover:opacity-90 transition-opacity flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                    token
                  </span>
                  {isActive ? "RENOVAR CON $1UP" : hasHistory ? "REACTIVAR CON $1UP" : "PAGAR CON $1UP"}
                </button>
                <button
                  onClick={() => setBuyBankOpen(true)}
                  className="bg-surface-container text-on-background border border-primary-container/30 px-6 py-3 font-headline font-black text-sm uppercase tracking-tighter hover:border-primary-container transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-base">account_balance</span>
                  PAGAR CON BANCO
                </button>
              </>
            )}

            {!config?.is_active && (
              <div className="bg-surface-container border border-tertiary/50 text-tertiary font-headline text-xs uppercase tracking-widest px-5 py-2 text-center">
                PRÓXIMAMENTE
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Calendar ─────────────────────────────────────── */}
      {ready && authenticated && (
        <div className="space-y-4">
          <div>
            <h3 className="font-headline font-black text-xl uppercase tracking-tighter">
              Cobertura del Pass
            </h3>
            <p className="font-headline text-[10px] uppercase tracking-widest text-on-surface/40 mt-1">
              3 meses atrás · mes actual · 8 meses adelante
            </p>
          </div>

          {ordersLoading ? (
            <div className="flex justify-center py-16">
              <span className="material-symbols-outlined text-primary text-4xl animate-spin">refresh</span>
            </div>
          ) : (
            <PassCalendar orders={orders} />
          )}
        </div>
      )}

      {/* ── Benefits ─────────────────────────────────────── */}
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
                  {b.description && (
                    <p className="font-body text-xs text-on-surface/50">{b.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Order history ────────────────────────────────── */}
      {ready && authenticated && orders.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-headline font-black text-lg uppercase tracking-tighter">
            Historial de Compras
          </h3>
          <div className="space-y-2">
            {orders.map((o) => {
              const expired = o.expires_at ? new Date(o.expires_at) < now : true;
              return (
                <div key={o.id} className="bg-surface-container p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-headline text-[10px] px-2 py-0.5 uppercase shrink-0 ${STATUS_COLORS[o.status]}`}>
                        {STATUS_LABELS[o.status]}
                      </span>
                      {o.status === "confirmed" && (
                        <span className={`font-headline text-[10px] px-2 py-0.5 uppercase shrink-0 ${expired ? "bg-error/10 text-error" : "bg-primary-container/20 text-primary-container"}`}>
                          {expired ? "Expirado" : "Activo"}
                        </span>
                      )}
                    </div>
                    <p className="font-headline font-black text-sm">
                      {o.token_amount_paid.toLocaleString()}{" "}
                      <span className="text-xs text-outline font-normal">$1UP</span>
                    </p>
                    {o.expires_at && (
                      <p className="font-body text-xs text-on-surface/40">
                        Vence: {new Date(o.expires_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  {o.tx_hash ? (
                    <a
                      href={`${BASESCAN}${o.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-primary hover:underline shrink-0"
                    >
                      {o.tx_hash.slice(0, 8)}…
                    </a>
                  ) : (
                    <span className="font-headline text-[10px] uppercase text-outline shrink-0">Banco</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Wizards ──────────────────────────────────────── */}
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

      {buyBankOpen && config && walletAddress ? (
        <BuyPassBankWizard
          priceToken={config.price_token}
          durationDays={config.duration_days}
          walletAddress={walletAddress}
          getAccessToken={getAccessToken}
          onClose={() => setBuyBankOpen(false)}
          onSuccess={handleSuccess}
        />
      ) : null}
    </div>
  );
}
