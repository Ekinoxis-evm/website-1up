"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

interface DiscountRule {
  id: number;
  name: string;
  description: string | null;
  trigger_type: string;
  discount_pct: number;
  applies_to: string;
  is_active: boolean | null;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string | null;
}

interface Props { rules: DiscountRule[] }

const EMPTY = {
  name: "", description: "", triggerType: "comfenalco",
  discountPct: "10", appliesTo: "courses", isActive: true,
  validFrom: "", validUntil: "",
};

const TRIGGER_LABELS: Record<string, string> = {
  comfenalco: "Afiliado Comfenalco",
  promo_code: "Código Promo",
  manual:     "Manual",
  auto:       "Automático",
};

const APPLIES_LABELS: Record<string, string> = {
  courses: "Cursos",
  pass:    "1UP Pass",
  all:     "Todo",
};

const TRIGGER_BADGE: Record<string, string> = {
  comfenalco: "bg-secondary-container text-white",
  promo_code: "bg-primary-container text-white",
  manual:     "bg-surface-container-highest text-on-surface-variant",
  auto:       "bg-tertiary text-background",
};

export function AdminDiscountsClient({ rules }: Props) {
  const router = useRouter();
  const { getAccessToken, user } = usePrivy();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountRule | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  function openEdit(r: DiscountRule) {
    setEditing(r);
    setForm({
      name:        r.name,
      description: r.description ?? "",
      triggerType: r.trigger_type,
      discountPct: String(r.discount_pct),
      appliesTo:   r.applies_to,
      isActive:    r.is_active ?? true,
      validFrom:   r.valid_from ? r.valid_from.slice(0, 16) : "",
      validUntil:  r.valid_until ? r.valid_until.slice(0, 16) : "",
    });
    setOpen(true);
  }

  async function handleSave() {
    setLoading(true);
    const method = editing ? "PUT" : "POST";
    const body = {
      ...form,
      ...(editing ? { id: editing.id } : {}),
      createdBy: user?.email?.address ?? "",
      validFrom:  form.validFrom  || null,
      validUntil: form.validUntil || null,
    };
    const res = await fetch("/api/admin/discounts", {
      method, headers: await authHeaders(), body: JSON.stringify(body),
    });
    if (!res.ok) {
      const { error } = await res.json();
      alert(`Error: ${error}`);
    } else {
      setOpen(false);
      router.refresh();
    }
    setLoading(false);
  }

  async function handleToggle(r: DiscountRule) {
    await fetch("/api/admin/discounts", {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify({ ...r, id: r.id, isActive: !r.is_active, triggerType: r.trigger_type, discountPct: r.discount_pct, appliesTo: r.applies_to }),
    });
    router.refresh();
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta regla de descuento?")) return;
    await fetch("/api/admin/discounts", {
      method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
            DESCUENTOS <span className="text-secondary-container">REGLAS</span>
          </h1>
          <div className="h-1 w-16 bg-secondary-container mt-2" />
        </div>
        <button
          onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }}
          className="bg-secondary-container text-white font-headline font-black text-sm px-6 py-3 skew-fix"
        >
          <span className="block skew-content">+ NUEVA REGLA</span>
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-surface-container-low border-l-4 border-secondary-container p-4 mb-6">
        <p className="font-body text-sm text-on-surface-variant">
          Las reglas de tipo <strong>Afiliado Comfenalco</strong> se aplican automáticamente
          al momento del checkout si el usuario tiene verificación activa.
          Siempre se aplica el <strong>mayor descuento disponible</strong>.
        </p>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-container-highest">
            {["Nombre", "Tipo", "Aplica a", "Descuento", "Vigencia", "Estado", "Acciones"].map((h) => (
              <th key={h} className="text-left font-headline font-black text-xs uppercase tracking-widest text-outline px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rules.map((r, i) => (
            <tr key={r.id} className={i % 2 === 0 ? "bg-surface-container" : "bg-surface-container-low"}>
              <td className="px-4 py-3">
                <div className="font-headline font-bold text-on-background">{r.name}</div>
                {r.description && <div className="font-body text-xs text-outline mt-0.5">{r.description}</div>}
              </td>
              <td className="px-4 py-3">
                <span className={`font-headline font-black text-[10px] px-2 py-1 uppercase tracking-widest ${TRIGGER_BADGE[r.trigger_type]}`}>
                  {TRIGGER_LABELS[r.trigger_type] ?? r.trigger_type}
                </span>
              </td>
              <td className="px-4 py-3 font-body text-on-surface-variant text-xs">{APPLIES_LABELS[r.applies_to] ?? r.applies_to}</td>
              <td className="px-4 py-3 font-headline font-black text-primary text-lg">{r.discount_pct}%</td>
              <td className="px-4 py-3 font-body text-xs text-on-surface-variant">
                {r.valid_from ? new Date(r.valid_from).toLocaleDateString("es-CO") : "—"}
                {" → "}
                {r.valid_until ? new Date(r.valid_until).toLocaleDateString("es-CO") : "Indefinido"}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => handleToggle(r)}
                  className={`font-headline font-black text-[10px] px-3 py-1 uppercase ${r.is_active ? "bg-primary-container text-white" : "bg-surface-container-highest text-outline"}`}
                >
                  {r.is_active ? "Activo" : "Inactivo"}
                </button>
              </td>
              <td className="px-4 py-3 flex gap-2">
                <button onClick={() => openEdit(r)} className="text-secondary font-headline font-bold text-xs uppercase">Editar</button>
                <button onClick={() => handleDelete(r.id)} className="text-error font-headline font-bold text-xs uppercase">Eliminar</button>
              </td>
            </tr>
          ))}
          {rules.length === 0 && (
            <tr><td colSpan={7} className="px-4 py-12 text-center text-outline font-body">Sin reglas de descuento.</td></tr>
          )}
        </tbody>
      </table>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-surface-container border-4 border-secondary-container p-8 w-full max-w-lg my-8">
            <h2 className="font-headline font-black text-xl mb-6 uppercase">
              {editing ? "EDITAR REGLA" : "NUEVA REGLA DE DESCUENTO"}
            </h2>

            <div className="space-y-3">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nombre de la regla"
                className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descripción (opcional)"
                rows={2}
                className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold resize-none"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">Tipo de activación</label>
                  <select
                    value={form.triggerType}
                    onChange={(e) => setForm({ ...form, triggerType: e.target.value })}
                    className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold appearance-none"
                  >
                    <option value="comfenalco">Afiliado Comfenalco</option>
                    <option value="promo_code">Código Promo</option>
                    <option value="manual">Manual</option>
                    <option value="auto">Automático</option>
                  </select>
                </div>
                <div>
                  <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">Aplica a</label>
                  <select
                    value={form.appliesTo}
                    onChange={(e) => setForm({ ...form, appliesTo: e.target.value })}
                    className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold appearance-none"
                  >
                    <option value="courses">Cursos</option>
                    <option value="pass">1UP Pass</option>
                    <option value="all">Todo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">Descuento (%)</label>
                <input
                  value={form.discountPct}
                  onChange={(e) => setForm({ ...form, discountPct: e.target.value })}
                  type="number" min={1} max={100}
                  placeholder="Ej: 20"
                  className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">Válido desde</label>
                  <input
                    value={form.validFrom}
                    onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                    type="datetime-local"
                    className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold"
                  />
                </div>
                <div>
                  <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">Válido hasta</label>
                  <input
                    value={form.validUntil}
                    onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                    type="datetime-local"
                    className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="font-headline font-bold text-sm uppercase tracking-widest">Activar inmediatamente</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 bg-secondary-container text-white font-headline font-black py-3 disabled:opacity-60"
              >
                {loading ? "GUARDANDO..." : "GUARDAR"}
              </button>
              <button onClick={() => setOpen(false)} className="flex-1 bg-surface-container-highest font-headline font-black py-3">
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
