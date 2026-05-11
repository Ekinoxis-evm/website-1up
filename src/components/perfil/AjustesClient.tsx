"use client";

import { useState } from "react";
import { IdentidadTab } from "./IdentidadTab";
import { SettingsTab } from "./SettingsTab";

type Game = { id: number; name: string };

type Tab = "identidad" | "seguridad";

const TABS: { id: Tab; label: string }[] = [
  { id: "identidad", label: "IDENTIDAD" },
  { id: "seguridad", label: "SEGURIDAD" },
];

export function AjustesClient({ games }: { games: Game[] }) {
  const [tab, setTab] = useState<Tab>("identidad");

  return (
    <div className="space-y-8">
      <div className="flex gap-2">
        {TABS.map(({ id, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 md:flex-none md:px-8 py-3 px-4 font-headline font-black text-sm uppercase tracking-tighter transition-colors ${
                active
                  ? "bg-primary-container text-white skew-fix"
                  : "bg-surface-container text-on-surface/60 hover:text-on-surface"
              }`}
            >
              {active ? <span className="block skew-content">{label}</span> : label}
            </button>
          );
        })}
      </div>

      {tab === "identidad" && <IdentidadTab games={games} />}
      {tab === "seguridad" && <SettingsTab />}
    </div>
  );
}
