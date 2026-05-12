"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import type { BankAccount } from "@/types/database.types";

const BASESCAN_ADDR = "https://basescan.org/address/";

interface Props {
  accounts: BankAccount[];
  treasuryAddress: string;
}

type FormState = {
  bankName: string; accountType: string; accountNumber: string;
  holderName: string; holderDocument: string; instructions: string;
  isActive: boolean; sortOrder: number;
};

const EMPTY: FormState = {
  bankName: "", accountType: "ahorros", accountNumber: "",
  holderName: "", holderDocument: "", instructions: "",
  isActive: true, sortOrder: 0,
};

export function AdminBankAccountsClient({ accounts, treasuryAddress }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Treasury wallet state
  const [editingTreasury, setEditingTreasury] = useState(false);
  const [treasuryInput, setTreasuryInput] = useState(treasuryAddress);
  const [treasuryLoading, setTreasuryLoading] = useState(false);
  const [treasuryError, setTreasuryError] = useState<string | null>(null);
  const [treasuryCopied, setTreasuryCopied] = useState(false);

  function copyTreasury() {
    navigator.clipboard.writeText(treasuryAddress);
    setTreasuryCopied(true);
    setTimeout(() => setTreasuryCopied(false), 2000);
  }

  async function saveTreasury() {
    setTreasuryLoading(true); setTreasuryError(null);
    const token = await getAccessToken();
    const res = await fetch("/api/admin/pass-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ recipientAddress: treasuryInput.trim() }),
    });
    setTreasuryLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setTreasuryError(d.error ?? "Error al guardar");
      return;
    }
    setEditingTreasury(false);
    router.refresh();
  }

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  function openEdit(a: BankAccount) {
    setEditing(a);
    setForm({
      bankName: a.bank_name, accountType: a.account_type ?? "ahorros",
      accountNumber: a.account_number, holderName: a.holder_name,
      holderDocument: a.holder_document ?? "", instructions: a.instructions ?? "",
      isActive: a.is_active ?? true, sortOrder: a.sort_order ?? 0,
    });
    setOpen(true);
  }

  async function handleSave() {
    setLoading(true); setSaveError(null);
    const method = editing ? "PUT" : "POST";
    const body = { ...form, ...(editing ? { id: editing.id } : {}) };
    const res = await fetch("/api/admin/bank-accounts", { method, headers: await authHeaders(), body: JSON.stringify(body) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSaveError(data.error ?? "Error al guardar. Intenta de nuevo.");
      setLoading(false); return;
    }
    setOpen(false); setLoading(false); router.refresh();
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta cuenta bancaria?")) return;
    await fetch("/api/admin/bank-accounts", { method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ id }) });
    router.refresh();
  }

  const F = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      {/* ── Treasury Wallet ─────────────────────────────────────── */}
      <div className="bg-surface-container border-l-8 border-tertiary p-6 mb-10">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-tertiary text-2xl shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
              account_balance_wallet
            </span>
            <div>
              <p className="font-headline text-[10px] uppercase tracking-widest text-tertiary mb-0.5">Destinos de pago — $1UP</p>
              <h2 className="font-headline font-black text-xl uppercase tracking-tighter">Wallet de Tesorería</h2>
            </div>
          </div>
          {!editingTreasury && (
            <button
              onClick={() => { setTreasuryInput(treasuryAddress); setEditingTreasury(true); setTreasuryError(null); }}
              className="flex items-center gap-1 font-headline font-bold text-xs uppercase text-secondary hover:text-secondary-container transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Editar
            </button>
          )}
        </div>

        <p className="font-body text-xs text-on-surface/50 mb-4">
          Esta wallet recibe <strong>todos los pagos en $1UP</strong> de la plataforma — inscripciones a cursos y compras del 1UP Pass pagadas con tokens.
        </p>

        {!editingTreasury ? (
          <div className="bg-surface-container-low p-4 flex items-center justify-between gap-4 flex-wrap">
            {treasuryAddress ? (
              <>
                <p className="font-mono text-sm text-on-surface break-all">{treasuryAddress}</p>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={copyTreasury}
                    className="flex items-center gap-1 font-headline text-xs uppercase text-outline hover:text-tertiary transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">{treasuryCopied ? "check" : "content_copy"}</span>
                    {treasuryCopied ? "Copiado" : "Copiar"}
                  </button>
                  <a
                    href={`${BASESCAN_ADDR}${treasuryAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-headline text-xs uppercase text-outline hover:text-tertiary transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                    BaseScan
                  </a>
                </div>
              </>
            ) : (
              <p className="font-body text-sm text-error">No configurada — los pagos con tokens fallarán.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <input
              value={treasuryInput}
              onChange={(e) => setTreasuryInput(e.target.value)}
              placeholder="0x..."
              className="w-full bg-surface-container-lowest text-on-background p-3 font-mono text-sm border-none focus:outline-none"
            />
            {treasuryError && <p className="font-body text-xs text-error">{treasuryError}</p>}
            <div className="flex gap-3">
              <button
                onClick={saveTreasury}
                disabled={treasuryLoading || !treasuryInput.trim()}
                className="flex-1 bg-tertiary text-background font-headline font-black py-2.5 text-sm uppercase disabled:opacity-40"
              >
                {treasuryLoading ? "GUARDANDO…" : "GUARDAR WALLET"}
              </button>
              <button
                onClick={() => setEditingTreasury(false)}
                className="flex-1 bg-surface-container-highest font-headline font-black py-2.5 text-sm"
              >
                CANCELAR
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── COP Bank Accounts ───────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
            CUENTAS <span className="text-primary-container">BANCARIAS</span>
          </h1>
          <div className="h-1 w-16 bg-primary-container mt-2" />
        </div>
        <button
          onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }}
          className="bg-primary-container text-white font-headline font-black text-sm px-6 py-3 skew-fix hover:neo-shadow-pink transition-all"
        >
          <span className="block skew-content">+ AGREGAR CUENTA</span>
        </button>
      </div>

      <div className="space-y-3">
        {accounts.map((a) => (
          <div key={a.id} className="bg-surface-container border-l-4 border-secondary-container p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-headline font-black text-sm uppercase text-on-surface">{a.bank_name}</span>
                {a.account_type && (
                  <span className="bg-secondary-container/20 text-secondary text-[10px] font-headline uppercase px-2 py-0.5">
                    {a.account_type}
                  </span>
                )}
                {!a.is_active && (
                  <span className="bg-error/20 text-error text-[10px] font-headline uppercase px-2 py-0.5">
                    INACTIVA
                  </span>
                )}
              </div>
              <p className="font-mono text-xs text-on-surface/60 mt-0.5">{a.account_number}</p>
              <p className="font-body text-xs text-on-surface/50 mt-0.5">{a.holder_name}{a.holder_document ? ` · ${a.holder_document}` : ""}</p>
              {a.instructions && (
                <p className="font-body text-xs text-on-surface/40 mt-1 italic">{a.instructions}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => openEdit(a)} className="bg-surface-container-highest px-3 py-2 font-headline text-xs uppercase hover:bg-secondary-container/20 transition-colors">
                EDITAR
              </button>
              <button onClick={() => handleDelete(a.id)} className="bg-error/10 text-error px-3 py-2 font-headline text-xs uppercase hover:bg-error/20 transition-colors">
                ELIMINAR
              </button>
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <div className="bg-surface-container p-10 text-center">
            <p className="font-headline text-sm text-on-surface/40 uppercase">No hay cuentas bancarias</p>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-surface-container border-4 border-primary-container p-8 w-full max-w-lg my-8">
            <h2 className="font-headline font-black text-xl uppercase mb-6">
              {editing ? "EDITAR CUENTA" : "NUEVA CUENTA"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">Banco *</label>
                <input value={form.bankName} onChange={F("bankName")} placeholder="Bancolombia" className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">Tipo</label>
                  <select value={form.accountType} onChange={F("accountType")} className="w-full bg-surface-container-lowest text-on-background p-3 font-bold border-none focus:outline-none">
                    <option value="ahorros">Ahorros</option>
                    <option value="corriente">Corriente</option>
                  </select>
                </div>
                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">Número *</label>
                  <input value={form.accountNumber} onChange={F("accountNumber")} placeholder="12345678" className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">Titular *</label>
                  <input value={form.holderName} onChange={F("holderName")} placeholder="1UP Gaming Tower SAS" className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none" />
                </div>
                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">NIT / CC titular</label>
                  <input value={form.holderDocument} onChange={F("holderDocument")} placeholder="900123456-7" className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">Instrucciones</label>
                <textarea
                  value={form.instructions}
                  onChange={F("instructions")}
                  rows={2}
                  placeholder="Incluye tu email en el concepto del pago"
                  className="w-full bg-surface-container-lowest text-on-background p-3 font-body text-sm border-none focus:outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest text-outline mb-1">Orden</label>
                  <input
                    type="number" value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none"
                  />
                </div>
                <div className="flex items-end pb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox" checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="font-headline font-bold text-xs uppercase text-on-surface">Activa</span>
                  </label>
                </div>
              </div>
            </div>

            {saveError && <p className="text-error font-body text-sm mt-4">{saveError}</p>}

            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={loading} className="flex-1 bg-primary-container text-white font-headline font-black py-3 disabled:opacity-50">
                {loading ? "GUARDANDO..." : "GUARDAR"}
              </button>
              <button onClick={() => { setOpen(false); setSaveError(null); }} className="flex-1 bg-surface-container-highest font-headline font-black py-3">
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
