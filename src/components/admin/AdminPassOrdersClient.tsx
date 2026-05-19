"use client";

import { Fragment, useState, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import type { PassOrderStatus } from "@/types/database.types";

type Order = {
  id: number;
  status: PassOrderStatus;
  payment_method: string;
  wallet_address: string;
  tx_hash: string | null;
  comprobante_url: string | null;
  token_amount_paid: number;
  token_price_at_purchase: number;
  duration_days: number;
  started_at: string | null;
  paid_at: string | null;
  expires_at: string | null;
  block_number: number | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  granted_by: string | null;
  created_at: string;
  user_profiles: { nombre: string | null; apellidos: string | null; email: string | null; username: string | null } | null;
  bank_accounts: { bank_name: string; account_type: string | null; account_number: string; holder_name: string } | null;
};

type UserProfile = {
  id: number;
  nombre: string | null;
  apellidos: string | null;
  email: string | null;
  privy_user_id: string;
};

interface Props {
  orders: Order[];
  profiles: UserProfile[];
  defaultDuration: number;
}

const STATUS_LABELS: Record<string, string> = {
  pending_tx:         "Pendiente TX",
  confirmed:          "Confirmado",
  failed:             "Fallido",
  expired_unverified: "No Verificado",
  pending_bank:       "Pendiente Banco",
};

const STATUS_COLORS: Record<string, string> = {
  pending_tx:         "bg-outline/10 text-outline",
  confirmed:          "bg-tertiary/20 text-tertiary",
  failed:             "bg-error/20 text-error",
  expired_unverified: "bg-outline/10 text-on-surface/40",
  pending_bank:       "bg-secondary-container/40 text-secondary",
};

const BASESCAN = "https://basescan.org/tx/";

const TH = "font-headline text-[10px] uppercase tracking-widest text-outline text-left px-3 py-2.5 whitespace-nowrap";
const TD = "px-3 py-3 align-top";

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function userName(o: Order) {
  const u = o.user_profiles;
  return u ? ([u.nombre, u.apellidos].filter(Boolean).join(" ") || u.username || u.email || `#${o.id}`) : `#${o.id}`;
}

type TabKey = "token" | "banco" | "grant";

export function AdminPassOrdersClient({ orders, profiles, defaultDuration }: Props) {
  const { getAccessToken } = usePrivy();
  const router = useRouter();

  const [tab, setTab]               = useState<TabKey>("token");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionId, setActionId]     = useState<number | null>(null);
  const [notes, setNotes]           = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState("");

  // Grant modal
  const [grantOpen, setGrantOpen]       = useState(false);
  const [grantSearch, setGrantSearch]   = useState("");
  const [grantUser, setGrantUser]       = useState<UserProfile | null>(null);
  const [grantStart, setGrantStart]     = useState(() => new Date().toISOString().slice(0, 10));
  const [grantDays, setGrantDays]       = useState(String(defaultDuration));
  const [grantNotes, setGrantNotes]     = useState("");
  const [grantSaving, setGrantSaving]   = useState(false);
  const [grantErr, setGrantErr]         = useState("");

  const tokenOrders = orders.filter((o) => o.payment_method === "token");
  const bancoOrders = orders.filter((o) => o.payment_method === "bank");
  const grantOrders = orders.filter((o) => o.payment_method === "admin_grant");

  const activeList =
    tab === "token" ? tokenOrders :
    tab === "banco" ? bancoOrders :
    grantOrders;

  const statusOptions =
    tab === "token"  ? ["all", "confirmed", "pending_tx", "failed", "expired_unverified"] :
    tab === "banco"  ? ["all", "pending_bank", "confirmed", "failed"] :
    ["all", "confirmed", "failed"];

  const filtered = statusFilter === "all"
    ? activeList
    : activeList.filter((o) => o.status === statusFilter);

  const confirmedCount = orders.filter((o) => o.status === "confirmed").length;
  const activeNow      = orders.filter(
    (o) => o.status === "confirmed" && o.expires_at && new Date(o.expires_at) > new Date()
  ).length;
  const pendingBanco   = bancoOrders.filter((o) => o.status === "pending_bank").length;

  const profileResults = useMemo(() => {
    const q = grantSearch.trim().toLowerCase();
    if (!q) return [];
    return profiles.filter((p) =>
      [p.nombre, p.apellidos, p.email].some((v) => v?.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [grantSearch, profiles]);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  async function saveNotes(id: number) {
    setSaving(true); setErr("");
    const res = await fetch("/api/admin/pass-orders", {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify({ id, adminNotes: notes }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setErr(d.error ?? "Error al guardar."); return; }
    setActionId(null);
    router.refresh();
  }

  async function doAction(id: number, action: "approve" | "reject") {
    setSaving(true); setErr("");
    const res = await fetch("/api/admin/pass-orders", {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify({ id, action, adminNotes: notes || undefined, rejectionReason: rejectionReason || undefined }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setErr(d.error ?? "Error"); return; }
    setActionId(null); setNotes(""); setRejectionReason("");
    router.refresh();
  }

  function openAction(o: Order) {
    setActionId(actionId === o.id ? null : o.id);
    setNotes(o.admin_notes ?? "");
    setRejectionReason("");
    setErr("");
  }

  function openGrant() {
    setGrantOpen(true);
    setGrantSearch("");
    setGrantUser(null);
    setGrantStart(new Date().toISOString().slice(0, 10));
    setGrantDays(String(defaultDuration));
    setGrantNotes("");
    setGrantErr("");
  }

  async function handleGrant() {
    if (!grantUser) { setGrantErr("Selecciona un usuario."); return; }
    if (!grantStart) { setGrantErr("Selecciona la fecha de inicio."); return; }
    const days = Number(grantDays);
    if (!days || days < 1) { setGrantErr("Duración inválida."); return; }
    setGrantSaving(true); setGrantErr("");
    const res = await fetch("/api/admin/pass-orders", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        userProfileId: grantUser.id,
        privyUserId:   grantUser.privy_user_id,
        walletAddress: "",
        startedAt:     new Date(grantStart + "T00:00:00").toISOString(),
        durationDays:  days,
        adminNotes:    grantNotes || undefined,
      }),
    });
    setGrantSaving(false);
    if (!res.ok) { const d = await res.json(); setGrantErr(d.error ?? "Error al conceder."); return; }
    setGrantOpen(false);
    router.refresh();
  }

  function switchTab(t: TabKey) {
    setTab(t);
    setStatusFilter("all");
    setActionId(null);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
            ÓRDENES <span className="text-primary-container">1UP PASS</span>
          </h1>
          <div className="h-1 w-16 bg-primary-container mt-2" />
        </div>
        <button
          onClick={openGrant}
          className="flex items-center gap-2 bg-primary-container text-white font-headline font-black text-xs uppercase px-5 py-2.5 shrink-0"
        >
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>card_membership</span>
          Conceder Pass
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container p-5 border-l-4 border-primary-container">
          <p className="font-headline text-xs uppercase tracking-widest text-outline mb-1">Total Órdenes</p>
          <p className="font-headline font-black text-4xl">{orders.length}</p>
        </div>
        <div className="bg-surface-container p-5 border-l-4 border-tertiary">
          <p className="font-headline text-xs uppercase tracking-widest text-outline mb-1">Confirmadas</p>
          <p className="font-headline font-black text-4xl text-tertiary">{confirmedCount}</p>
        </div>
        <div className="bg-surface-container p-5 border-l-4 border-primary-container">
          <p className="font-headline text-xs uppercase tracking-widest text-outline mb-1">Activos Ahora</p>
          <p className="font-headline font-black text-4xl">{activeNow}</p>
        </div>
        <div className="bg-surface-container p-5 border-l-4 border-secondary-container">
          <p className="font-headline text-xs uppercase tracking-widest text-outline mb-1">Pendiente Banco</p>
          <p className={`font-headline font-black text-4xl ${pendingBanco > 0 ? "text-secondary" : ""}`}>{pendingBanco}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0">
        {([
          { key: "token" as TabKey, label: `Token $1UP (${tokenOrders.length})` },
          { key: "banco" as TabKey, label: `Banco (${bancoOrders.length})${pendingBanco > 0 ? ` · ${pendingBanco} pendientes` : ""}` },
          { key: "grant" as TabKey, label: `Admin Grant (${grantOrders.length})` },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={`px-6 py-2 font-headline font-black text-xs uppercase tracking-widest transition-colors ${
              tab === key
                ? "bg-primary-container text-white"
                : "bg-surface-container-high text-on-surface/60 hover:text-on-surface"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {statusOptions.map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`font-headline font-bold text-xs uppercase tracking-wider px-4 py-1.5 transition-colors ${
              statusFilter === f
                ? "bg-primary-container text-white"
                : "bg-surface-container text-on-surface/60 hover:text-on-surface"
            }`}
          >
            {f === "all" ? "Todos" : STATUS_LABELS[f] ?? f}
          </button>
        ))}
        <span className="ml-auto font-body text-xs text-outline">
          {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              <th className={TH}>#</th>
              <th className={TH}>Usuario</th>
              <th className={TH}>Método</th>
              <th className={TH}>$1UP</th>
              <th className={TH}>Días</th>
              <th className={TH}>Inicio</th>
              <th className={TH}>Vence</th>
              <th className={TH}>Estado</th>
              <th className={TH}>TX / Comprobante</th>
              <th className={TH}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const isExpired = o.expires_at ? new Date(o.expires_at) < new Date() : true;
              const isOpen    = actionId === o.id;
              const canApprove = tab === "banco" && o.status === "pending_bank";

              return (
                <Fragment key={o.id}>
                  <tr className="border-t border-surface-container-high bg-surface-container hover:bg-surface-container-high/50 transition-colors">
                    {/* # */}
                    <td className={`${TD} font-mono text-xs text-outline`}>{o.id}</td>

                    {/* Usuario */}
                    <td className={TD}>
                      <p className="font-body text-sm text-on-background leading-tight">{userName(o)}</p>
                      {o.user_profiles?.email && (
                        <p className="font-body text-[10px] text-outline truncate max-w-[160px]">{o.user_profiles.email}</p>
                      )}
                      {o.granted_by && (
                        <p className="font-body text-[10px] text-primary-container/70 truncate max-w-[160px]">
                          Por: {o.granted_by}
                        </p>
                      )}
                    </td>

                    {/* Método */}
                    <td className={TD}>
                      <span className={`font-headline text-[10px] px-2 py-0.5 uppercase whitespace-nowrap ${
                        o.payment_method === "token" ? "bg-tertiary/20 text-tertiary" :
                        o.payment_method === "bank"  ? "bg-secondary-container/40 text-secondary" :
                        "bg-primary-container/20 text-primary-container"
                      }`}>
                        {o.payment_method === "token" ? "$1UP Token" :
                         o.payment_method === "bank"  ? "Banco" : "Admin Grant"}
                      </span>
                      {o.bank_accounts && (
                        <p className="font-body text-[10px] text-outline mt-1">{o.bank_accounts.bank_name}</p>
                      )}
                    </td>

                    {/* $1UP */}
                    <td className={`${TD} font-headline font-black text-sm whitespace-nowrap`}>
                      {o.payment_method === "admin_grant" ? (
                        <span className="text-outline text-xs font-normal">—</span>
                      ) : (
                        o.token_amount_paid.toLocaleString()
                      )}
                    </td>

                    {/* Días */}
                    <td className={`${TD} font-body text-sm text-on-surface-variant`}>{o.duration_days}d</td>

                    {/* Inicio */}
                    <td className={`${TD} font-body text-xs text-on-surface-variant whitespace-nowrap`}>
                      {fmt(o.started_at ?? o.paid_at)}
                    </td>

                    {/* Vence */}
                    <td className={TD}>
                      <p className={`font-body text-xs whitespace-nowrap ${
                        o.status === "confirmed" ? (isExpired ? "text-error" : "text-tertiary") : "text-on-surface-variant"
                      }`}>
                        {fmt(o.expires_at)}
                      </p>
                      {o.status === "confirmed" && (
                        <p className={`font-headline text-[10px] uppercase ${isExpired ? "text-error/70" : "text-tertiary/70"}`}>
                          {isExpired ? "Expirado" : "Activo"}
                        </p>
                      )}
                    </td>

                    {/* Estado */}
                    <td className={TD}>
                      <span className={`font-headline text-[10px] px-2 py-0.5 uppercase whitespace-nowrap ${STATUS_COLORS[o.status] ?? ""}`}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                      {o.status === "failed" && o.rejection_reason && (
                        <p className="font-body text-[10px] text-error/70 mt-0.5 max-w-[140px] line-clamp-2">{o.rejection_reason}</p>
                      )}
                    </td>

                    {/* TX / Comprobante */}
                    <td className={TD}>
                      {o.tx_hash ? (
                        <a href={`${BASESCAN}${o.tx_hash}`} target="_blank" rel="noopener noreferrer"
                          className="font-mono text-xs text-primary hover:underline whitespace-nowrap">
                          {o.tx_hash.slice(0, 10)}…{o.tx_hash.slice(-6)}
                        </a>
                      ) : o.comprobante_url ? (
                        <a href={o.comprobante_url} target="_blank" rel="noopener noreferrer"
                          className="font-headline font-bold text-xs text-primary hover:underline flex items-center gap-1 whitespace-nowrap">
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                          Ver
                        </a>
                      ) : (
                        <span className="text-outline text-xs">—</span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className={TD}>
                      <button
                        onClick={() => openAction(o)}
                        className="font-headline font-bold text-xs uppercase text-outline hover:text-on-surface transition-colors flex items-center gap-1 whitespace-nowrap"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {canApprove ? "rate_review" : "edit_note"}
                        </span>
                        {canApprove ? "Revisar" : "Notas"}
                      </button>
                    </td>
                  </tr>

                  {/* Expandable panel */}
                  {isOpen && (
                    <tr className="bg-surface-container-low border-t border-primary-container/20">
                      <td colSpan={10} className="px-4 py-4">
                        <div className="flex flex-wrap gap-4 items-start">
                          <div className="flex-1 min-w-[220px]">
                            <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">
                              Notas internas
                            </label>
                            <textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              rows={2}
                              placeholder="Notas opcionales…"
                              className="w-full bg-surface-container-lowest p-2.5 font-body text-sm border-none resize-none focus:outline-none"
                            />
                          </div>
                          {canApprove && (
                            <div className="flex-1 min-w-[220px]">
                              <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">
                                Motivo de rechazo <span className="font-normal normal-case text-outline/50">(solo si rechazas)</span>
                              </label>
                              <input
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Ej: Monto incorrecto…"
                                className="w-full bg-surface-container-lowest p-2.5 font-body text-sm border-none focus:outline-none"
                              />
                            </div>
                          )}
                          <div className="flex items-end gap-2 flex-wrap pb-0.5">
                            {err && <p className="w-full font-body text-xs text-error">{err}</p>}
                            {canApprove ? (
                              <>
                                <button
                                  onClick={() => doAction(o.id, "approve")}
                                  disabled={saving}
                                  className="bg-tertiary text-white font-headline font-black text-xs uppercase px-5 py-2.5 disabled:opacity-50 flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                  {saving ? "Procesando…" : "Aprobar"}
                                </button>
                                <button
                                  onClick={() => doAction(o.id, "reject")}
                                  disabled={saving || !rejectionReason.trim()}
                                  className="bg-error text-white font-headline font-black text-xs uppercase px-5 py-2.5 disabled:opacity-50 flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                                  Rechazar
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => saveNotes(o.id)}
                                disabled={saving}
                                className="bg-primary-container text-white font-headline font-black text-xs uppercase px-4 py-2.5 disabled:opacity-50"
                              >
                                {saving ? "Guardando…" : "Guardar"}
                              </button>
                            )}
                            <button
                              onClick={() => setActionId(null)}
                              className="bg-surface-container-high text-on-surface font-headline font-black text-xs uppercase px-4 py-2.5"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                        {!canApprove && o.admin_notes && (
                          <p className="font-body text-xs text-outline/70 italic mt-2">{o.admin_notes}</p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="font-body text-sm text-outline text-center py-12">Sin órdenes.</p>
        )}
      </div>

      {/* Grant pass modal */}
      {grantOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 bg-surface-container-high">
              <h2 className="font-headline font-black text-xl uppercase tracking-tighter">
                Conceder <span className="text-primary-container">1UP Pass</span>
              </h2>
              <button onClick={() => setGrantOpen(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* User search */}
              <div>
                <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">
                  Usuario *
                </label>
                {grantUser ? (
                  <div className="flex items-center justify-between bg-surface-container-highest p-3">
                    <div>
                      <p className="font-body text-sm text-on-background">
                        {[grantUser.nombre, grantUser.apellidos].filter(Boolean).join(" ") || grantUser.email}
                      </p>
                      <p className="font-body text-[10px] text-outline">{grantUser.email} · ID #{grantUser.id}</p>
                    </div>
                    <button
                      onClick={() => { setGrantUser(null); setGrantSearch(""); }}
                      className="text-outline hover:text-error text-xs font-headline uppercase"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      value={grantSearch}
                      onChange={(e) => setGrantSearch(e.target.value)}
                      placeholder="Buscar por nombre o correo…"
                      className="w-full bg-surface-container-highest p-3 font-body text-sm border-none focus:outline-none"
                      autoFocus
                    />
                    {profileResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-surface-container-highest z-10 max-h-56 overflow-y-auto">
                        {profileResults.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => { setGrantUser(p); setGrantSearch(""); }}
                            className="w-full text-left px-4 py-3 hover:bg-surface-container-high transition-colors"
                          >
                            <p className="font-body text-sm text-on-background">
                              {[p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email}
                            </p>
                            <p className="font-body text-[10px] text-outline">{p.email} · ID #{p.id}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Start date */}
              <div>
                <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">
                  Fecha de inicio *
                </label>
                <p className="font-body text-[10px] text-outline/60 mb-1">Puede ser una fecha pasada para registrar membresías anteriores.</p>
                <input
                  type="date"
                  value={grantStart}
                  onChange={(e) => setGrantStart(e.target.value)}
                  className="w-full bg-surface-container-highest p-3 font-body text-sm border-none focus:outline-none"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">
                  Duración (días) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={grantDays}
                  onChange={(e) => setGrantDays(e.target.value)}
                  className="w-full bg-surface-container-highest p-3 font-body text-sm border-none focus:outline-none"
                />
                {grantStart && Number(grantDays) > 0 && (
                  <p className="font-body text-[10px] text-outline mt-1">
                    Vence: {new Date(new Date(grantStart + "T00:00:00").getTime() + Number(grantDays) * 86400000).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">
                  Notas internas <span className="font-normal normal-case text-outline/50">(opcional)</span>
                </label>
                <input
                  value={grantNotes}
                  onChange={(e) => setGrantNotes(e.target.value)}
                  placeholder="Ej: Beneficio especial torneo #12…"
                  className="w-full bg-surface-container-highest p-3 font-body text-sm border-none focus:outline-none"
                />
              </div>

              {grantErr && <p className="font-body text-sm text-error">{grantErr}</p>}
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={handleGrant}
                disabled={grantSaving}
                className="flex-1 bg-primary-container text-white font-headline font-black text-sm uppercase py-3 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>card_membership</span>
                {grantSaving ? "Procesando…" : "Conceder Pass"}
              </button>
              <button
                onClick={() => setGrantOpen(false)}
                className="bg-surface-container-high text-on-surface font-headline font-black text-sm uppercase px-6 py-3"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
