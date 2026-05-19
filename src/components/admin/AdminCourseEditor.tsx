"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import {
  DndContext, closestCenter, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Course, CourseModule, CourseSession, CourseSessionLink, CourseSessionDocument, Master } from "@/types/database.types";
import { ImageUpload } from "./ImageUpload";

// ── Local state types ─────────────────────────────────────────────────────────

type LocalModule = CourseModule & { sessions: LocalSession[] };
type LocalSession = CourseSession & { links: CourseSessionLink[]; docs: CourseSessionDocument[] };

type InfoState = {
  name: string;
  category: string;
  description: string;
  priceCop: string;
  priceToken: string;
  durationHours: string;
  sessionDurationMin: string;
  imageUrl: string;
  masterId: string;
  sortOrder: string;
  isActive: boolean;
  introDescription: string;
  introVideoUid: string;
};

type PendingDoc = { path: string; label: string; mimeType: string; sizeBytes: number };

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildLocalModules(
  modules: CourseModule[],
  sessions: CourseSession[],
  links: CourseSessionLink[],
  docs: CourseSessionDocument[],
): LocalModule[] {
  return modules.map(m => ({
    ...m,
    sessions: sessions
      .filter(s => s.module_id === m.id)
      .map(s => ({
        ...s,
        links: links.filter(l => l.session_id === s.id),
        docs:  docs.filter(d => d.session_id === s.id),
      })),
  }));
}

const CATEGORIES = ["Gaming", "Esports", "Streaming", "Diseño", "Programación", "Marketing", "Otro"];

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  course: Course;
  masters: Pick<Master, "id" | "name">[];
  initialModules: CourseModule[];
  initialSessions: CourseSession[];
  initialLinks: CourseSessionLink[];
  initialDocs: CourseSessionDocument[];
}

