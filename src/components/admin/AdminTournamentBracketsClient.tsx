"use client";

// Tournament-selector wrapper over the per-tournament bracket panel.
//
// The actual bracket UI lives in `AdminTournamentBracketPanel` — this file
// owns just the tournament picker so admins can manage any tournament's
// bracket from this single page. The same panel is also embedded inside
// the cockpit (`/admin/torneos/[slug]/manage`), which doesn't need a
// selector since it's already scoped to one tournament.

import { useState } from "react";
import Link from "next/link";
import { AdminTournamentBracketPanel, type BracketTournament } from "@/components/admin/AdminTournamentBracketPanel";

interface Props {
  tournaments: BracketTournament[];
}

const STAGE_LABEL: Record<string, string> = {
  upcoming: "Inscripciones abiertas",
  live:     "Torneo en curso",
  completed:"Torneo finalizado",
};

export function AdminTournamentBracketsClient({ tournaments }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = selectedId ? tournaments.find(t => t.id === selectedId) ?? null : null;

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div>
        <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Competiciones</p>
        <h1 className="font-headline font-black text-3xl uppercase tracking-tighter text-on-surface">BRACKETS</h1>
        <div className="h-1 w-16 bg-primary-container mt-2" />
        <p className="font-body text-sm text-outline mt-3">
          Para gestionar un torneo completo (info, inscritos, premios) usa el panel{" "}
          <span className="text-primary-container">GESTIONAR</span> desde la lista de torneos.
          Esta vista se enfoca solo en el bracket.
        </p>
      </div>

      <div className="max-w-sm">
        <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-2">Torneo</label>
        <select
          value={selectedId ?? ""}
          onChange={e => setSelectedId(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full bg-surface-container text-on-surface font-body text-sm px-3 py-2 border-0 outline-none focus:ring-2 focus:ring-primary-container"
        >
          <option value="">Seleccionar torneo…</option>
          {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {selected && (
        <>
          <div className="bg-surface-container p-4 flex flex-wrap items-center gap-3">
            <span className="font-headline font-black text-sm text-on-surface">{selected.name}</span>
            <span className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline">
              · {STAGE_LABEL[selected.status] ?? selected.status}
            </span>
            <span className={`font-headline font-bold text-[10px] uppercase tracking-widest px-2 py-1 ${
              selected.is_registration_open
                ? "bg-secondary/15 text-secondary"
                : "bg-surface-container-high text-outline"
            }`}>
              Inscripciones {selected.is_registration_open ? "abiertas" : "cerradas"}
            </span>
            <Link
              href={`/admin/tournament-registrations?tournamentId=${selected.id}`}
              className="ml-auto font-headline font-bold text-[10px] uppercase tracking-widest text-outline hover:text-on-surface flex items-center gap-1"
            >
              Ver inscripciones
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
          <AdminTournamentBracketPanel tournament={selected} />
        </>
      )}
    </div>
  );
}
