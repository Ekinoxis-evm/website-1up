"use client";

import Link from "next/link";
import type { PassBenefit, DiscountRule, Enrollment } from "@/types/database.types";

interface Props {
  benefits: PassBenefit[];
  discounts: DiscountRule[];
  enrollments: Enrollment[];
}

const STATUS_STYLE: Record<string, string> = {
  approved:  "bg-tertiary/20 text-tertiary",
  pending:   "bg-outline/10 text-outline",
  rejected:  "bg-error/20 text-error",
  cancelled: "bg-outline/10 text-outline",
};

export function Admin1PassClient({ benefits, discounts, enrollments }: Props) {
  const totalRevenue = enrollments
    .filter((e) => e.payment_status === "approved")
    .reduce((sum, e) => sum + e.final_price_cop, 0);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
          1UP <span className="text-primary-container">PASS</span>
        </h1>
        <div className="h-1 w-16 bg-primary-container mt-2" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-container p-6 border-l-4 border-primary-container">
          <p className="font-headline text-xs uppercase tracking-widest text-outline mb-2">Passes Vendidos</p>
          <p className="font-headline font-black text-4xl text-on-surface">
            {enrollments.filter((e) => e.payment_status === "approved").length}
          </p>
        </div>
        <div className="bg-surface-container p-6 border-l-4 border-secondary-container">
          <p className="font-headline text-xs uppercase tracking-widest text-outline mb-2">Revenue Total</p>
          <p className="font-headline font-black text-4xl text-on-surface">
            ${totalRevenue.toLocaleString("es-CO")} <span className="text-sm text-outline">COP</span>
          </p>
        </div>
        <div className="bg-surface-container p-6 border-l-4 border-tertiary">
          <p className="font-headline text-xs uppercase tracking-widest text-outline mb-2">Precio del Pass</p>
          <div className="flex items-end gap-3">
            <p className="font-headline font-black text-2xl text-on-surface/40 uppercase tracking-tighter">Pendiente</p>
            <span className="bg-tertiary/20 text-tertiary font-headline text-[9px] px-2 py-0.5 uppercase mb-1">
              Próximamente
            </span>
          </div>
        </div>
      </div>

      {/* Benefits section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline font-black text-xl uppercase tracking-tighter">
            Beneficios <span className="text-primary-container">({benefits.length})</span>
          </h2>
          <Link
            href="/admin/pass-benefits"
            className="text-secondary font-headline font-bold text-xs uppercase hover:text-secondary-container transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            Gestionar
          </Link>
        </div>
        <div className="space-y-2">
          {benefits.map((b) => (
            <div key={b.id} className="bg-surface-container p-4 border-l-4 border-primary-container flex items-start gap-3">
              <span className="material-symbols-outlined text-primary-container text-base mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
              <div>
                <p className="font-headline font-bold text-sm text-on-background">{b.title}</p>
                {b.description && <p className="font-body text-xs text-outline mt-0.5">{b.description}</p>}
              </div>
            </div>
          ))}
          {benefits.length === 0 && (
            <p className="text-outline font-body text-sm py-6 text-center">
              Sin beneficios — <Link href="/admin/pass-benefits" className="text-primary underline">agregar ahora</Link>
            </p>
          )}
        </div>
      </div>

      {/* Pass-specific discounts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline font-black text-xl uppercase tracking-tighter">
            Descuentos del Pass <span className="text-primary-container">({discounts.length})</span>
          </h2>
          <Link
            href="/admin/discounts"
            className="text-secondary font-headline font-bold text-xs uppercase hover:text-secondary-container transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            Gestionar
          </Link>
        </div>
        <div className="space-y-2">
          {discounts.map((d) => (
            <div key={d.id} className="bg-surface-container p-4 flex items-center gap-4 border-l-4 border-secondary-container">
              <div className="flex-1">
                <p className="font-headline font-bold text-sm text-on-background">{d.name}</p>
                <p className="font-body text-xs text-outline mt-0.5 uppercase">{d.trigger_type}</p>
              </div>
              <span className="font-headline font-black text-2xl text-primary">{d.discount_pct}%</span>
              <span className={`font-headline text-[10px] px-2 py-0.5 uppercase ${d.is_active ? "bg-tertiary/20 text-tertiary" : "bg-outline/10 text-outline"}`}>
                {d.is_active ? "Activo" : "Inactivo"}
              </span>
            </div>
          ))}
          {discounts.length === 0 && (
            <p className="text-outline font-body text-sm py-6 text-center">Sin descuentos configurados para el pass.</p>
          )}
        </div>
      </div>

      {/* Pass enrollments log */}
      <div>
        <h2 className="font-headline font-black text-xl uppercase tracking-tighter mb-4">
          Historial de Compras <span className="text-primary-container">({enrollments.length})</span>
        </h2>
        <div className="space-y-2">
          {enrollments.map((e) => (
            <div key={e.id} className="bg-surface-container p-4 grid grid-cols-2 md:grid-cols-4 gap-4 items-center border-l-4 border-outline-variant/20">
              <div>
                <p className="text-[10px] font-headline uppercase text-outline mb-1">Usuario</p>
                <p className="font-body text-sm text-on-background">#{e.user_profile_id}</p>
              </div>
              <div>
                <p className="text-[10px] font-headline uppercase text-outline mb-1">Precio Final</p>
                <p className="font-headline font-bold text-on-background">${e.final_price_cop.toLocaleString("es-CO")}</p>
              </div>
              <div>
                <p className="text-[10px] font-headline uppercase text-outline mb-1">Estado</p>
                <span className={`font-headline text-[10px] px-2 py-0.5 uppercase ${STATUS_STYLE[e.payment_status ?? "pending"]}`}>
                  {e.payment_status}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-headline uppercase text-outline mb-1">Fecha</p>
                <p className="font-body text-xs text-on-background/60">
                  {e.created_at ? new Date(e.created_at).toLocaleDateString("es-CO") : "—"}
                </p>
              </div>
            </div>
          ))}
          {enrollments.length === 0 && (
            <p className="text-outline font-body text-sm py-6 text-center">Sin compras de pass aún.</p>
          )}
        </div>
      </div>
    </div>
  );
}