export function AdminCourseEditor({ course, masters, initialModules, initialSessions, initialLinks, initialDocs }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [tab, setTab] = useState<"info" | "contenido">("info");
  const [modules, setModules] = useState<LocalModule[]>(() =>
    buildLocalModules(initialModules, initialSessions, initialLinks, initialDocs)
  );
  const [activeSession, setActiveSession] = useState<LocalSession | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);

  const authHeaders = useCallback(async () => {
    const token = await getAccessToken();
    return { Authorization: `Bearer ${token}` };
  }, [getAccessToken]);

  const jsonHeaders = useCallback(async () => {
    const h = await authHeaders();
    return { ...h, "Content-Type": "application/json" };
  }, [authHeaders]);

  // ── Info form ───────────────────────────────────────────────────────────────

  const [info, setInfo] = useState({
    name:              course.name,
    category:          course.category,
    description:       course.description ?? "",
    priceCop:          String(course.price_cop ?? ""),
    priceToken:        String(course.price_token ?? ""),
    durationHours:     String(course.duration_hours ?? ""),
    sessionDurationMin: String(course.session_duration_min ?? ""),
    imageUrl:          course.image_url ?? "",
    masterId:          String(course.master_id ?? ""),
    sortOrder:         String(course.sort_order ?? 0),
    isActive:          course.is_active ?? false,
    introDescription:  course.intro_description ?? "",
    introVideoUid:     course.intro_video_uid ?? "",
  });
  const [infoSaving, setInfoSaving]     = useState(false);
  const [infoError, setInfoError]       = useState<string | null>(null);
  const [infoSaved, setInfoSaved]       = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const introVideoRef = useRef<HTMLInputElement>(null);

  async function uploadIntroVideo(file: File) {
    setVideoUploading(true);
    try {
      const h = await authHeaders();
      const r1 = await fetch("/api/admin/stream-upload-url", {
        method: "POST",
        headers: { ...h, "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      });
      if (!r1.ok) throw new Error("No se pudo obtener la URL de subida");
      const { uid, uploadURL } = await r1.json();
      await fetch(uploadURL, { method: "PUT", body: file });
      setInfo(prev => ({ ...prev, introVideoUid: uid }));
    } catch (e) {
      setInfoError((e as Error).message);
    } finally {
      setVideoUploading(false);
    }
  }

  async function saveInfo() {
    setInfoSaving(true); setInfoError(null); setInfoSaved(false);
    const h = await jsonHeaders();
    const res = await fetch("/api/admin/courses", {
      method: "PUT",
      headers: h,
      body: JSON.stringify({
        id:                 course.id,
        name:               info.name,
        category:           info.category,
        description:        info.description || null,
        priceCop:           info.priceCop ? Number(info.priceCop) : null,
        priceToken:         info.priceToken ? Number(info.priceToken) : null,
        durationHours:      info.durationHours ? Number(info.durationHours) : null,
        sessionDurationMin: info.sessionDurationMin ? Number(info.sessionDurationMin) : null,
        imageUrl:           info.imageUrl || null,
        masterId:           info.masterId ? Number(info.masterId) : null,
        sortOrder:          Number(info.sortOrder),
        isActive:           info.isActive,
        introDescription:   info.introDescription || null,
        introVideoUid:      info.introVideoUid || null,
      }),
    });
    if (!res.ok) { setInfoError("Error al guardar"); setInfoSaving(false); return; }
    setInfoSaved(true); setInfoSaving(false);
    router.refresh();
  }

  // ── Module CRUD ─────────────────────────────────────────────────────────────

  const [addingModule, setAddingModule]       = useState(false);
  const [newModuleTitle, setNewModuleTitle]   = useState("");
  const [newModuleDesc, setNewModuleDesc]     = useState("");
  const [moduleLoading, setModuleLoading]     = useState(false);
  const [editingModule, setEditingModule]     = useState<LocalModule | null>(null);
  const [editModuleTitle, setEditModuleTitle] = useState("");
  const [editModuleDesc, setEditModuleDesc]   = useState("");

  async function createModule() {
    if (!newModuleTitle.trim()) return;
    setModuleLoading(true);
    const h = await jsonHeaders();
    const res = await fetch("/api/admin/course-modules", {
      method: "POST",
      headers: h,
      body: JSON.stringify({
        courseId: course.id,
        title: newModuleTitle.trim(),
        description: newModuleDesc.trim() || null,
        sortOrder: modules.length,
      }),
    });
    if (res.ok) {
      const mod: CourseModule = await res.json();
      setModules(prev => [...prev, { ...mod, sessions: [] }]);
      setNewModuleTitle(""); setNewModuleDesc(""); setAddingModule(false);
    }
    setModuleLoading(false);
  }

  async function saveModule() {
    if (!editingModule) return;
    setModuleLoading(true);
    const h = await jsonHeaders();
    const res = await fetch("/api/admin/course-modules", {
      method: "PUT",
      headers: h,
      body: JSON.stringify({
        id: editingModule.id,
        title: editModuleTitle.trim(),
        description: editModuleDesc.trim() || null,
        isPublished: editingModule.is_published,
      }),
    });
    if (res.ok) {
      const updated: CourseModule = await res.json();
      setModules(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
      setEditingModule(null);
    }
    setModuleLoading(false);
  }

  async function deleteModule(id: number) {
    if (!confirm("¿Eliminar este módulo y todas sus sesiones?")) return;
    const h = await jsonHeaders();
    await fetch("/api/admin/course-modules", { method: "DELETE", headers: h, body: JSON.stringify({ id }) });
    setModules(prev => prev.filter(m => m.id !== id));
  }

  async function toggleModulePublished(mod: LocalModule) {
    const h = await jsonHeaders();
    const res = await fetch("/api/admin/course-modules", {
      method: "PUT",
      headers: h,
      body: JSON.stringify({ id: mod.id, title: mod.title, description: mod.description, isPublished: !mod.is_published }),
    });
    if (res.ok) {
      setModules(prev => prev.map(m => m.id === mod.id ? { ...m, is_published: !m.is_published } : m));
    }
  }

  async function reorderModules(newOrder: LocalModule[]) {
    setModules(newOrder);
    const h = await jsonHeaders();
    await fetch("/api/admin/course-modules/reorder", {
      method: "POST",
      headers: h,
      body: JSON.stringify({ courseId: course.id, moduleIds: newOrder.map(m => m.id) }),
    });
  }

  function onModuleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = modules.findIndex(m => m.id === active.id);
    const newIdx = modules.findIndex(m => m.id === over.id);
    reorderModules(arrayMove(modules, oldIdx, newIdx));
  }

  // ── Session CRUD ────────────────────────────────────────────────────────────

  async function addSession(moduleId: number) {
    setActiveModuleId(moduleId);
    setActiveSession({
      id: 0, module_id: moduleId, title: "", description: null,
      video_uid: null, duration_minutes: null, is_published: false,
      sort_order: 0, created_at: "", updated_at: "",
      links: [], docs: [],
    });
  }

  function editSession(session: LocalSession) {
    setActiveModuleId(session.module_id);
    setActiveSession({ ...session });
  }

  async function deleteSession(session: LocalSession) {
    if (!confirm("¿Eliminar esta sesión y sus documentos?")) return;
    const h = await jsonHeaders();
    await fetch("/api/admin/course-sessions", { method: "DELETE", headers: h, body: JSON.stringify({ id: session.id }) });
    setModules(prev => prev.map(m =>
      m.id === session.module_id ? { ...m, sessions: m.sessions.filter(s => s.id !== session.id) } : m
    ));
    if (activeSession?.id === session.id) setActiveSession(null);
  }

  async function reorderSessions(moduleId: number, newOrder: LocalSession[]) {
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, sessions: newOrder } : m));
    const h = await jsonHeaders();
    await fetch("/api/admin/course-sessions/reorder", {
      method: "POST",
      headers: h,
      body: JSON.stringify({ moduleId, sessionIds: newOrder.map(s => s.id) }),
    });
  }

  function onSessionDragEnd(moduleId: number) {
    return (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const mod = modules.find(m => m.id === moduleId);
      if (!mod) return;
      const oldIdx = mod.sessions.findIndex(s => s.id === active.id);
      const newIdx = mod.sessions.findIndex(s => s.id === over.id);
      reorderSessions(moduleId, arrayMove(mod.sessions, oldIdx, newIdx));
    };
  }

  function onSessionSaved(session: LocalSession, isNew: boolean) {
    setModules(prev => prev.map(m => {
      if (m.id !== session.module_id) return m;
      if (isNew) return { ...m, sessions: [...m.sessions, session] };
      return { ...m, sessions: m.sessions.map(s => s.id === session.id ? session : s) };
    }));
    setActiveSession(null);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface-container px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push("/admin/courses")} className="text-on-surface-variant hover:text-on-surface">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-outline uppercase tracking-widest">Cursos</p>
          <h1 className="font-headline font-black text-xl uppercase tracking-tight truncate">{info.name || "Sin nombre"}</h1>
        </div>
        <span className={`px-2 py-0.5 text-xs font-bold uppercase ${info.isActive ? "bg-primary-container text-on-primary-container" : "bg-surface-container-high text-outline"}`}>
          {info.isActive ? "Activo" : "Borrador"}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-container-high">
        {(["info", "contenido"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${
              tab === t ? "border-primary-container text-on-surface" : "border-transparent text-outline hover:text-on-surface"
            }`}
          >
            {t === "info" ? "Información" : "Contenido"}
          </button>
        ))}
      </div>

      <div className="flex">
        {/* Main content */}
        <div className="flex-1 p-6 max-w-3xl">
          {tab === "info" && (
            <InfoTab
              info={info}
              setInfo={setInfo}
              masters={masters}
              saving={infoSaving}
              saved={infoSaved}
              error={infoError}
              videoUploading={videoUploading}
              introVideoRef={introVideoRef}
              onVideoFile={uploadIntroVideo}
              onSave={saveInfo}
              courseId={course.id}
              getAccessToken={getAccessToken}
            />
          )}
          {tab === "contenido" && (
            <CurriculumTab
              modules={modules}
              addingModule={addingModule}
              setAddingModule={setAddingModule}
              newModuleTitle={newModuleTitle}
              setNewModuleTitle={setNewModuleTitle}
              newModuleDesc={newModuleDesc}
              setNewModuleDesc={setNewModuleDesc}
              moduleLoading={moduleLoading}
              editingModule={editingModule}
              setEditingModule={(m) => {
                setEditingModule(m);
                if (m) { setEditModuleTitle(m.title); setEditModuleDesc(m.description ?? ""); }
              }}
              editModuleTitle={editModuleTitle}
              setEditModuleTitle={setEditModuleTitle}
              editModuleDesc={editModuleDesc}
              setEditModuleDesc={setEditModuleDesc}
              onCreateModule={createModule}
              onSaveModule={saveModule}
              onDeleteModule={deleteModule}
              onToggleModulePublished={toggleModulePublished}
              onModuleDragEnd={onModuleDragEnd}
              onAddSession={addSession}
              onEditSession={editSession}
              onDeleteSession={deleteSession}
              onSessionDragEnd={onSessionDragEnd}
              activeSessionId={activeSession?.id ?? null}
            />
          )}
        </div>

        {/* Session panel */}
        {activeSession !== null && tab === "contenido" && (
          <SessionPanel
            session={activeSession}
            courseId={course.id}
            moduleId={activeModuleId!}
            jsonHeaders={jsonHeaders}
            authHeaders={authHeaders}
            onSaved={onSessionSaved}
            onClose={() => setActiveSession(null)}
          />
        )}
      </div>
    </div>
  );
}

// ── Info Tab ──────────────────────────────────────────────────────────────────

function InfoTab({
  info, setInfo, masters, saving, saved, error,
  videoUploading, introVideoRef, onVideoFile, onSave, courseId, getAccessToken,
}: {
  info: InfoState;
  setInfo: React.Dispatch<React.SetStateAction<InfoState>>;
  masters: Pick<Master, "id" | "name">[];
  saving: boolean; saved: boolean; error: string | null;
  videoUploading: boolean;
  introVideoRef: React.RefObject<HTMLInputElement | null>;
  onVideoFile: (f: File) => void;
  onSave: () => void;
  courseId: number;
  getAccessToken: () => Promise<string | null>;
}) {
  function field(key: keyof InfoState) {
    return {
      value: info[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setInfo(prev => ({ ...prev, [key]: e.target.value })),
    };
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-1">Nombre del curso *</label>
          <input className="w-full bg-surface border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-container" {...field("name")} />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-1">Categoría</label>
          <select className="w-full bg-surface border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none" {...field("category")}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-1">Master</label>
          <select className="w-full bg-surface border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none" {...field("masterId")}>
            <option value="">— Sin asignar —</option>
            {masters.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-1">Descripción</label>
          <textarea className="w-full bg-surface border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-container resize-none" rows={3} {...field("description")} />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-1">Precio COP</label>
          <input type="number" className="w-full bg-surface border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none" {...field("priceCop")} />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-1">Precio $1UP</label>
          <input type="number" className="w-full bg-surface border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none" {...field("priceToken")} />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-1">Duración total (horas)</label>
          <input type="number" className="w-full bg-surface border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none" {...field("durationHours")} />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-1">Duración por sesión (min)</label>
          <input type="number" className="w-full bg-surface border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none" {...field("sessionDurationMin")} />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-1">Sort order</label>
          <input type="number" className="w-full bg-surface border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none" {...field("sortOrder")} />
        </div>
        <div className="flex items-center gap-3">
          <label className="block text-xs font-bold uppercase tracking-widest text-outline">Publicado</label>
          <button
            type="button"
            onClick={() => setInfo(prev => ({ ...prev, isActive: !prev.isActive }))}
            className={`relative w-12 h-6 transition-colors ${info.isActive ? "bg-primary-container" : "bg-outline-variant"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-surface transition-transform ${info.isActive ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      {/* Cover image */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-2">Imagen de portada</label>
        <ImageUpload
          currentUrl={info.imageUrl}
          folder="courses"
          entityId={courseId}
          onUploaded={url => setInfo(prev => ({ ...prev, imageUrl: url }))}
          getAccessToken={getAccessToken}
        />
      </div>

      {/* Intro video */}
      <div className="bg-surface-container p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-outline">Video de presentación</p>
        {info.introVideoUid ? (
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
            <span className="text-xs text-on-surface font-mono">{info.introVideoUid as string}</span>
            <button onClick={() => setInfo(prev => ({ ...prev, introVideoUid: "" }))} className="ml-auto text-error text-xs">Quitar</button>
          </div>
        ) : (
          <div>
            <input
              ref={introVideoRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onVideoFile(f); }}
            />
            <button
              onClick={() => introVideoRef.current?.click()}
              disabled={videoUploading}
              className="flex items-center gap-2 bg-surface border border-outline-variant px-4 py-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">upload</span>
              {videoUploading ? "Subiendo..." : "Subir video"}
            </button>
          </div>
        )}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-1">Texto introductorio</label>
          <textarea
            className="w-full bg-surface border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none resize-none"
            rows={2}
            value={info.introDescription as string}
            onChange={e => setInfo(prev => ({ ...prev, introDescription: e.target.value }))}
            placeholder="Breve descripción que acompaña al video..."
          />
        </div>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
      <div className="flex items-center gap-4">
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-primary-container text-on-primary-container font-bold text-sm uppercase tracking-widest px-6 py-2 disabled:opacity-50"
        >
          {saving ? "GUARDANDO..." : "GUARDAR"}
        </button>
        {saved && <span className="text-xs text-primary-container font-bold">¡Guardado!</span>}
      </div>
    </div>
  );
}

// ── Curriculum Tab ────────────────────────────────────────────────────────────

function CurriculumTab({
  modules, addingModule, setAddingModule, newModuleTitle, setNewModuleTitle,
  newModuleDesc, setNewModuleDesc, moduleLoading, editingModule, setEditingModule,
  editModuleTitle, setEditModuleTitle, editModuleDesc, setEditModuleDesc,
  onCreateModule, onSaveModule, onDeleteModule, onToggleModulePublished, onModuleDragEnd,
  onAddSession, onEditSession, onDeleteSession, onSessionDragEnd, activeSessionId,
}: {
  modules: LocalModule[];
  addingModule: boolean; setAddingModule: (v: boolean) => void;
  newModuleTitle: string; setNewModuleTitle: (v: string) => void;
  newModuleDesc: string; setNewModuleDesc: (v: string) => void;
  moduleLoading: boolean;
  editingModule: LocalModule | null; setEditingModule: (m: LocalModule | null) => void;
  editModuleTitle: string; setEditModuleTitle: (v: string) => void;
  editModuleDesc: string; setEditModuleDesc: (v: string) => void;
  onCreateModule: () => void; onSaveModule: () => void;
  onDeleteModule: (id: number) => void;
  onToggleModulePublished: (m: LocalModule) => void;
  onModuleDragEnd: (e: DragEndEvent) => void;
  onAddSession: (moduleId: number) => void;
  onEditSession: (s: LocalSession) => void;
  onDeleteSession: (s: LocalSession) => void;
  onSessionDragEnd: (moduleId: number) => (e: DragEndEvent) => void;
  activeSessionId: number | null;
}) {
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());

  function toggleExpand(id: number) {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-outline uppercase tracking-widest">{modules.length} módulo{modules.length !== 1 ? "s" : ""}</p>
        <button
          onClick={() => setAddingModule(true)}
          className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary-container hover:underline"
        >
          <span className="material-symbols-outlined text-sm">add</span>Añadir módulo
        </button>
      </div>

      {addingModule && (
        <div className="bg-surface-container p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest">Nuevo módulo</p>
          <input
            className="w-full bg-surface border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none"
            placeholder="Título del módulo"
            value={newModuleTitle}
            onChange={e => setNewModuleTitle(e.target.value)}
          />
          <textarea
            className="w-full bg-surface border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none resize-none"
            placeholder="Descripción (opcional)"
            rows={2}
            value={newModuleDesc}
            onChange={e => setNewModuleDesc(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={onCreateModule} disabled={moduleLoading} className="bg-primary-container text-on-primary-container text-xs font-bold uppercase px-4 py-2 disabled:opacity-50">
              {moduleLoading ? "..." : "Crear"}
            </button>
            <button onClick={() => setAddingModule(false)} className="text-xs text-outline uppercase px-4 py-2">Cancelar</button>
          </div>
        </div>
      )}

      <DndContext collisionDetection={closestCenter} onDragEnd={onModuleDragEnd}>
        <SortableContext items={modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {modules.map((mod, modIdx) => (
              <SortableModuleRow
                key={mod.id}
                mod={mod}
                modIdx={modIdx}
                expanded={expandedModules.has(mod.id)}
                onToggleExpand={() => toggleExpand(mod.id)}
                isEditing={editingModule?.id === mod.id}
                editTitle={editModuleTitle}
                editDesc={editModuleDesc}
                setEditTitle={setEditModuleTitle}
                setEditDesc={setEditModuleDesc}
                onStartEdit={() => setEditingModule(mod)}
                onSaveEdit={onSaveModule}
                onCancelEdit={() => setEditingModule(null)}
                onDelete={() => onDeleteModule(mod.id)}
                onTogglePublished={() => onToggleModulePublished(mod)}
                moduleLoading={moduleLoading}
                onAddSession={() => onAddSession(mod.id)}
                onEditSession={onEditSession}
                onDeleteSession={onDeleteSession}
                onSessionDragEnd={onSessionDragEnd(mod.id)}
                activeSessionId={activeSessionId}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {modules.length === 0 && !addingModule && (
        <div className="text-center py-12 text-outline text-sm">
          Sin módulos. Añade el primero para comenzar.
        </div>
      )}
    </div>
  );
}

// ── Sortable Module Row ───────────────────────────────────────────────────────

function SortableModuleRow({
  mod, modIdx, expanded, onToggleExpand, isEditing, editTitle, editDesc,
  setEditTitle, setEditDesc, onStartEdit, onSaveEdit, onCancelEdit, onDelete,
  onTogglePublished, moduleLoading, onAddSession, onEditSession, onDeleteSession,
  onSessionDragEnd, activeSessionId,
}: {
  mod: LocalModule; modIdx: number; expanded: boolean; onToggleExpand: () => void;
  isEditing: boolean; editTitle: string; editDesc: string;
  setEditTitle: (v: string) => void; setEditDesc: (v: string) => void;
  onStartEdit: () => void; onSaveEdit: () => void; onCancelEdit: () => void;
  onDelete: () => void; onTogglePublished: () => void; moduleLoading: boolean;
  onAddSession: () => void;
  onEditSession: (s: LocalSession) => void;
  onDeleteSession: (s: LocalSession) => void;
  onSessionDragEnd: (e: DragEndEvent) => void;
  activeSessionId: number | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: mod.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="bg-surface-container">
      {/* Module header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button {...attributes} {...listeners} className="text-outline cursor-grab active:cursor-grabbing">
          <span className="material-symbols-outlined text-sm">drag_indicator</span>
        </button>
        <span className="text-xs text-outline w-5">{modIdx + 1}.</span>
        {isEditing ? (
          <div className="flex-1 space-y-2">
            <input
              className="w-full bg-surface border border-outline-variant px-2 py-1 text-sm text-on-surface focus:outline-none"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
            />
            <textarea
              className="w-full bg-surface border border-outline-variant px-2 py-1 text-xs text-on-surface focus:outline-none resize-none"
              rows={2}
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              placeholder="Descripción..."
            />
            <div className="flex gap-2">
              <button onClick={onSaveEdit} disabled={moduleLoading} className="text-xs bg-primary-container text-on-primary-container font-bold uppercase px-3 py-1">Guardar</button>
              <button onClick={onCancelEdit} className="text-xs text-outline uppercase px-3 py-1">Cancelar</button>
            </div>
          </div>
        ) : (
          <>
            <button onClick={onToggleExpand} className="flex-1 text-left">
              <p className="text-sm font-bold text-on-surface">{mod.title}</p>
              {mod.description && <p className="text-xs text-outline mt-0.5">{mod.description}</p>}
              <p className="text-xs text-outline mt-0.5">{mod.sessions.length} sesión{mod.sessions.length !== 1 ? "es" : ""}</p>
            </button>
            <span className={`text-xs px-1.5 py-0.5 font-bold uppercase ${mod.is_published ? "bg-primary-container text-on-primary-container" : "bg-surface-container-high text-outline"}`}>
              {mod.is_published ? "PUB" : "BORR"}
            </span>
            <button onClick={onStartEdit} className="text-outline hover:text-on-surface">
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
            <button onClick={onTogglePublished} className="text-outline hover:text-on-surface" title="Toggle publicado">
              <span className="material-symbols-outlined text-sm">{mod.is_published ? "visibility_off" : "visibility"}</span>
            </button>
            <button onClick={onDelete} className="text-error hover:opacity-70">
              <span className="material-symbols-outlined text-sm">delete</span>
            </button>
            <button onClick={onToggleExpand} className="text-outline">
              <span className="material-symbols-outlined text-sm">{expanded ? "expand_less" : "expand_more"}</span>
            </button>
          </>
        )}
      </div>

      {/* Sessions */}
      {expanded && !isEditing && (
        <div className="border-t border-surface-container-high px-4 pb-4 pt-2 space-y-2">
          <DndContext collisionDetection={closestCenter} onDragEnd={onSessionDragEnd}>
            <SortableContext items={mod.sessions.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {mod.sessions.map((session, sIdx) => (
                <SortableSessionRow
                  key={session.id}
                  session={session}
                  sIdx={sIdx}
                  isActive={activeSessionId === session.id}
                  onEdit={() => onEditSession(session)}
                  onDelete={() => onDeleteSession(session)}
                />
              ))}
            </SortableContext>
          </DndContext>
          {mod.sessions.length === 0 && (
            <p className="text-xs text-outline py-2">Sin sesiones en este módulo.</p>
          )}
          <button
            onClick={onAddSession}
            className="flex items-center gap-1 text-xs text-primary-container font-bold uppercase tracking-widest hover:underline mt-1"
          >
            <span className="material-symbols-outlined text-sm">add</span>Nueva sesión
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sortable Session Row ──────────────────────────────────────────────────────

function SortableSessionRow({
  session, sIdx, isActive, onEdit, onDelete,
}: {
  session: LocalSession; sIdx: number; isActive: boolean;
  onEdit: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: session.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 ${isActive ? "bg-primary-container/20" : "bg-surface"}`}
    >
      <button {...attributes} {...listeners} className="text-outline cursor-grab active:cursor-grabbing">
        <span className="material-symbols-outlined text-sm">drag_indicator</span>
      </button>
      <span className="text-xs text-outline w-5">{sIdx + 1}.</span>
      <button onClick={onEdit} className="flex-1 text-left">
        <p className="text-sm text-on-surface">{session.title || "Sin título"}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {session.video_uid && <span className="text-xs text-primary-container">Video</span>}
          {session.docs.length > 0 && <span className="text-xs text-outline">{session.docs.length} doc{session.docs.length !== 1 ? "s" : ""}</span>}
          {session.links.length > 0 && <span className="text-xs text-outline">{session.links.length} link{session.links.length !== 1 ? "s" : ""}</span>}
          <span className={`text-xs font-bold uppercase ${session.is_published ? "text-primary-container" : "text-outline"}`}>
            {session.is_published ? "PUB" : "BORR"}
          </span>
        </div>
      </button>
      <button onClick={onEdit} className="text-outline hover:text-on-surface">
        <span className="material-symbols-outlined text-sm">edit</span>
      </button>
      <button onClick={onDelete} className="text-error hover:opacity-70">
        <span className="material-symbols-outlined text-sm">delete</span>
      </button>
    </div>
  );
}

// ── Session Panel ─────────────────────────────────────────────────────────────

function SessionPanel({
  session, courseId, moduleId, jsonHeaders, authHeaders, onSaved, onClose,
}: {
  session: LocalSession;
  courseId: number;
  moduleId: number;
  jsonHeaders: () => Promise<Record<string, string>>;
  authHeaders: () => Promise<Record<string, string>>;
  onSaved: (s: LocalSession, isNew: boolean) => void;
  onClose: () => void;
}) {
  const isNew = session.id === 0;

  const [title, setTitle]             = useState(session.title);
  const [description, setDescription] = useState(session.description ?? "");
  const [durationMin, setDurationMin] = useState(String(session.duration_minutes ?? ""));
  const [isPublished, setIsPublished] = useState(session.is_published);
  const [videoUid, setVideoUid]       = useState(session.video_uid ?? "");
  const [links, setLinks]             = useState<CourseSessionLink[]>(session.links);
  const [docs, setDocs]               = useState<CourseSessionDocument[]>(session.docs);

  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [removedDocIds, setRemovedDocIds] = useState<number[]>([]);

  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [docUploading, setDocUploading]     = useState(false);

  // Link editing state
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl]     = useState("");
  const [linkLoading, setLinkLoading]   = useState(false);

  const videoRef = useRef<HTMLInputElement>(null);
  const docRef   = useRef<HTMLInputElement>(null);

  async function uploadVideo(file: File) {
    setVideoUploading(true);
    try {
      const h = await authHeaders();
      const r1 = await fetch("/api/admin/stream-upload-url", {
        method: "POST",
        headers: { ...h, "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      });
      if (!r1.ok) throw new Error("Error al obtener URL de subida");
      const { uid, uploadURL } = await r1.json();
      await fetch(uploadURL, { method: "PUT", body: file });
      setVideoUid(uid);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setVideoUploading(false);
    }
  }

  async function uploadDoc(file: File) {
    setDocUploading(true);
    try {
      const h = await authHeaders();
      const form = new FormData();
      form.append("file", file);
      form.append("courseId", String(courseId));
      const res = await fetch("/api/admin/course-doc-upload", { method: "POST", headers: h, body: form });
      if (!res.ok) { setSaveError("Error al subir el documento"); return; }
      const data: PendingDoc = await res.json();
      setPendingDocs(prev => [...prev, data]);
    } finally {
      setDocUploading(false);
    }
  }

  function removeExistingDoc(id: number) {
    setDocs(prev => prev.filter(d => d.id !== id));
    setRemovedDocIds(prev => [...prev, id]);
  }

  function removePendingDoc(path: string) {
    setPendingDocs(prev => prev.filter(d => d.path !== path));
  }

  async function addLink() {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) return;
    if (isNew) {
      // Will be sent with the session save
      setLinks(prev => [...prev, {
        id: -(Date.now()), session_id: 0,
        label: newLinkLabel.trim(), url: newLinkUrl.trim(),
        sort_order: prev.length, created_at: "",
      }]);
      setNewLinkLabel(""); setNewLinkUrl(""); return;
    }
    setLinkLoading(true);
    const h = await jsonHeaders();
    const res = await fetch("/api/admin/course-session-links", {
      method: "POST",
      headers: h,
      body: JSON.stringify({ sessionId: session.id, label: newLinkLabel.trim(), url: newLinkUrl.trim(), sortOrder: links.length }),
    });
    if (res.ok) {
      const link: CourseSessionLink = await res.json();
      setLinks(prev => [...prev, link]);
      setNewLinkLabel(""); setNewLinkUrl("");
    }
    setLinkLoading(false);
  }

  async function removeLink(id: number) {
    if (isNew || id < 0) {
      setLinks(prev => prev.filter(l => l.id !== id)); return;
    }
    const h = await jsonHeaders();
    await fetch("/api/admin/course-session-links", { method: "DELETE", headers: h, body: JSON.stringify({ id }) });
    setLinks(prev => prev.filter(l => l.id !== id));
  }

  async function save() {
    if (!title.trim()) { setSaveError("El título es requerido"); return; }
    setSaving(true); setSaveError(null);
    const h = await jsonHeaders();

    const tempLinks = links.filter(l => l.id < 0).map(l => ({ label: l.label, url: l.url, sortOrder: l.sort_order }));

    if (isNew) {
      const res = await fetch("/api/admin/course-sessions", {
        method: "POST",
        headers: h,
        body: JSON.stringify({
          moduleId,
          title: title.trim(),
          description: description.trim() || null,
          videoUid: videoUid || null,
          durationMinutes: durationMin ? Number(durationMin) : null,
          isPublished,
          sortOrder: 0,
          pendingDocs,
          links: tempLinks,
        }),
      });
      if (!res.ok) { setSaveError("Error al crear la sesión"); setSaving(false); return; }
      const created: CourseSession = await res.json();
      onSaved({ ...created, links: links.filter(l => l.id > 0), docs: [] }, true);
    } else {
      const res = await fetch("/api/admin/course-sessions", {
        method: "PUT",
        headers: h,
        body: JSON.stringify({
          id: session.id,
          moduleId,
          title: title.trim(),
          description: description.trim() || null,
          videoUid: videoUid || null,
          durationMinutes: durationMin ? Number(durationMin) : null,
          isPublished,
          pendingDocs,
          removedDocIds,
        }),
      });
      if (!res.ok) { setSaveError("Error al guardar la sesión"); setSaving(false); return; }
      const updated: CourseSession = await res.json();
      onSaved({ ...updated, links, docs }, false);
    }
    setSaving(false);
  }

  return (
    <div className="w-96 border-l border-surface-container-high bg-surface min-h-screen flex flex-col">
      {/* Panel header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-surface-container">
        <h2 className="flex-1 font-headline font-black text-sm uppercase tracking-tight">
          {isNew ? "NUEVA SESIÓN" : "EDITAR SESIÓN"}
        </h2>
        <button onClick={onClose} className="text-outline hover:text-on-surface">
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Basic fields */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-1">Título *</label>
          <input
            className="w-full bg-surface border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-container"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-1">Descripción</label>
          <textarea
            className="w-full bg-surface border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none resize-none"
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-1">Duración (min)</label>
            <input
              type="number"
              className="w-full bg-surface border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none"
              value={durationMin}
              onChange={e => setDurationMin(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2 pb-0.5">
            <label className="text-xs font-bold uppercase tracking-widest text-outline">Publicada</label>
            <button
              type="button"
              onClick={() => setIsPublished(p => !p)}
              className={`relative w-10 h-5 transition-colors ${isPublished ? "bg-primary-container" : "bg-outline-variant"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-surface transition-transform ${isPublished ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>

        {/* Video */}
        <div className="bg-surface-container p-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-outline">Video (CF Stream)</p>
          {videoUid ? (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
              <span className="text-xs font-mono text-on-surface flex-1 truncate">{videoUid}</span>
              <button onClick={() => setVideoUid("")} className="text-error text-xs">Quitar</button>
            </div>
          ) : (
            <>
              <input ref={videoRef} type="file" accept="video/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadVideo(f); }} />
              <button
                onClick={() => videoRef.current?.click()}
                disabled={videoUploading}
                className="flex items-center gap-1 text-xs font-bold uppercase text-on-surface-variant bg-surface border border-outline-variant px-3 py-1.5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">upload</span>
                {videoUploading ? "Subiendo..." : "Subir video"}
              </button>
            </>
          )}
        </div>

        {/* Links */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-outline">Links de apoyo</p>
          {links.map(l => (
            <div key={l.id} className="flex items-center gap-2 bg-surface-container px-3 py-2">
              <span className="material-symbols-outlined text-sm text-outline">link</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{l.label}</p>
                <p className="text-xs text-outline truncate">{l.url}</p>
              </div>
              <button onClick={() => removeLink(l.id)} className="text-error">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          ))}
          <div className="space-y-1.5">
            <input
              className="w-full bg-surface border border-outline-variant px-3 py-1.5 text-xs text-on-surface focus:outline-none"
              placeholder="Nombre del link"
              value={newLinkLabel}
              onChange={e => setNewLinkLabel(e.target.value)}
            />
            <input
              className="w-full bg-surface border border-outline-variant px-3 py-1.5 text-xs text-on-surface focus:outline-none"
              placeholder="URL (https://...)"
              value={newLinkUrl}
              onChange={e => setNewLinkUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addLink()}
            />
            <button
              onClick={addLink}
              disabled={linkLoading || !newLinkLabel.trim() || !newLinkUrl.trim()}
              className="text-xs font-bold uppercase text-primary-container disabled:opacity-40"
            >
              + Añadir link
            </button>
          </div>
        </div>

        {/* Documents */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-outline">Documentos descargables</p>
          {docs.map(d => (
            <div key={d.id} className="flex items-center gap-2 bg-surface-container px-3 py-2">
              <span className="material-symbols-outlined text-sm text-outline">description</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{d.label}</p>
                <p className="text-xs text-outline">{(d.size_bytes / 1024).toFixed(0)} KB</p>
              </div>
              <button onClick={() => removeExistingDoc(d.id)} className="text-error">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          ))}
          {pendingDocs.map(d => (
            <div key={d.path} className="flex items-center gap-2 bg-primary-container/10 px-3 py-2">
              <span className="material-symbols-outlined text-sm text-primary-container">description</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{d.label}</p>
                <p className="text-xs text-outline">Pendiente de guardar</p>
              </div>
              <button onClick={() => removePendingDoc(d.path)} className="text-error">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          ))}
          <input ref={docRef} type="file"
            accept=".pdf,.zip,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.txt,.md"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { uploadDoc(f); e.target.value = ""; } }}
          />
          <button
            onClick={() => docRef.current?.click()}
            disabled={docUploading}
            className="flex items-center gap-1 text-xs font-bold uppercase text-on-surface-variant bg-surface border border-outline-variant px-3 py-1.5 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">attach_file</span>
            {docUploading ? "Subiendo..." : "Añadir documento"}
          </button>
          <p className="text-xs text-outline">PDF, ZIP, DOCX, PPTX, XLSX, imágenes — máx. 25 MB</p>
        </div>
      </div>

      {/* Save bar */}
      <div className="border-t border-surface-container-high px-4 py-3 bg-surface-container space-y-2">
        {saveError && <p className="text-xs text-error">{saveError}</p>}
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-primary-container text-on-primary-container font-bold text-xs uppercase tracking-widest py-2 disabled:opacity-50"
          >
            {saving ? "GUARDANDO..." : isNew ? "CREAR SESIÓN" : "GUARDAR CAMBIOS"}
          </button>
          <button onClick={onClose} className="px-4 text-xs text-outline uppercase border border-outline-variant">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
