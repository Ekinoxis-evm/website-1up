"use client";

import { useState, useMemo } from "react";

export type MergedUser = {
  privyId: string;
  createdAt: string;
  isGuest: boolean;
  email: string | null;
  googleEmail: string | null;
  discordEmail: string | null;
  walletAddress: string | null;
  tokenBalance: string | null;
  hasEmail: boolean;
  hasGoogle: boolean;
  hasDiscord: boolean;
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
  courseCount: number;
  hasPass: boolean;
  blockscoutAvailable: boolean;
};

type SortKey = "tokens-desc" | "tokens-asc" | "name" | "date-new" | "date-old";

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
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
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

function tokenBigInt(raw: string | null): bigint {
  if (!raw) return BigInt(0);
  try { return BigInt(raw); } catch { return BigInt(0); }
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "tokens-desc", label: "$1UP ↓"   },
  { key: "tokens-asc",  label: "$1UP ↑"   },
  { key: "name",        label: "Nombre"    },
  { key: "date-new",    label: "Reciente"  },
  { key: "date-old",    label: "Antiguo"   },
];

const TH = "font-headline text-[10px] uppercase tracking-widest text-outline text-left px-3 py-2.5 whitespace-nowrap";
const TD = "px-3 py-3 align-top";

type Props = { users: MergedUser[] };

