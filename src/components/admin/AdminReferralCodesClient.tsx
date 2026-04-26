"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import type { ReferralCode } from "@/types/database.types";

const CURRENT_YEAR = new Date().getFullYear();

interface Props { codes: ReferralCode[] }

const EMPTY = { code: "", description: "", maxUses: "" };

export function AdminReferralCodesClient({ codes }: Props) {
  const { getAccessToken } = usePrivy();
  const router = useRouter();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  function openNew() {
    setForm(EMPTY);
    setSaveError(null);
    setModalOpen(true);
  }

  async function handleCreate() {
    if (!form.code.trim()) { setSaveError("El código es requerido."); return; }
    setSaving(true);
    setSaveError(null);
    const res = await fetch("/api/admin/referral-codes", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        code:        form.code.trim().toUpperCase(),
        description: form.description.trim() || null,
        maxUses:     form.maxUses ? Number(form.maxUses) : null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string };
      setSaveError(d.error ?? "Error al guardar.");
      return;
    }
    setModalOpen(false);
    router.refresh();
  }

  async function toggleActive(c: ReferralCode) {
    await fetch("/api/admin/referral-codes", {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify({ id: c.id, isActive: !c.is_active }),
    });
    router.refresh();
  }

  const totalUses = codes.reduce((sum, c) => sum + c.used_count, 0);
  const activeCodes = codes.filter((c) => c.is_active).length;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
          CÓDIGOS DE <span className="text-primary-container">REFERIDO</span>
        </h1>
        <div className="h-1 w-16 bg-primary-container mt-2" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-container p-6 border-l-4 border-primary-container">
          <p className="font-headline text-xs uppercase tracking-widest text-outline mb-2">Total Códigos</p>
          <p className="font-headline font-black text-4xl">{codes.length}</p>
        </div>
        <div className="bg-surface-container p-6 border-l-4 border-secondary-container">
          <p className="font-headline text-xs uppercase tracking-widest text-outline mb-2">Activos</p>
          <p className="font-headline font-black text-4xl">{activeCodes}</p>
        </div>
        <div className="bg-surface-container p-6 border-l-4 border-tertiary">
          <p className="font-headline text-xs uppercase tracking-widest text-outline mb-2">Usos Totales</p>
          <p className="font-headline font-black text-4xl">{totalUses}</p>
        </div>
      </div>

      {/* Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline font-black text-xl uppercase tracking-tighter">
            Códigos <span className="text-primary-container">({codes.length})</span>
          </h2>
          <button
            onClick={openNew}
            className="flex items-center gap-1 bg-primary-container text-white font-headline font-black text-xs uppercase px-4 py-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Nuevo Código
          </button>
        </div>

        <div className="space-y-2">
          {codes.map((c) => {
            const pct = c.max_uses ? Math.round((c.used_count / c.max_uses) * 100) : null;
            const age = CURRENT_YEAR - new Date(c.created_at).getFullYear();
            return (
              <div
                key={c.id}
                className={`bg-surface-container p-4 border-l-4 flex items-start justify-between gap-4 ${c.is_active ? "border-secondary-container" : "border-outline/20 opacity-60"}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono font-black text-lg tracking-widest text-on-background">{c.code}</span>
                    <span className={`text-[10px] font-headline uppercase px-2 py-0.5 ${c.is_active ? "bg-secondary-container/20 text-secondary" : "bg-surface-container-high text-outline"}`}>
                      {c.is_active ? "ACTIVO" : "INACTIVO"}
                    </span>
                  </div>
                  {c.description && (
                    <p className="font-body text-xs text-outline mt-0.5">{c.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <span className="font-headline text-xs text-on-surface/50">
                      {c.used_count} {c.max_uses ? `/ ${c.max_uses} usos` : "usos"}
                      {pct !== null && ` (${pct}%)`}
                    </span>
                    <span className="font-headline text-xs text-on-surface/30">
                      {new Date(c.created_at).toLocaleDateString("es-CO")}
                    </span>
                    {age === 0 && <span className="text-[10px] font-headline uppercase text-tertiary">NUEVO</span>}
                  </div>
                  {c.max_uses && (
                    <div className="mt-2 h-1 w-32 bg-surface-container-high">
                      <div
                        className="h-full bg-primary-container transition-all"
                        style={{ width: `${Math.min(pct ?? 0, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => toggleActive(c)}
                  className={`shrink-0 font-headline font-bold text-xs uppercase hover:opacity-80 transition-opacity ${c.is_active ? "text-error" : "text-secondary"}`}
                >
                  {c.is_active ? "Desactivar" : "Activar"}
                </button>
              </div>
            );
          })}
          {codes.length === 0 && (
            <p className="text-outline font-body text-sm py-8 text-center">Sin códigos. Crea el primero.</p>
          )}
        </div>
      </div>

      {/* Create modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-surface-container-high">
              <h2 className="font-headline font-black text-xl uppercase tracking-tighter">Nuevo Código</h2>
              <button onClick={() => setModalOpen(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Código *</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="EJ: TORNEO2025"
                  maxLength={30}
                  className="w-full bg-surface-container-lowest text-on-background p-3 font-mono font-black tracking-widest border-none uppercase"
                />
                <p className="font-body text-[10px] text-outline/50 mt-1">Solo mayúsculas, números y _ (2–30 caracteres)</p>
              </div>
              <div>
                <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Descripción</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ej: Código para evento X"
                  className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none"
                />
              </div>
              <div>
                <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">
                  Límite de usos <span className="text-outline/50 normal-case font-normal">(vacío = ilimitado)</span>
                </label>
                <input
                  type="number"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  placeholder="100"
                  min={1}
                  className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none"
                />
              </div>

              {saveError && <p className="font-body text-sm text-error">{saveError}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 bg-primary-container text-white font-headline font-black uppercase tracking-tighter py-3 disabled:opacity-50"
                >
                  {saving ? "Guardando…" : "Crear Código"}
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 bg-surface-container-high font-headline font-black uppercase tracking-tighter py-3"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
