"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import type { Course } from "@/types/database.types";
import { formatCop } from "@/lib/utils";
import { ImageUpload } from "./ImageUpload";

interface Props { courses: Course[] }
const EMPTY = { name: "", category: "Gaming", description: "", priceCop: "", durationHours: "4", paymentLink: "", imageUrl: "", sortOrder: "0" };

export function AdminCoursesClient({ courses }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  function openEdit(c: Course) {
    setEditing(c);
    setForm({
      name: c.name, category: c.category, description: c.description ?? "",
      priceCop: String(c.price_cop ?? ""), durationHours: String(c.duration_hours ?? 4),
      paymentLink: c.payment_link ?? "", imageUrl: c.image_url ?? "", sortOrder: String(c.sort_order ?? 0),
    });
    setOpen(true);
  }

  async function handleSave() {
    setLoading(true);
    const method = editing ? "PUT" : "POST";
    const body = {
      ...form,
      priceCop: form.priceCop ? Number(form.priceCop) : null,
      durationHours: Number(form.durationHours),
      sortOrder: Number(form.sortOrder),
      ...(editing ? { id: editing.id } : {}),
    };
    await fetch("/api/admin/courses", { method, headers: await authHeaders(), body: JSON.stringify(body) });
    setOpen(false); setLoading(false); router.refresh();
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este curso?")) return;
    await fetch("/api/admin/courses", { method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ id }) });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">CURSOS <span className="text-tertiary">ACADEMIA</span></h1>
          <div className="h-1 w-16 bg-tertiary mt-2" />
        </div>
        <button onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }} className="bg-tertiary text-background font-headline font-black text-sm px-6 py-3 skew-fix">
          <span className="block skew-content">+ AGREGAR CURSO</span>
        </button>
      </div>

      <table className="w-full text-sm">
        <thead><tr className="bg-surface-container-highest">
          {["Imagen","Curso","Categoría","Precio","Duración","Acciones"].map((h) => (
            <th key={h} className="text-left font-headline font-black text-xs uppercase tracking-widest text-outline px-4 py-3">{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {courses.map((c, i) => (
            <tr key={c.id} className={`${i % 2 === 0 ? "bg-surface-container" : "bg-surface-container-low"}`}>
              <td className="px-4 py-3">
                <div className="w-14 h-10 bg-surface-container-high overflow-hidden flex items-center justify-center">
                  {c.image_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                    : <span className="material-symbols-outlined text-sm text-outline">image</span>
                  }
                </div>
              </td>
              <td className="px-4 py-3 font-headline font-bold text-on-background">{c.name}</td>
              <td className="px-4 py-3"><span className="bg-surface-container-highest font-headline font-black text-[10px] px-2 py-1 text-on-surface-variant uppercase">{c.category}</span></td>
              <td className="px-4 py-3 font-body text-primary">{formatCop(c.price_cop)}</td>
              <td className="px-4 py-3 font-body text-on-surface-variant">{c.duration_hours}h</td>
              <td className="px-4 py-3 flex gap-2">
                <button onClick={() => openEdit(c)} className="text-secondary font-headline font-bold text-xs uppercase">Editar</button>
                <button onClick={() => handleDelete(c.id)} className="text-error font-headline font-bold text-xs uppercase">Eliminar</button>
              </td>
            </tr>
          ))}
          {courses.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-outline font-body">Sin cursos aún.</td></tr>}
        </tbody>
      </table>

      {open && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-surface-container border-4 border-tertiary p-8 w-full max-w-lg my-8">
            <h2 className="font-headline font-black text-xl mb-6 uppercase">{editing ? "EDITAR CURSO" : "NUEVO CURSO"}</h2>

            <div className="mb-4">
              <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-2">Imagen del Curso</p>
              <ImageUpload
                currentUrl={form.imageUrl || null}
                folder="courses"
                aspectRatio="video"
                onUploaded={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
                getAccessToken={getAccessToken}
              />
            </div>

            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({...form,name:e.target.value})} placeholder="Nombre del curso" className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold" />
              <select value={form.category} onChange={(e) => setForm({...form,category:e.target.value})} className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold appearance-none">
                {["Performance","Technology","Gaming"].map((c) => <option key={c}>{c}</option>)}
              </select>
              <textarea value={form.description} onChange={(e) => setForm({...form,description:e.target.value})} placeholder="Descripción" rows={2} className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <input value={form.priceCop} onChange={(e) => setForm({...form,priceCop:e.target.value})} type="number" placeholder="Precio COP" className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold" />
                <input value={form.durationHours} onChange={(e) => setForm({...form,durationHours:e.target.value})} type="number" placeholder="Duración (h)" className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold" />
              </div>
              <input value={form.paymentLink} onChange={(e) => setForm({...form,paymentLink:e.target.value})} placeholder="Link de pago (URL)" className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={loading} className="flex-1 bg-tertiary text-background font-headline font-black py-3 disabled:opacity-60">{loading?"GUARDANDO...":"GUARDAR"}</button>
              <button onClick={() => setOpen(false)} className="flex-1 bg-surface-container-highest font-headline font-black py-3">CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
