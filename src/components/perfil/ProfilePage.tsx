"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { WalletTab } from "./WalletTab";
import { SettingsTab } from "./SettingsTab";
import { IdentidadTab } from "./IdentidadTab";

type Tab = "wallet" | "identidad" | "settings";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "wallet",    label: "WALLET",   icon: "account_balance_wallet" },
  { id: "identidad", label: "IDENTIDAD", icon: "badge"                 },
  { id: "settings",  label: "AJUSTES",  icon: "manage_accounts"       },
];

export function ProfilePage() {
  const { ready, authenticated, login } = usePrivy();
  const [activeTab, setActiveTab] = useState<Tab>("wallet");

  if (!ready) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">
          refresh
        </span>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-8 px-6 text-center">
        <div>
          <h1 className="font-headline font-black text-6xl md:text-8xl leading-none tracking-tighter mb-3">
            ACCEDE A TU{" "}
            <span className="text-primary">PERFIL</span>
          </h1>
          <div className="h-1 w-20 bg-secondary-container mx-auto" />
        </div>
        <p className="font-body text-on-surface/50 max-w-md">
          Inicia sesión para ver tu balance de{" "}
          <span className="text-primary font-bold">$1UP</span>, tu historial y
          gestionar tus métodos de autenticación.
        </p>
        <button
          onClick={login}
          className="bg-primary-container text-white px-12 py-4 font-headline font-black text-xl uppercase tracking-tighter skew-fix hover:neo-shadow-pink transition-all active:scale-95"
        >
          <span className="block skew-content">JOIN NOW</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Tab bar */}
      <div className="bg-surface-container-lowest border-b border-outline-variant/20 px-6">
        <div className="flex max-w-5xl mx-auto">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-8 py-5 font-headline font-black uppercase tracking-tighter text-sm transition-all border-b-4 ${
                activeTab === id
                  ? "text-primary border-primary-container"
                  : "text-on-surface/40 border-transparent hover:text-on-surface/70"
              }`}
            >
              <span className="material-symbols-outlined text-base">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-10 pb-24 md:pb-12">
        {activeTab === "wallet"    && <WalletTab />}
        {activeTab === "identidad" && <IdentidadTab />}
        {activeTab === "settings"  && <SettingsTab />}
      </div>
    </div>
  );
}
