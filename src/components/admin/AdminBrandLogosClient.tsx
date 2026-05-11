"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ImageUpload } from "@/components/admin/ImageUpload";
import type { BrandLogo } from "@/types/database.types";

interface Props { logos: BrandLogo[] }

type FormState = {
  name: string; logoUrl: string; websiteUrl: string; sortOrder: number; isActive: boolean;
};

const EMPTY: FormState = { name: "", logoUrl: "", websiteUrl: "", sortOrder: 0, isActive: true };

export function AdminBrandLogosClient({ logos }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [open, setOpen]       = useState(false);
  const [editing, setEditing] = useState<BrandLogo | null>(null);
  const [form, setForm]       = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  function openEdit(logo: BrandLogo) {
    setEditing(logo);
    setForm({
      name:       logo.name,
      logoUrl:    logo.logo_url,
      websiteUrl: logo.website_url ?? "",
      sortOrder:  logo.sort_order,
      isActive:   logo.is_active,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.logoUrl) { setSaveError("Nombre e imagen son requeridos."); return; }
    setLoading(true); setSaveError(null);
    const method = editing ? "PUT" : "POST";
    const body = { ...form, ...(editing ? { id: editing.id } : {}) };
    const res = await fetch("/api/admin/brand-logos", {
      method, headers: await authHeaders(), body: JSON.stringify(body),
    });
    if (!res.ok) { setSaveError("Error al guardar. Intenta de nuevo."); setLoading(false); return; }
    setOpen(false); setLoading(false); router.refresh();
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este logo?")) return;
    await fetch("/api/admin/brand-logos", {
      method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
            LOGOS <span className="text-primary-container">BANNER</span>
          </h1>
          <div className="h-1 w-16 bg-primary-container mt-2" />
          <p className="font-body text-sm text-outline mt-2">
            Marcas que aparecen en el banner animado del home. Recomendado: PNG o SVG con fondo transparente.
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }}
          className="bg-primary-container text-white font-headline font-black text-sm px-6 py-3 skew-fix hover:neo-shadow-pink transition-all"
        >
          <span className="block skew-content">+ AGREGAR LOGO</span>
        </button>
      </div>

      {/* Logo grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {logos.map((logo) => (
          <div
            key={logo.id}
            className={`bg-surface-container p-4 flex flex-col items-center gap-3 ${!logo.is_active ? "opacity-40" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo.logo_url}
              alt={logo.name}
              className="h-12 w-full object-contain"
            />
            <p className="font-headline font-bold text-xs uppercase text-center text-on-surface/70 truncate w-full">
              {logo.name}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => openEdit(logo)}
                className="p-1.5 bg-surface-container-high hover:bg-primary-container/20 transition-colors"
                title="Editar"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
              <button
                onClick={() => handleDelete(logo.id)}
                className="p-1.5 bg-surface-container-high hover:bg-error/20 hover:text-error transition-colors"
                title="Eliminar"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          </div>
        ))}
        {logos.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-outline/30">image</span>
            <p className="font-headline text-sm text-outline/50 uppercase mt-2">Sin logos aún</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
          <div className="bg-surface-container w-full max-w-md p-8 relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-outline hover:text-on-surface"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h2 className="font-headline font-black text-2xl uppercase tracking-tighter mb-6">
              {editing ? "EDITAR" : "NUEVO"} <span className="text-primary-container">LOGO</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-2">
                  Logo (PNG / SVG — fondo transparente, máx 5MB) *
                </label>
                <ImageUpload
                  currentUrl={form.logoUrl || null}
                  folder="brand-logos"
                  entityId={editing?.id}
                  onUploaded={(url) => setForm({ ...form, logoUrl: url })}
                  getAccessToken={getAccessToken}
                  aspectRatio="video"
                />
              </div>

              <div>
                <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">
                  Nombre *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Movistar, Red Bull…"
                  className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">
                  Sitio web <span className="normal-case font-normal text-outline/50">(opcional)</span>
                </label>
                <input
                  value={form.websiteUrl}
                  onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">
                    Orden
                  </label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer self-end pb-3">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 accent-primary-container"
                  />
                  <span className="font-headline font-bold text-xs uppercase tracking-widest text-outline">Activo</span>
                </label>
              </div>

              {saveError && <p className="font-body text-sm text-error">{saveError}</p>}

              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-primary-container text-white font-headline font-black py-3 uppercase tracking-tighter disabled:opacity-40 hover:neo-shadow-pink transition-all"
              >
                {loading ? "GUARDANDO…" : "GUARDAR"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
