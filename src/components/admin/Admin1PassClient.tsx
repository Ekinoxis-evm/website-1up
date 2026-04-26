"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { AdminPassConfigCard } from "./AdminPassConfigCard";
import type { PassBenefit, PassConfig } from "@/types/database.types";

interface Props {
  config:         PassConfig | null;
  benefits:       PassBenefit[];
  confirmedCount: number;
  activeNow:      number;
}

const EMPTY = { title: "", description: "", sortOrder: "0" };

export function Admin1PassClient({ config, benefits, confirmedCount, activeNow }: Props) {
  const { getAccessToken } = usePrivy();
  const router = useRouter();

  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<PassBenefit | null>(null);
  const [form, setForm]             = useState(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setSaveError(null);
    setModalOpen(true);
  }

  function openEdit(b: PassBenefit) {
    setEditing(b);
    setForm({ title: b.title, description: b.description ?? "", sortOrder: String(b.sort_order ?? 0) });
    setSaveError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { setSaveError("El título es requerido."); return; }
    setSaving(true);
    const method = editing ? "PUT" : "POST";
    const body = {
      title:       form.title.trim(),
      description: form.description.trim() || null,
      sortOrder:   Number(form.sortOrder),
      ...(editing ? { id: editing.id } : {}),
    };
    const res = await fetch("/api/admin/pass-benefits", {
      method,
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) { setSaveError("Error al guardar. Intenta de nuevo."); return; }
    setModalOpen(false);
    router.refresh();
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este beneficio?")) return;
    await fetch("/api/admin/pass-benefits", {
      method: "DELETE",
      headers: await authHeaders(),
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

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
        <AdminPassConfigCard config={config} />
      ) : (
        <div className="bg-surface-container p-6 border-l-4 border-error">
          <p className="font-body text-sm text-error">Error cargando la configuración del pass.</p>
        </div>
      )}

      {/* Benefits — inline CRUD */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline font-black text-xl uppercase tracking-tighter">
            Beneficios <span className="text-primary-container">({benefits.length})</span>
          </h2>
          <button
            onClick={openNew}
            className="flex items-center gap-1 bg-primary-container text-white font-headline font-black text-xs uppercase px-4 py-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Agregar
          </button>
        </div>

        <div className="space-y-2">
          {benefits.map((b) => (
            <div
              key={b.id}
              className="bg-surface-container p-4 border-l-4 border-primary-container flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span
                  className="material-symbols-outlined text-primary-container text-base mt-0.5 shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <div className="min-w-0">
                  <p className="font-headline font-bold text-sm text-on-background">{b.title}</p>
                  {b.description && (
                    <p className="font-body text-xs text-outline mt-0.5">{b.description}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-3 shrink-0">
                <button
                  onClick={() => openEdit(b)}
                  className="text-secondary font-headline font-bold text-xs uppercase hover:text-secondary-container transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="text-error font-headline font-bold text-xs uppercase hover:opacity-80 transition-opacity"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
          {benefits.length === 0 && (
            <p className="text-outline font-body text-sm py-8 text-center">
              Sin beneficios configurados. Agrega el primero.
            </p>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-surface-container-high">
              <h2 className="font-headline font-black text-xl uppercase tracking-tighter">
                {editing ? "Editar Beneficio" : "Nuevo Beneficio"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-outline hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-3">
              <div>
                <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">
                  Título *
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ej: Acceso a todas las zonas"
                  className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold placeholder:text-outline/40"
                />
              </div>
              <div>
                <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">
                  Descripción
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descripción opcional"
                  rows={2}
                  className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold placeholder:text-outline/40 resize-none"
                />
              </div>
              <div>
                <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">
                  Orden
                </label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold"
                />
              </div>

              {saveError && <p className="font-body text-sm text-error">{saveError}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-primary-container text-white font-headline font-black uppercase tracking-tighter py-3 disabled:opacity-50"
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 bg-surface-container-high text-on-surface font-headline font-black uppercase tracking-tighter py-3"
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
