"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import type { Aliado } from "@/types/database.types";

interface Props { aliados: Aliado[] }

type FormState = {
  name: string; nit: string; email: string;
  apiUrl: string; apiKey: string; logoUrl: string; isActive: boolean;
};

const EMPTY: FormState = {
  name: "", nit: "", email: "",
  apiUrl: "", apiKey: "", logoUrl: "", isActive: true,
};

export function AdminAliadosClient({ aliados }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Aliado | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<number | null>(null);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  function openEdit(a: Aliado) {
    setEditing(a);
    setForm({
      name: a.name, nit: a.nit ?? "", email: a.email ?? "",
      apiUrl: a.api_url ?? "", apiKey: a.api_key ?? "",
      logoUrl: a.logo_url ?? "", isActive: a.is_active ?? true,
    });
    setOpen(true);
  }

  async function handleSave() {
    setLoading(true);
    const method = editing ? "PUT" : "POST";
    const body = { ...form, ...(editing ? { id: editing.id } : {}) };
    const res = await fetch("/api/admin/aliados", { method, headers: await authHeaders(), body: JSON.stringify(body) });
    if (!res.ok) { setSaveError("Error al guardar. Intenta de nuevo."); setLoading(false); return; }
    setSaveError(null); setOpen(false); setLoading(false); router.refresh();
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este aliado?")) return;
    await fetch("/api/admin/aliados", { method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ id }) });
    router.refresh();
  }

  const F = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
            ALIADOS <span className="text-primary-container">CLIENTES</span>
          </h1>
          <div className="h-1 w-16 bg-primary-container mt-2" />
        </div>
        <button
          onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }}
          className="bg-primary-container text-white font-headline font-black text-sm px-6 py-3 skew-fix hover:neo-shadow-pink transition-all"
        >
          <span className="block skew-content">+ AGREGAR ALIADO</span>
        </button>
      </div>

      <div className="space-y-3">
        {aliados.map((a) => (
          <div key={a.id} className="bg-surface-container p-5 border-l-4 border-secondary-container flex items-center gap-6">
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] font-headline uppercase text-outline mb-1">Nombre</p>
                <p className="font-headline font-bold text-on-background">{a.name}</p>
              </div>
              <div>
                <p className="text-[10px] font-headline uppercase text-outline mb-1">NIT</p>
                <p className="font-body text-sm text-on-background">{a.nit ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-headline uppercase text-outline mb-1">Email</p>
                <p className="font-body text-sm text-on-background truncate">{a.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-headline uppercase text-outline mb-1">API Key</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs text-on-background/60">
                    {showKey === a.id ? (a.api_key ?? "—") : "••••••••"}
                  </p>
                  {a.api_key && (
                    <button onClick={() => setShowKey(showKey === a.id ? null : a.id)} className="text-outline hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-sm">
                        {showKey === a.id ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button onClick={() => openEdit(a)} className="text-secondary font-headline font-bold text-xs uppercase hover:text-secondary-container">Editar</button>
              <button onClick={() => handleDelete(a.id)} className="text-error font-headline font-bold text-xs uppercase">Eliminar</button>
            </div>
          </div>
        ))}
        {aliados.length === 0 && (
          <div className="py-20 text-center text-on-surface/30 font-headline uppercase text-sm">
            Sin aliados registrados.
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-surface-container border-4 border-primary-container p-8 w-full max-w-lg my-8">
            <h2 className="font-headline font-black text-xl mb-6 uppercase">
              {editing ? "EDITAR ALIADO" : "NUEVO ALIADO"}
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-3">
              {([
                ["name",    "Nombre *"],
                ["nit",     "NIT"],
                ["email",   "Email"],
                ["logoUrl", "Logo URL"],
                ["apiUrl",  "API URL"],
                ["apiKey",  "API Key"],
              ] as [keyof FormState, string][]).map(([k, lbl]) => (
                <input
                  key={k}
                  value={form[k] as string}
                  onChange={F(k)}
                  placeholder={lbl}
                  type={k === "apiKey" ? "password" : "text"}
                  className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold col-span-1"
                />
              ))}
            </div>

            <label className="flex items-center gap-2 mb-6 font-headline font-bold text-sm text-on-background">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              Activo
            </label>

            <div className="flex gap-3">
              <button onClick={handleSave} disabled={loading} className="flex-1 bg-primary-container text-white font-headline font-black py-3 disabled:opacity-60">
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
