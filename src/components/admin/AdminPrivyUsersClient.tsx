"use client";

import { useState, useMemo } from "react";

export type MergedUser = {
  privyId: string;
  createdAt: string;
  isGuest: boolean;
  // Privy linked accounts
  email: string | null;
  googleEmail: string | null;
  discordEmail: string | null;
  walletAddress: string | null;
  tokenBalance: string | null;
  hasEmail: boolean;
  hasGoogle: boolean;
  hasDiscord: boolean;
  // Profile (user_profiles)
  hasProfile: boolean;
  nombre: string | null;
  apellidos: string | null;
  username: string | null;
  phoneCountry: string | null;
  phoneNumber: string | null;
  gameNames: string[];
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  comfenalcoAfiliado: boolean | null;
  // Enrollments
  courseCount: number;
  hasPass: boolean;
  // Meta
  blockscoutAvailable: boolean;
};

function formatBalance(raw: string | null): string {
  if (!raw || raw === "0") return "0";
  const len = raw.length;
  if (len <= 18) return "< 1";
  const whole = raw.slice(0, len - 18);
  const n = Number(whole);
  if (isNaN(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("es-CO");
}

function truncateAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function truncateDid(did: string): string {
  const suffix = did.replace("did:privy:", "");
  return suffix.length > 12 ? `${suffix.slice(0, 12)}…` : suffix;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function totalTokens(users: MergedUser[]): string {
  let total = BigInt(0);
  for (const u of users) {
    if (u.tokenBalance) {
      try { total += BigInt(u.tokenBalance); } catch { /* skip */ }
    }
  }
  const str = total.toString();
  if (str.length <= 18) return "0";
  const whole = str.slice(0, str.length - 18);
  const n = Number(whole);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("es-CO");
}

type Props = { users: MergedUser[] };

export function AdminPrivyUsersClient({ users }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const email = (u.email ?? u.googleEmail ?? u.discordEmail ?? "").toLowerCase();
      const wallet = (u.walletAddress ?? "").toLowerCase();
      const cedula = (u.numeroDocumento ?? "").toLowerCase();
      const did = u.privyId.toLowerCase();
      const name = `${u.nombre ?? ""} ${u.apellidos ?? ""}`.toLowerCase();
      const uname = (u.username ?? "").toLowerCase();
      return (
        email.includes(q) || wallet.includes(q) || cedula.includes(q) ||
        did.includes(q) || name.includes(q) || uname.includes(q)
      );
    });
  }, [users, search]);

  const withWallet = users.filter((u) => u.walletAddress).length;
  const withProfile = users.filter((u) => u.hasProfile).length;
  const withPass = users.filter((u) => u.hasPass).length;
  const blockscoutOk = users[0]?.blockscoutAvailable ?? false;

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-headline font-black text-4xl text-on-background uppercase tracking-tighter">
          USUARIOS <span className="text-primary-container">PRIVY</span>
        </h1>
        <div className="h-1 w-20 bg-primary-container mt-2" />
        <p className="font-body text-sm text-outline mt-3">
          Vista en tiempo real de todos los usuarios autenticados — Privy + perfiles + $1UP.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Total usuarios",  value: users.length,  icon: "group",                   color: "text-primary-container" },
          { label: "Con perfil",      value: withProfile,   icon: "badge",                   color: "text-secondary"         },
          { label: "Con wallet",      value: withWallet,    icon: "account_balance_wallet",   color: "text-tertiary"          },
          { label: "1UP Pass activo", value: withPass,      icon: "card_membership",          color: "text-primary-container" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-surface-container px-5 py-4 border-l-4 border-outline-variant/30">
            <div className="flex items-center gap-2 mb-1">
              <span className={`material-symbols-outlined text-sm ${color}`}>{icon}</span>
              <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline">{label}</p>
            </div>
            <p className={`font-headline font-black text-2xl ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* $1UP summary */}
      {blockscoutOk && (
        <div className="bg-surface-container border-l-4 border-primary-container/50 px-5 py-3 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>toll</span>
            <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline">Total $1UP entre usuarios con wallet</p>
          </div>
          <p className="font-headline font-black text-lg text-primary-container">
            {totalTokens(users)} <span className="text-xs text-outline font-normal">$1UP</span>
          </p>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Email, wallet, cédula, nombre, @username…"
            className="w-full bg-surface-container-high border-none pl-9 pr-4 py-3 font-body text-sm text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary-container focus:outline-none"
          />
        </div>
        <p className="font-body text-xs text-outline whitespace-nowrap">
          {filtered.length} de {users.length}
        </p>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-surface-container px-5 py-12 text-center">
          <span className="material-symbols-outlined text-4xl text-outline mb-3 block">manage_accounts</span>
          <p className="font-body text-sm text-outline">Sin resultados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const displayEmail = u.email ?? u.googleEmail ?? u.discordEmail;
            const displayName = [u.nombre, u.apellidos].filter(Boolean).join(" ") || null;
            const hasBalance = u.tokenBalance && u.tokenBalance !== "0";

            return (
              <div
                key={u.privyId}
                className="bg-surface-container hover:bg-surface-container-high transition-colors"
              >
                {/* Main row */}
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_1.2fr_1.2fr_1fr_auto] gap-x-4 gap-y-2 px-5 py-4 items-start">

                  {/* Col 1 — Identity */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {u.isGuest && (
                        <span className="font-headline text-[9px] uppercase tracking-widest text-outline border border-outline/30 px-1.5 py-0.5 shrink-0">INVITADO</span>
                      )}
                      {u.hasPass && (
                        <span className="font-headline text-[9px] uppercase tracking-widest text-primary-container border border-primary-container/40 px-1.5 py-0.5 shrink-0 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>card_membership</span>
                          1UP PASS
                        </span>
                      )}
                    </div>
                    {displayName && (
                      <span className="font-headline font-black text-sm text-on-surface">{displayName}</span>
                    )}
                    {u.username && (
                      <span className="font-body text-xs text-primary-container">@{u.username}</span>
                    )}
                    <span className="font-body text-sm text-on-surface/70 truncate">{displayEmail ?? "(sin email)"}</span>
                    <span className="font-mono text-[10px] text-outline" title={u.privyId}>{truncateDid(u.privyId)}</span>
                    {/* Linked account icons */}
                    <div className="flex items-center gap-2 mt-1">
                      {u.hasEmail && <span className="material-symbols-outlined text-xs text-primary-container" title="Email" style={{ fontVariationSettings: "'FILL' 1" }}>mail</span>}
                      {u.hasGoogle && <span className="material-symbols-outlined text-xs text-tertiary" title="Google" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>}
                      {u.hasDiscord && <span className="material-symbols-outlined text-xs text-secondary" title="Discord" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>}
                      {u.walletAddress && <span className="material-symbols-outlined text-xs text-on-surface/40" title="Wallet" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>}
                    </div>
                  </div>

                  {/* Col 2 — Wallet / $1UP */}
                  <div className="flex flex-col gap-1">
                    <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline">Wallet / $1UP</p>
                    {u.walletAddress ? (
                      <>
                        <span className="font-mono text-xs text-on-surface" title={u.walletAddress}>
                          {truncateAddr(u.walletAddress)}
                        </span>
                        {blockscoutOk ? (
                          <span className={`font-headline font-black text-sm ${hasBalance ? "text-primary-container" : "text-outline"}`}>
                            {formatBalance(u.tokenBalance)} $1UP
                          </span>
                        ) : (
                          <span className="font-body text-xs text-outline">$1UP —</span>
                        )}
                      </>
                    ) : (
                      <span className="font-body text-xs text-outline/50">Sin wallet</span>
                    )}
                    {/* Phone */}
                    {(u.phoneCountry || u.phoneNumber) && (
                      <span className="font-body text-xs text-outline mt-1">
                        {u.phoneCountry} {u.phoneNumber}
                      </span>
                    )}
                  </div>

                  {/* Col 3 — Cédula */}
                  <div className="flex flex-col gap-0.5">
                    <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline">Cédula</p>
                    {u.hasProfile && u.numeroDocumento ? (
                      <>
                        <span className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline/60">{u.tipoDocumento}</span>
                        <span className="font-body text-sm text-on-surface">{u.numeroDocumento}</span>
                        {u.comfenalcoAfiliado && (
                          <span className="font-headline text-[9px] uppercase tracking-widest text-tertiary flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                            COMFENALCO
                          </span>
                        )}
                      </>
                    ) : u.hasProfile ? (
                      <span className="font-body text-xs text-outline">Perfil sin cédula</span>
                    ) : (
                      <span className="font-body text-xs text-outline/40">Sin perfil</span>
                    )}
                  </div>

                  {/* Col 4 — Cursos */}
                  <div className="flex flex-col gap-0.5">
                    <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline">Cursos</p>
                    {u.courseCount > 0 ? (
                      <span className="bg-primary-container/20 text-primary-container font-headline font-black text-sm px-2.5 py-1 self-start">
                        {u.courseCount}
                      </span>
                    ) : (
                      <span className="font-body text-xs text-outline">—</span>
                    )}
                  </div>

                  {/* Col 5 — Date */}
                  <div className="flex flex-col gap-0.5 items-end lg:items-start">
                    <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline">Registrado</p>
                    <span className="font-body text-xs text-outline whitespace-nowrap">{formatDate(u.createdAt)}</span>
                  </div>
                </div>

                {/* Games strip */}
                {u.gameNames.length > 0 && (
                  <div className="border-t border-outline-variant/10 px-5 py-2 flex items-center gap-2 flex-wrap">
                    <span className="material-symbols-outlined text-xs text-outline" style={{ fontVariationSettings: "'FILL' 1" }}>sports_esports</span>
                    {u.gameNames.map((g) => (
                      <span key={g} className="font-headline font-bold text-[10px] uppercase tracking-wider text-on-surface/50 bg-surface-container-high px-2 py-0.5">
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!blockscoutOk && (
        <p className="font-body text-xs text-outline mt-6 text-center">
          Blockscout no disponible — balances $1UP no cargados. Recarga la página para reintentar.
        </p>
      )}
    </div>
  );
}
