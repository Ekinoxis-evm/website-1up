"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ImageUpload } from "@/components/admin/ImageUpload";
import type { Aliado } from "@/types/database.types";

interface Props { aliados: Aliado[] }

type FormState = {
  name: string; nit: string; email: string;
  apiUrl: string; apiKey: string;
  logoUrl: string; websiteUrl: string;
  sortOrder: number; showInBanner: boolean; isActive: boolean;
};

const EMPTY: FormState = {
  name: "", nit: "", email: "",
  apiUrl: "", apiKey: "",
  logoUrl: "", websiteUrl: "",
  sortOrder: 0, showInBanner: false, isActive: true,
};

export function AdminAliadosClient({ aliados }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [open, setOpen]       = useState(false);
  const [editing, setEditing] = useState<Aliado | null>(null);
  const [form, setForm]       = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<number | null>(null);
  const [tab, setTab]         = useState<"banner" | "api">("banner");

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  function openEdit(a: Aliado) {
    setEditing(a);
    setForm({
      name:         a.name,
      nit:          a.nit          ?? "",
      email:        a.email        ?? "",
      apiUrl:       a.api_url      ?? "",
      apiKey:       a.api_key      ?? "",
      logoUrl:      a.logo_url     ?? "",
      websiteUrl:   a.website_url  ?? "",
      sortOrder:    a.sort_order   ?? 0,
      showInBanner: a.show_in_banner ?? false,
      isActive:     a.is_active    ?? true,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name) { setSaveError("El nombre es requerido."); return; }
    setLoading(true); setSaveError(null);
    const method = editing ? "PUT" : "POST";
    const body = { ...form, ...(editing ? { id: editing.id } : {}) };
    const res = await fetch("/api/admin/aliados", {
      method, headers: await authHeaders(), body: JSON.stringify(body),
    });
    if (!res.ok) { setSaveError("Error al guardar. Intenta de nuevo."); setLoading(false); return; }
    setOpen(false); setLoading(false); router.refresh();
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este aliado?")) return;
    await fetch("/api/admin/aliados", {
      method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  const bannerAliados = aliados.filter((a) => a.show_in_banner);
  const apiAliados    = aliados.filter((a) => !a.show_in_banner);

  function AliadoRow({ a }: { a: Aliado }) {
    return (
      <div className="bg-surface-container p-5 border-l-4 border-secondary-container flex items-center gap-4">
        {a.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.logo_url} alt={a.name} className="h-10 w-16 object-contain shrink-0 opacity-80" />
        )}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <p className="text-[10px] font-headline uppercase text-outline mb-1">Nombre</p>
            <p className="font-headline font-bold text-on-background text-sm">{a.name}</p>
          </div>
          {a.nit && (
            <div>
              <p className="text-[10px] font-headline uppercase text-outline mb-1">NIT</p>
              <p className="font-body text-sm text-on-background">{a.nit}</p>
            </div>
          )}
          {a.website_url && (
            <div>
              <p className="text-[10px] font-headline uppercase text-outline mb-1">Sitio web</p>
              <p className="font-body text-xs text-on-background/60 truncate">{a.website_url}</p>
            </div>
          )}
          {a.api_key && (
            <div>
              <p className="text-[10px] font-headline uppercase text-outline mb-1">API Key</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-xs text-on-background/60">
                  {showKey === a.id ? a.api_key : "••••••••"}
                </p>
                <button onClick={() => setShowKey(showKey === a.id ? null : a.id)} className="text-outline hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-sm">
                    {showKey === a.id ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {!a.is_active && (
            <span className="font-headline font-bold text-[10px] uppercase text-outline bg-surface-container-high px-2 py-0.5">
              Inactivo
            </span>
          )}
          <div className="flex gap-3">
            <button onClick={() => openEdit(a)} className="text-secondary font-headline font-bold text-xs uppercase hover:text-secondary-container">
              Editar
            </button>
            <button onClick={() => handleDelete(a.id)} className="text-error font-headline font-bold text-xs uppercase">
              Eliminar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
            ALIADOS <span className="text-primary-container">& SPONSORS</span>
          </h1>
          <div className="h-1 w-16 bg-primary-container mt-2" />
          <p className="font-body text-sm text-outline mt-2">
            Sponsors del banner + aliados con integración API.
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }}
          className="bg-primary-container text-white font-headline font-black text-sm px-6 py-3 skew-fix hover:neo-shadow-pink transition-all"
        >
          <span className="block skew-content">+ AGREGAR</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6">
        {(["banner", "api"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-2 font-headline font-black text-xs uppercase tracking-widest transition-colors ${
              tab === t
                ? "bg-primary-container text-white"
                : "bg-surface-container-high text-on-surface/60 hover:text-on-surface"
            }`}
          >
            {t === "banner" ? `Banner (${bannerAliados.length})` : `API / Verificación (${apiAliados.length})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {tab === "banner" && (
          <>
            {bannerAliados.map((a) => <AliadoRow key={a.id} a={a} />)}
            {bannerAliados.length === 0 && (
              <div className="py-16 text-center text-on-surface/30 font-headline uppercase text-sm">
                Sin sponsors en el banner.
              </div>
            )}
          </>
        )}
        {tab === "api" && (
          <>
            {apiAliados.map((a) => <AliadoRow key={a.id} a={a} />)}
            {apiAliados.length === 0 && (
              <div className="py-16 text-center text-on-surface/30 font-headline uppercase text-sm">
                Sin aliados con API registrados.
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-background/80 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-surface-container border-4 border-primary-container p-8 w-full max-w-lg my-8">
            <h2 className="font-headline font-black text-xl mb-6 uppercase">
              {editing ? "EDITAR ALIADO" : "NUEVO ALIADO"}
            </h2>

            {/* Logo upload */}
            <div className="mb-4">
              <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-2">
                Logo <span className="normal-case font-normal text-outline/50">(PNG/SVG fondo transparente, máx 5MB)</span>
              </label>
              <ImageUpload
                currentUrl={form.logoUrl || null}
                folder="aliados"
                entityId={editing?.id}
                onUploaded={(url) => setForm({ ...form, logoUrl: url })}
                getAccessToken={getAccessToken}
                aspectRatio="video"
              />
            </div>

            {/* Text fields */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {([
                ["name",       "Nombre *"],
                ["nit",        "NIT"],
                ["email",      "Email"],
                ["websiteUrl", "Sitio web"],
                ["apiUrl",     "API URL"],
                ["apiKey",     "API Key"],
              ] as [keyof FormState, string][]).map(([k, lbl]) => (
                <input
                  key={k}
                  value={form[k] as string}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  placeholder={lbl}
                  type={k === "apiKey" ? "password" : "text"}
                  className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold col-span-1 focus:outline-none"
                />
              ))}
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">
                  Orden
                </label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.showInBanner}
                  onChange={(e) => setForm({ ...form, showInBanner: e.target.checked })}
                  className="w-4 h-4 accent-primary-container"
                />
                <span className="font-headline font-bold text-sm text-on-background">
                  Mostrar en banner del home
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 accent-primary-container"
                />
                <span className="font-headline font-bold text-sm text-on-background">Activo</span>
              </label>
            </div>

            {saveError && <p className="font-body text-sm text-error mb-3">{saveError}</p>}

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 bg-primary-container text-white font-headline font-black py-3 disabled:opacity-60"
              >
                {loading ? "GUARDANDO..." : "GUARDAR"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex-1 bg-surface-container-highest font-headline font-black py-3"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