export function AdminPrivyUsersClient({ users }: Props) {
  const [search, setSearch]         = useState("");
  const [sortBy, setSortBy]         = useState<SortKey>("tokens-desc");
  const [gameFilter, setGameFilter] = useState<string[]>([]);

  const allGames = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => u.gameNames.forEach((g) => set.add(g)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [users]);

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const email  = (u.email ?? u.googleEmail ?? u.discordEmail ?? "").toLowerCase();
      const wallet = (u.walletAddress ?? "").toLowerCase();
      const cedula = (u.numeroDocumento ?? "").toLowerCase();
      const did    = u.privyId.toLowerCase();
      const name   = `${u.nombre ?? ""} ${u.apellidos ?? ""}`.toLowerCase();
      const uname  = (u.username ?? "").toLowerCase();
      return email.includes(q) || wallet.includes(q) || cedula.includes(q) || did.includes(q) || name.includes(q) || uname.includes(q);
    });
  }, [users, search]);

  const filtered = useMemo(() => {
    let list = searched;
    if (gameFilter.length > 0) {
      list = list.filter((u) => gameFilter.some((g) => u.gameNames.includes(g)));
    }
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "tokens-desc": { const d = tokenBigInt(b.tokenBalance) - tokenBigInt(a.tokenBalance); return d > 0 ? 1 : d < 0 ? -1 : 0; }
        case "tokens-asc":  { const d = tokenBigInt(a.tokenBalance) - tokenBigInt(b.tokenBalance); return d > 0 ? 1 : d < 0 ? -1 : 0; }
        case "name": {
          const an = `${a.nombre ?? ""} ${a.apellidos ?? ""}`.trim().toLowerCase();
          const bn = `${b.nombre ?? ""} ${b.apellidos ?? ""}`.trim().toLowerCase();
          return an.localeCompare(bn, "es");
        }
        case "date-new": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "date-old": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
    });
  }, [searched, sortBy, gameFilter]);

  const withWallet  = users.filter((u) => u.walletAddress).length;
  const withProfile = users.filter((u) => u.hasProfile).length;
  const withPass    = users.filter((u) => u.hasPass).length;
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

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Total usuarios",  value: users.length,  icon: "group",                 color: "text-primary-container" },
          { label: "Con perfil",      value: withProfile,   icon: "badge",                 color: "text-secondary"         },
          { label: "Con wallet",      value: withWallet,    icon: "account_balance_wallet", color: "text-tertiary"          },
          { label: "1UP Pass activo", value: withPass,      icon: "card_membership",        color: "text-primary-container" },
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

      {/* $1UP total */}
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

      {/* Search + Sort + Game filter */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-4">
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
          <p className="font-body text-xs text-outline whitespace-nowrap">{filtered.length} de {users.length}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline shrink-0">Ordenar:</p>
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`font-headline font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 transition-colors ${
                sortBy === key
                  ? "bg-primary-container text-on-surface"
                  : "bg-surface-container-high text-outline hover:text-on-surface"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {allGames.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline shrink-0">Juego:</p>
            {allGames.map((g) => {
              const active = gameFilter.includes(g);
              return (
                <button
                  key={g}
                  onClick={() => setGameFilter((prev) => active ? prev.filter((x) => x !== g) : [...prev, g])}
                  className={`font-headline font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 transition-colors flex items-center gap-1 ${
                    active ? "bg-secondary text-on-surface" : "bg-surface-container-high text-outline hover:text-on-surface"
                  }`}
                >
                  {active && <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
                  {g}
                </button>
              );
            })}
            {gameFilter.length > 0 && (
              <button
                onClick={() => setGameFilter([])}
                className="font-headline font-bold text-[10px] uppercase tracking-wider px-2 py-1.5 text-outline hover:text-on-surface flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[11px]">close</span>
                Limpiar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-surface-container px-5 py-12 text-center">
          <span className="material-symbols-outlined text-4xl text-outline mb-3 block">manage_accounts</span>
          <p className="font-body text-sm text-outline">Sin resultados</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="bg-surface-container-high">
                <th className={TH}>Usuario</th>
                <th className={TH}>Wallet / $1UP</th>
                <th className={TH}>Cédula</th>
                <th className={TH}>Juegos</th>
                <th className={TH}>Cursos</th>
                <th className={TH}>Registrado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const displayEmail = u.email ?? u.googleEmail ?? u.discordEmail;
                const displayName  = [u.nombre, u.apellidos].filter(Boolean).join(" ") || null;
                const hasBalance   = u.tokenBalance && u.tokenBalance !== "0";

                return (
                  <tr
                    key={u.privyId}
                    className="border-t border-surface-container-high bg-surface-container hover:bg-surface-container-high/50 transition-colors"
                  >
                    {/* Usuario */}
                    <td className={TD}>
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        {u.isGuest && (
                          <span className="font-headline text-[9px] uppercase tracking-widest text-outline border border-outline/30 px-1.5 py-0.5">INVITADO</span>
                        )}
                        {u.hasPass && (
                          <span className="font-headline text-[9px] uppercase tracking-widest text-primary-container border border-primary-container/40 px-1.5 py-0.5 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>card_membership</span>
                            1UP PASS
                          </span>
                        )}
                      </div>
                      {displayName && <p className="font-headline font-black text-sm text-on-surface leading-tight">{displayName}</p>}
                      {u.username && <p className="font-body text-xs text-primary-container">@{u.username}</p>}
                      <p className="font-body text-sm text-on-surface/70 truncate max-w-[200px]">{displayEmail ?? "(sin email)"}</p>
                      <p className="font-mono text-[10px] text-outline" title={u.privyId}>{truncateDid(u.privyId)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {u.hasEmail   && <span className="material-symbols-outlined text-xs text-primary-container" title="Email"   style={{ fontVariationSettings: "'FILL' 1" }}>mail</span>}
                        {u.hasGoogle  && <span className="material-symbols-outlined text-xs text-tertiary"          title="Google"  style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>}
                        {u.hasDiscord && <span className="material-symbols-outlined text-xs text-secondary"         title="Discord" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>}
                        {u.walletAddress && <span className="material-symbols-outlined text-xs text-on-surface/40" title="Wallet"  style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>}
                      </div>
                    </td>

                    {/* Wallet / $1UP */}
                    <td className={TD}>
                      {u.walletAddress ? (
                        <>
                          <p className="font-mono text-xs text-on-surface" title={u.walletAddress}>{truncateAddr(u.walletAddress)}</p>
                          {blockscoutOk ? (
                            <p className={`font-headline font-black text-sm ${hasBalance ? "text-primary-container" : "text-outline"}`}>
                              {formatBalance(u.tokenBalance)} $1UP
                            </p>
                          ) : (
                            <p className="font-body text-xs text-outline">$1UP —</p>
                          )}
                        </>
                      ) : (
                        <p className="font-body text-xs text-outline/50">Sin wallet</p>
                      )}
                      {(u.phoneCountry || u.phoneNumber) && (
                        <p className="font-body text-xs text-outline mt-1">{u.phoneCountry} {u.phoneNumber}</p>
                      )}
                    </td>

                    {/* Cédula */}
                    <td className={TD}>
                      {u.hasProfile && u.numeroDocumento ? (
                        <>
                          <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline/60">{u.tipoDocumento}</p>
                          <p className="font-body text-sm text-on-surface">{u.numeroDocumento}</p>
                          {u.comfenalcoAfiliado && (
                            <p className="font-headline text-[9px] uppercase tracking-widest text-tertiary flex items-center gap-0.5 mt-0.5">
                              <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                              COMFENALCO
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="font-body text-xs text-outline/40">{u.hasProfile ? "Sin cédula" : "Sin perfil"}</p>
                      )}
                    </td>

                    {/* Juegos */}
                    <td className={TD}>
                      {u.gameNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {u.gameNames.map((g) => (
                            <span key={g} className="font-headline font-bold text-[9px] uppercase tracking-wider text-on-surface/50 bg-surface-container-high px-2 py-0.5">
                              {g}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="font-body text-xs text-outline/40">—</p>
                      )}
                    </td>

                    {/* Cursos */}
                    <td className={TD}>
                      {u.courseCount > 0 ? (
                        <span className="bg-primary-container/20 text-primary-container font-headline font-black text-sm px-2.5 py-1">
                          {u.courseCount}
                        </span>
                      ) : (
                        <span className="font-body text-xs text-outline">—</span>
                      )}
                    </td>

                    {/* Registrado */}
                    <td className={`${TD} font-body text-xs text-outline whitespace-nowrap`}>
                      {formatDate(u.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
