"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import type { AcademiaContent, Course, Master } from "@/types/database.types";
import { formatCop } from "@/lib/utils";
import { ImageUpload } from "./ImageUpload";

interface Props {
  courses: Course[];
  masters: Pick<Master, "id" | "name">[];
  content: AcademiaContent[];
}

const EMPTY_COURSE = {
  name: "", category: "Gaming", description: "",
  priceCop: "", durationHours: "4", imageUrl: "", masterId: "", sortOrder: "0",
};

type ContentForm = {
  courseId: string; contentType: string; title: string;
  description: string; url: string; sortOrder: string; isPublished: boolean;
};

const EMPTY_CONTENT: ContentForm = {
  courseId: "", contentType: "video", title: "",
  description: "", url: "", sortOrder: "0", isPublished: false,
};

const CONTENT_TYPES = ["video", "document", "quiz"];
const TYPE_ICON: Record<string, string> = { video: "play_circle", document: "description", quiz: "quiz" };

export function AdminCoursesClient({ courses, masters, content }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();

  // ── Course state ─────────────────────────────────────────────────
  const [courseOpen, setCourseOpen]   = useState(false);
  const [editing, setEditing]         = useState<Course | null>(null);
  const [form, setForm]               = useState(EMPTY_COURSE);
  const [courseLoading, setCourseLoading] = useState(false);
  const [imgUploading, setImgUploading]   = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);

  // ── Content state ─────────────────────────────────────────────────
  const [contentOpen, setContentOpen]       = useState(false);
  const [editingContent, setEditingContent] = useState<AcademiaContent | null>(null);
  const [contentForm, setContentForm]       = useState<ContentForm>(EMPTY_CONTENT);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError]     = useState<string | null>(null);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  // ── Course CRUD ───────────────────────────────────────────────────
  function openEditCourse(c: Course) {
    setEditing(c);
    setForm({
      name: c.name, category: c.category, description: c.description ?? "",
      priceCop: String(c.price_cop ?? ""), durationHours: String(c.duration_hours ?? 4),
      imageUrl: c.image_url ?? "", masterId: String(c.master_id ?? ""),
      sortOrder: String(c.sort_order ?? 0),
    });
    setCourseError(null);
    setCourseOpen(true);
  }

  async function handleSaveCourse() {
    setCourseLoading(true);
    const method = editing ? "PUT" : "POST";
    const body = {
      name: form.name, category: form.category, description: form.description,
      priceCop: form.priceCop ? Number(form.priceCop) : null,
      durationHours: Number(form.durationHours),
      imageUrl: form.imageUrl,
      masterId: form.masterId ? Number(form.masterId) : null,
      sortOrder: Number(form.sortOrder),
      ...(editing ? { id: editing.id } : {}),
    };
    const res = await fetch("/api/admin/courses", { method, headers: await authHeaders(), body: JSON.stringify(body) });
    if (!res.ok) { setCourseError("Error al guardar. Intenta de nuevo."); setCourseLoading(false); return; }
    setCourseError(null); setCourseLoading(false);
    if (!editing) { setCourseOpen(false); }
    router.refresh();
  }

  async function handleDeleteCourse(id: number) {
    if (!confirm("¿Eliminar este curso?")) return;
    await fetch("/api/admin/courses", { method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ id }) });
    router.refresh();
  }

  // ── Content CRUD ──────────────────────────────────────────────────
  function openAddContent() {
    if (!editing) return;
    setEditingContent(null);
    setContentForm({ ...EMPTY_CONTENT, courseId: String(editing.id) });
    setContentError(null);
    setContentOpen(true);
  }

  function openEditContent(c: AcademiaContent) {
    setEditingContent(c);
    setContentForm({
      courseId: String(c.course_id), contentType: c.content_type,
      title: c.title, description: c.description ?? "",
      url: c.url ?? "", sortOrder: String(c.sort_order ?? 0),
      isPublished: c.is_published ?? false,
    });
    setContentError(null);
    setContentOpen(true);
  }

  async function handleSaveContent() {
    setContentLoading(true);
    const method = editingContent ? "PUT" : "POST";
    const body = {
      ...contentForm,
      courseId: Number(contentForm.courseId),
      sortOrder: Number(contentForm.sortOrder),
      ...(editingContent ? { id: editingContent.id } : {}),
    };
    const res = await fetch("/api/admin/academia-content", { method, headers: await authHeaders(), body: JSON.stringify(body) });
    if (!res.ok) { setContentError("Error al guardar. Intenta de nuevo."); setContentLoading(false); return; }
    setContentError(null); setContentOpen(false); setContentLoading(false);
    router.refresh();
  }

  async function handleDeleteContent(id: number) {
    if (!confirm("¿Eliminar este contenido?")) return;
    await fetch("/api/admin/academia-content", { method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ id }) });
    router.refresh();
  }

  const courseContent = editing ? content.filter((c) => c.course_id === editing.id) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
            CURSOS <span className="text-tertiary">ACADEMIA</span>
          </h1>
          <div className="h-1 w-16 bg-tertiary mt-2" />
        </div>
        <button
          onClick={() => { setEditing(null); setForm(EMPTY_COURSE); setCourseError(null); setCourseOpen(true); }}
          className="bg-tertiary text-background font-headline font-black text-sm px-6 py-3 skew-fix"
        >
          <span className="block skew-content">+ AGREGAR CURSO</span>
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-container-highest">
            {["Imagen", "Curso", "Categoría", "Precio", "Duración", "Contenido", "Acciones"].map((h) => (
              <th key={h} className="text-left font-headline font-black text-xs uppercase tracking-widest text-outline px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {courses.map((c, i) => {
            const itemCount = content.filter((x) => x.course_id === c.id).length;
            return (
              <tr key={c.id} className={i % 2 === 0 ? "bg-surface-container" : "bg-surface-container-low"}>
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
                <td className="px-4 py-3">
                  <span className="bg-surface-container-highest font-headline font-black text-[10px] px-2 py-1 text-on-surface-variant uppercase">{c.category}</span>
                </td>
                <td className="px-4 py-3 font-body text-primary">{formatCop(c.price_cop)}</td>
                <td className="px-4 py-3 font-body text-on-surface-variant">{c.duration_hours}h</td>
                <td className="px-4 py-3">
                  <span className={`font-headline font-black text-xs px-2 py-1 ${itemCount > 0 ? "bg-tertiary/20 text-tertiary" : "bg-outline/10 text-outline"}`}>
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button onClick={() => openEditCourse(c)} className="text-secondary font-headline font-bold text-xs uppercase">Editar</button>
                    <button onClick={() => handleDeleteCourse(c.id)} className="text-error font-headline font-bold text-xs uppercase">Eliminar</button>
                  </div>
                </td>
              </tr>
            );
          })}
          {courses.length === 0 && (
            <tr><td colSpan={7} className="px-4 py-12 text-center text-outline font-body">Sin cursos aún.</td></tr>
          )}
        </tbody>
      </table>

      {/* ── Course modal ────────────────────────────────────────────── */}
      {courseOpen && (
        <div className="fixed inset-0 bg-background/80 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-surface-container border-4 border-tertiary w-full max-w-2xl my-8">

            {/* Course fields */}
            <div className="p-8">
              <h2 className="font-headline font-black text-xl mb-6 uppercase">
                {editing ? "EDITAR CURSO" : "NUEVO CURSO"}
              </h2>

              <div className="mb-4">
                <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-2">Imagen del Curso</p>
                <ImageUpload
                  currentUrl={form.imageUrl || null}
                  folder="courses"
                  entityId={editing?.id}
                  aspectRatio="video"
                  onUploaded={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
                  onUploadingChange={setImgUploading}
                  getAccessToken={getAccessToken}
                />
              </div>

              <div className="space-y-3">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nombre del curso"
                  className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold"
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold appearance-none"
                  >
                    {["Performance", "Technology", "Gaming"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <select
                    value={form.masterId}
                    onChange={(e) => setForm({ ...form, masterId: e.target.value })}
                    className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold appearance-none"
                  >
                    <option value="">Sin master asignado</option>
                    {masters.map((m) => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
                  </select>
                </div>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descripción"
                  rows={2}
                  className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold resize-none"
                />
                <div className="grid grid-cols-3 gap-3">
                  <input
                    value={form.priceCop}
                    onChange={(e) => setForm({ ...form, priceCop: e.target.value })}
                    type="number"
                    placeholder="Precio COP"
                    className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold"
                  />
                  <input
                    value={form.durationHours}
                    onChange={(e) => setForm({ ...form, durationHours: e.target.value })}
                    type="number"
                    placeholder="Duración (h)"
                    className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold"
                  />
                  <input
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                    type="number"
                    placeholder="Orden"
                    className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold"
                  />
                </div>
              </div>

              {courseError && <p className="text-error font-headline font-bold text-xs uppercase mt-3">{courseError}</p>}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveCourse}
                  disabled={courseLoading || imgUploading}
                  className="flex-1 bg-tertiary text-background font-headline font-black py-3 disabled:opacity-60"
                >
                  {imgUploading ? "SUBIENDO..." : courseLoading ? "GUARDANDO..." : "GUARDAR CURSO"}
                </button>
                <button onClick={() => setCourseOpen(false)} className="flex-1 bg-surface-container-highest font-headline font-black py-3">
                  CANCELAR
                </button>
              </div>
            </div>

            {/* Content section — only when editing an existing course */}
            {editing && (
              <div className="border-t-4 border-surface-container-highest px-8 pb-8 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline">Contenido del Curso</p>
                    <p className="font-headline font-black text-sm text-on-surface mt-0.5">
                      {courseContent.length} {courseContent.length === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <button
                    onClick={openAddContent}
                    className="bg-primary-container text-white font-headline font-black text-xs px-4 py-2 skew-fix hover:opacity-90"
                  >
                    <span className="block skew-content">+ AGREGAR</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {courseContent.length === 0 ? (
                    <p className="text-xs font-body text-on-surface/30 py-4 text-center">Sin contenido aún. Agrega el primero.</p>
                  ) : (
                    courseContent
                      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                      .map((item) => (
                        <div key={item.id} className="bg-surface-container-low flex items-center gap-3 px-4 py-3">
                          <span className="material-symbols-outlined text-primary-container text-xl shrink-0">
                            {TYPE_ICON[item.content_type] ?? "article"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-headline font-bold text-sm text-on-background truncate">{item.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-headline text-[10px] uppercase text-outline">{item.content_type}</span>
                              <span className={`font-headline text-[10px] px-1.5 uppercase ${item.is_published ? "bg-tertiary/20 text-tertiary" : "bg-outline/10 text-outline"}`}>
                                {item.is_published ? "Publicado" : "Borrador"}
                              </span>
                              <span className="font-headline text-[10px] text-outline">#{item.sort_order ?? 0}</span>
                            </div>
                          </div>
                          <div className="flex gap-3 shrink-0">
                            <button onClick={() => openEditContent(item)} className="text-secondary font-headline font-bold text-xs uppercase">Editar</button>
                            <button onClick={() => handleDeleteContent(item.id)} className="text-error font-headline font-bold text-xs uppercase">Eliminar</button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Content sub-modal ──────────────────────────────────────── */}
      {contentOpen && (
        <div className="fixed inset-0 bg-background/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-surface-container border-4 border-primary-container p-8 w-full max-w-md">
            <h2 className="font-headline font-black text-lg mb-5 uppercase">
              {editingContent ? "EDITAR CONTENIDO" : "NUEVO CONTENIDO"}
            </h2>

            <div className="space-y-3 mb-4">
              <select
                value={contentForm.contentType}
                onChange={(e) => setContentForm({ ...contentForm, contentType: e.target.value })}
                className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none"
              >
                {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
              <input
                value={contentForm.title}
                onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })}
                placeholder="Título *"
                className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold"
              />
              <input
                value={contentForm.url}
                onChange={(e) => setContentForm({ ...contentForm, url: e.target.value })}
                placeholder="URL (video, doc, etc.)"
                className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold"
              />
              <input
                value={contentForm.sortOrder}
                onChange={(e) => setContentForm({ ...contentForm, sortOrder: e.target.value })}
                placeholder="Orden"
                type="number"
                className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold"
              />
              <textarea
                value={contentForm.description}
                onChange={(e) => setContentForm({ ...contentForm, description: e.target.value })}
                placeholder="Descripción"
                rows={2}
                className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-body resize-none"
              />
            </div>

            <label className="flex items-center gap-2 mb-5 font-headline font-bold text-sm text-on-background">
              <input
                type="checkbox"
                checked={contentForm.isPublished}
                onChange={(e) => setContentForm({ ...contentForm, isPublished: e.target.checked })}
                className="w-4 h-4"
              />
              Publicado (visible para inscritos)
            </label>

            {contentError && <p className="text-error font-headline font-bold text-xs uppercase mb-3">{contentError}</p>}

            <div className="flex gap-3">
              <button
                onClick={handleSaveContent}
                disabled={contentLoading || !contentForm.title}
                className="flex-1 bg-primary-container text-white font-headline font-black py-3 disabled:opacity-60"
              >
                {contentLoading ? "GUARDANDO..." : "GUARDAR"}
              </button>
              <button onClick={() => setContentOpen(false)} className="flex-1 bg-surface-container-highest font-headline font-black py-3">
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
