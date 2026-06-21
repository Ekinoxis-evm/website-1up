"use client";

import Link from "next/link";
import { AdminPassConfigCard } from "./AdminPassConfigCard";
import { AdminPassesList, type AdminPass } from "./AdminPassesList";
import type { PassConfig } from "@/types/database.types";

type TreasuryWalletOption = { id: number; label: string; address: string };

interface Props {
  config:          PassConfig | null;
  confirmedCount:  number;
  activeNow:       number;
  passes:          AdminPass[];
  treasuryWallets: TreasuryWalletOption[];
}

export function Admin1PassClient({ config, confirmedCount, activeNow, passes, treasuryWallets }: Props) {
  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
          1UP <span className="text-primary-container">PASS</span>
        </h1>
        <div className="h-1 w-16 bg-primary-container mt-2" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-container p-6 border-l-4 border-primary-container">
          <p className="font-headline text-xs uppercase tracking-widest text-outline mb-2">Passes Vendidos</p>
          <p className="font-headline font-black text-4xl">{confirmedCount}</p>
        </div>
        <div className="bg-surface-container p-6 border-l-4 border-secondary-container">
          <p className="font-headline text-xs uppercase tracking-widest text-outline mb-2">Activos Ahora</p>
          <p className="font-headline font-black text-4xl">{activeNow}</p>
        </div>
        <div className="bg-surface-container p-6 border-l-4 border-tertiary flex items-center justify-between">
          <div>
            <p className="font-headline text-xs uppercase tracking-widest text-outline mb-2">Historial de Compras</p>
            <p className="font-headline font-black text-sm text-on-surface/60">Ver todas las órdenes</p>
          </div>
          <Link
            href="/admin/pass-orders"
            className="flex items-center gap-1 font-headline font-bold text-xs uppercase text-secondary hover:text-secondary-container transition-colors"
          >
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            Ver
          </Link>
        </div>
      </div>

      {/* Pass config */}
      {config ? (
        <AdminPassConfigCard config={config} treasuryWallets={treasuryWallets} />
      ) : (
        <div className="bg-surface-container p-6 border-l-4 border-error">
          <p className="font-body text-sm text-error">Error cargando la configuración del pass.</p>
        </div>
      )}

      {/* Current pass-holders */}
      <AdminPassesList passes={passes} />
    </div>
  );
}
