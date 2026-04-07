"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import type { AcademiaContent, Course } from "@/types/database.types";

interface Props { content: AcademiaContent[]; courses: Course[] }

type FormState = {
  courseId: string; contentType: string; title: string;
  description: string; url: string; sortOrder: string; isPublished: boolean;
};

const EMPTY: FormState = {
  courseId: "", contentType: "video", title: "",
  description: "", url: "", sortOrder: "0", isPublished: false,
};

const CONTENT_TYPES = ["video", "document", "quiz"];

export function AdminAcademiaContentClient({ content, courses }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AcademiaContent | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [filterCourse, setFilterCourse] = useState<string>("all");

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  function openEdit(c: AcademiaContent) {
    setEditing(c);
    setForm({
      courseId: String(c.course_id), contentType: c.content_type,
      title: c.title, description: c.description ?? "",
      url: c.url ?? "", sortOrder: String(c.sort_order ?? 0),
      isPublished: c.is_published ?? false,
    });
    setOpen(true);
  }

  async function handleSave() {
    setLoading(true);
    const method = editing ? "PUT" : "POST";
    const body = {
      ...form,
      courseId: Number(form.courseId),
      sortOrder: Number(form.sortOrder),
      ...(editing ? { id: editing.id } : {}),
    };
    const res = await fetch("/api/admin/academia-content", { method, headers: await authHeaders(), body: JSON.stringify(body) });
    if (!res.ok) { setSaveError("Error al guardar. Intenta de nuevo."); setLoading(false); return; }
    setSaveError(null); setOpen(false); setLoading(false); router.refresh();
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este contenido?")) return;
    await fetch("/api/admin/academia-content", { method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ id }) });
    router.refresh();
  }

  const F = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const courseMap = Object.fromEntries(courses.map((c) => [c.id, c.name]));
  const filtered = filterCourse === "all" ? content : content.filter((c) => String(c.course_id) === filterCourse);

  const TYPE_ICON: Record<string, string> = { video: "play_circle", document: "description", quiz: "quiz" };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
            ACADEMIA <span className="text-primary-container">CONTENIDO</span>
          </h1>
          <div className="h-1 w-16 bg-primary-container mt-2" />
        </div>
        <button
          onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }}
          className="bg-primary-container text-white font-headline font-black text-sm px-6 py-3 skew-fix hover:neo-shadow-pink transition-all"
        >
          <span className="block skew-content">+ AGREGAR CONTENIDO</span>
        </button>
      </div>

      {/* Filter by course */}
      <div className="mb-6 flex items-center gap-4">
        <span className="font-headline text-xs uppercase text-outline">Curso:</span>
        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="bg-surface-container-low text-on-background px-4 py-2 font-headline font-bold text-sm border-none"
        >
          <option value="all">Todos</option>
          {courses.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map((item) => (
          <div key={item.id} className="bg-surface-container p-5 border-l-4 border-primary-container flex items-center gap-4">
            <span className="material-symbols-outlined text-primary-container text-2xl shrink-0">
              {TYPE_ICON[item.content_type] ?? "article"}
            </span>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-[10px] font-headline uppercase text-outline mb-1">Curso</p>
                <p className="font-headline font-bold text-sm text-on-background truncate">{courseMap[item.course_id] ?? item.course_id}</p>
              </div>
              <div>
                <p className="text-[10px] font-headline uppercase text-outline mb-1">Título</p>
                <p className="font-body text-sm text-on-background">{item.title}</p>
              </div>
              <div>
                <p className="text-[10px] font-headline uppercase text-outline mb-1">Tipo</p>
                <span className="bg-primary-container/20 text-primary font-headline text-[10px] px-2 py-0.5 uppercase">{item.content_type}</span>
              </div>
              <div>
                <p className="text-[10px] font-headline uppercase text-outline mb-1">Estado</p>
                <span className={`font-headline text-[10px] px-2 py-0.5 uppercase ${item.is_published ? "bg-tertiary/20 text-tertiary" : "bg-outline/10 text-outline"}`}>
                  {item.is_published ? "Publicado" : "Borrador"}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button onClick={() => openEdit(item)} className="text-secondary font-headline font-bold text-xs uppercase">Editar</button>
              <button onClick={() => handleDelete(item.id)} className="text-error font-headline font-bold text-xs uppercase">Eliminar</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-20 text-center text-on-surface/30 font-headline uppercase text-sm">
            Sin contenido. Agrega el primero.
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-surface-container border-4 border-primary-container p-8 w-full max-w-lg my-8">
            <h2 className="font-headline font-black text-xl mb-6 uppercase">
              {editing ? "EDITAR CONTENIDO" : "NUEVO CONTENIDO"}
            </h2>

            <div className="space-y-3 mb-3">
              <select
                value={form.courseId}
                onChange={F("courseId")}
                className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none"
              >
                <option value="">Seleccionar curso *</option>
                {courses.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>

              <select
                value={form.contentType}
                onChange={F("contentType")}
                className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none"
              >
                {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>

              <input value={form.title} onChange={F("title")} placeholder="Título *" className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold" />
              <input value={form.url} onChange={F("url")} placeholder="URL (video, doc, etc.)" className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold" />
              <input value={form.sortOrder} onChange={F("sortOrder")} placeholder="Orden" type="number" className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold" />
              <textarea value={form.description} onChange={F("description")} placeholder="Descripción" rows={3} className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-body" />
            </div>

            <label className="flex items-center gap-2 mb-6 font-headline font-bold text-sm text-on-background">
              <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="w-4 h-4" />
              Publicado (visible para inscritos)
            </label>

            <div className="flex gap-3">
              <button onClick={handleSave} disabled={loading || !form.courseId || !form.title} className="flex-1 bg-primary-container text-white font-headline font-black py-3 disabled:opacity-60">
                {loading ? "GUARDANDO..." : "GUARDAR"}
              </button>
              <button onClick={() => setOpen(false)} className="flex-1 bg-surface-container-highest font-headline font-black py-3">CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
