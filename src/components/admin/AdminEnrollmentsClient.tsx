"use client";

import { useState } from "react";
import { formatCop } from "@/lib/utils";

interface EnrollmentRow {
  id: number;
  product_type: string;
  original_price_cop: number;
  discount_pct_applied: number | null;
  final_price_cop: number;
  payment_status: string | null;
  mp_payment_id: string | null;
  paid_at: string | null;
  created_at: string | null;
  user_profiles: {
    email: string | null;
    tipo_documento: string | null;
    numero_documento: string | null;
    comfenalco_afiliado: boolean | null;
  } | null;
  courses: { name: string; category: string } | null;
  discount_rules: { name: string; trigger_type: string } | null;
}

interface Props { enrollments: EnrollmentRow[] }

const STATUS_STYLE: Record<string, { bg: string; label: string }> = {
  approved:  { bg: "bg-primary-container text-white",               label: "Aprobado"   },
  pending:   { bg: "bg-tertiary text-background",                   label: "Pendiente"  },
  rejected:  { bg: "bg-error text-white",                           label: "Rechazado"  },
  cancelled: { bg: "bg-surface-container-highest text-outline",     label: "Cancelado"  },
};

const FILTERS = ["Todos", "approved", "pending", "rejected", "cancelled"] as const;
type Filter = (typeof FILTERS)[number];

export function AdminEnrollmentsClient({ enrollments }: Props) {
  const [filter, setFilter] = useState<Filter>("Todos");

  const visible = filter === "Todos"
    ? enrollments
    : enrollments.filter((e) => e.payment_status === filter);

  const totalRevenue = enrollments
    .filter((e) => e.payment_status === "approved")
    .reduce((sum, e) => sum + e.final_price_cop, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
            INSCRIPCIONES <span className="text-primary">PAGOS</span>
          </h1>
          <div className="h-1 w-16 bg-primary mt-2" />
        </div>
        <div className="text-right">
          <div className="font-headline font-black text-2xl text-primary">{formatCop(totalRevenue)}</div>
          <div className="font-body text-xs text-outline uppercase tracking-widest">Ingresos totales aprobados</div>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`font-headline font-black text-xs px-4 py-2 uppercase tracking-widest transition-all ${
              filter === f
                ? "bg-primary-container text-white"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {f === "Todos" ? "Todos" : (STATUS_STYLE[f]?.label ?? f)}
          </button>
        ))}
        <span className="ml-auto font-body text-xs text-outline self-center">
          {visible.length} registro{visible.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="bg-surface-container-highest">
              {["#", "Usuario", "Documento", "Curso", "Precio orig.", "Descuento", "Precio final", "Regla", "Estado", "Fecha"].map((h) => (
                <th key={h} className="text-left font-headline font-black text-xs uppercase tracking-widest text-outline px-3 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((e, i) => {
              const statusStyle = STATUS_STYLE[e.payment_status ?? "pending"] ?? STATUS_STYLE.pending;
              return (
                <tr key={e.id} className={i % 2 === 0 ? "bg-surface-container" : "bg-surface-container-low"}>
                  <td className="px-3 py-3 font-body text-outline text-xs">#{e.id}</td>
                  <td className="px-3 py-3">
                    <div className="font-body text-xs text-on-background">{e.user_profiles?.email ?? "—"}</div>
                    {e.user_profiles?.comfenalco_afiliado && (
                      <span className="font-headline font-black text-[9px] bg-secondary-container text-white px-1.5 py-0.5 uppercase mt-0.5 inline-block">
                        Comfenalco ✓
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 font-body text-xs text-on-surface-variant">
                    {e.user_profiles?.tipo_documento} {e.user_profiles?.numero_documento ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-headline font-bold text-xs text-on-background">{e.courses?.name ?? "—"}</div>
                    <div className="font-body text-[10px] text-outline">{e.courses?.category}</div>
                  </td>
                  <td className="px-3 py-3 font-body text-xs text-on-surface-variant">{formatCop(e.original_price_cop)}</td>
                  <td className="px-3 py-3">
                    {(e.discount_pct_applied ?? 0) > 0
                      ? <span className="font-headline font-black text-primary text-sm">-{e.discount_pct_applied}%</span>
                      : <span className="text-outline font-body text-xs">—</span>
                    }
                  </td>
                  <td className="px-3 py-3 font-headline font-black text-on-background">{formatCop(e.final_price_cop)}</td>
                  <td className="px-3 py-3 font-body text-xs text-on-surface-variant">{e.discount_rules?.name ?? "—"}</td>
                  <td className="px-3 py-3">
                    <span className={`font-headline font-black text-[10px] px-2 py-1 uppercase ${statusStyle.bg}`}>
                      {statusStyle.label}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-body text-[10px] text-outline">
                    {e.created_at ? new Date(e.created_at).toLocaleDateString("es-CO") : "—"}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-12 text-center text-outline font-body">Sin inscripciones.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
