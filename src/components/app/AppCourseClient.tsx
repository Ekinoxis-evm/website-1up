"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";

type CourseData = {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  duration_hours: number | null;
  session_duration_min: number | null;
  intro_video_uid: string | null;
  intro_description: string | null;
  masterName: string | null;
};

type Module = {
  id: number;
  title: string;
  description: string | null;
  sort_order: number;
};

type Session = {
  id: number;
  module_id: number;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  video_uid: string | null;
  is_published: boolean;
  sort_order: number;
};

type Link_ = {
  id: number;
  session_id: number;
  label: string;
  url: string;
  sort_order: number;
};

type Doc = {
  id: number;
  session_id: number;
  label: string;
  mime_type: string;
  size_bytes: number;
  sort_order: number;
};

interface Props {
  course: CourseData;
  modules: Module[];
  sessions: Session[];
  links: Link_[];
  docs: Doc[];
}

// ── Video player (lazy load token on play) ────────────────────────────────────

function StreamPlayer({ videoUid, endpoint, body }: {
  videoUid: string;
  endpoint: string;
  body: Record<string, unknown>;
}) {
  const { getAccessToken } = usePrivy();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const customerCode = process.env.NEXT_PUBLIC_CF_CUSTOMER_CODE;

  async function play() {
    setLoading(true); setError(null);
    const accessToken = await getAccessToken();
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) { setError("No se pudo cargar el video."); setLoading(false); return; }
    const { token: t } = await res.json();
    setToken(t); setLoading(false);
  }

  if (token) {
    return (
      <div className="w-full aspect-video bg-black">
        <iframe
          src={`https://customer-${customerCode}.cloudflarestream.com/${token}/iframe`}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <button
      onClick={play}
      disabled={loading}
      className="w-full aspect-video bg-surface-container-high flex flex-col items-center justify-center gap-3 hover:bg-surface-container-highest transition-colors disabled:opacity-60"
    >
      <span className="material-symbols-outlined text-5xl text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
        {loading ? "hourglass_top" : "play_circle"}
      </span>
      <span className="text-xs font-bold uppercase tracking-widest text-outline">
        {loading ? "Cargando..." : error ? error : "Reproducir"}
      </span>
    </button>
  );
}

// ── Doc download (lazy signed URL) ────────────────────────────────────────────

function DocDownload({ doc }: { doc: Doc }) {
  const { getAccessToken } = usePrivy();
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    const accessToken = await getAccessToken();
    const res = await fetch(`/api/user/course-document?id=${doc.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) { setLoading(false); return; }
    const { url } = await res.json();
    window.open(url, "_blank");
    setLoading(false);
  }

  return (
    <button
      onClick={download}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-2 bg-surface-container hover:bg-surface-container-high transition-colors text-left w-full disabled:opacity-50"
    >
      <span className="material-symbols-outlined text-sm text-outline">description</span>
      <span className="flex-1 text-sm text-on-surface truncate">{doc.label}</span>
      <span className="text-xs text-outline">{(doc.size_bytes / 1024).toFixed(0)} KB</span>
      <span className="material-symbols-outlined text-sm text-primary-container">download</span>
    </button>
  );
}

// ── Session panel ─────────────────────────────────────────────────────────────

function SessionView({ session, sessionLinks, sessionDocs }: {
  session: Session;
  sessionLinks: Link_[];
  sessionDocs: Doc[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-surface">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container transition-colors text-left"
      >
        <span className="material-symbols-outlined text-sm text-outline">
          {session.video_uid ? "play_circle" : "radio_button_unchecked"}
        </span>
        <span className="flex-1 text-sm text-on-surface">{session.title}</span>
        {session.duration_minutes && (
          <span className="text-xs text-outline">{session.duration_minutes} min</span>
        )}
        <span className="material-symbols-outlined text-sm text-outline">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {session.video_uid && (
            <StreamPlayer
              videoUid={session.video_uid}
              endpoint="/api/user/stream-token-v2"
              body={{ sessionId: session.id }}
            />
          )}

          {session.description && (
            <p className="text-sm text-on-surface-variant">{session.description}</p>
          )}

          {sessionLinks.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-outline">Links de apoyo</p>
              {sessionLinks.map(l => (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-secondary hover:underline"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  {l.label}
                </a>
              ))}
            </div>
          )}

          {sessionDocs.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-outline">Documentos</p>
              {sessionDocs.map(d => <DocDownload key={d.id} doc={d} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AppCourseClient({ course, modules, sessions, links, docs }: Props) {
  const [activeModuleId, setActiveModuleId] = useState<number | null>(modules[0]?.id ?? null);

  const totalSessions = sessions.length;
  const totalDuration = sessions.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0);

  return (
    <div className="space-y-6 pb-20">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-outline">
        <Link href="/app/academia" className="hover:text-on-surface">Mis cursos</Link>
        <span>/</span>
        <span className="text-on-surface">{course.name}</span>
      </div>

      {/* Course header */}
      <div className="bg-surface-container p-6 space-y-4">
        {course.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.image_url} alt={course.name} className="w-full aspect-video object-cover" />
        )}
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">{course.name}</h1>
          {course.masterName && (
            <p className="text-sm text-outline mt-1">Master: <span className="text-on-surface">{course.masterName}</span></p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-outline">
            {course.duration_hours && <span><span className="material-symbols-outlined text-sm align-text-bottom">schedule</span> {course.duration_hours}h totales</span>}
            {course.session_duration_min && <span><span className="material-symbols-outlined text-sm align-text-bottom">timer</span> {course.session_duration_min} min/sesión</span>}
            {totalSessions > 0 && <span><span className="material-symbols-outlined text-sm align-text-bottom">layers</span> {totalSessions} sesión{totalSessions !== 1 ? "es" : ""}</span>}
            {totalDuration > 0 && <span><span className="material-symbols-outlined text-sm align-text-bottom">play_circle</span> {totalDuration} min de video</span>}
          </div>
        </div>

        {course.description && <p className="text-sm text-on-surface-variant">{course.description}</p>}
      </div>

      {/* Intro video */}
      {course.intro_video_uid && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-outline">Video de presentación</p>
          <StreamPlayer
            videoUid={course.intro_video_uid}
            endpoint="/api/user/course-intro-token"
            body={{ courseId: course.id }}
          />
          {course.intro_description && (
            <p className="text-sm text-on-surface-variant">{course.intro_description}</p>
          )}
        </div>
      )}

      {/* Curriculum */}
      {modules.length === 0 ? (
        <div className="bg-surface-container p-8 text-center text-outline text-sm">
          El contenido del curso estará disponible pronto.
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-outline">Contenido del curso</p>

          {/* Module tabs */}
          {modules.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {modules.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setActiveModuleId(m.id)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                    activeModuleId === m.id
                      ? "bg-primary-container text-on-primary-container"
                      : "bg-surface-container text-outline hover:text-on-surface"
                  }`}
                >
                  M{i + 1}. {m.title}
                </button>
              ))}
            </div>
          )}

          {/* Active module */}
          {modules.map(m => {
            if (activeModuleId !== null && m.id !== activeModuleId) return null;
            const moduleSessions = sessions.filter(s => s.module_id === m.id);
            return (
              <div key={m.id} className="space-y-1">
                {modules.length === 1 && (
                  <div className="bg-surface-container px-4 py-3">
                    <p className="font-bold text-sm text-on-surface">{m.title}</p>
                    {m.description && <p className="text-xs text-outline mt-0.5">{m.description}</p>}
                  </div>
                )}
                {modules.length > 1 && m.description && (
                  <div className="bg-surface-container px-4 py-3">
                    <p className="text-sm text-on-surface-variant">{m.description}</p>
                  </div>
                )}
                <div className="space-y-px">
                  {moduleSessions.map(s => (
                    <SessionView
                      key={s.id}
                      session={s}
                      sessionLinks={links.filter(l => l.session_id === s.id)}
                      sessionDocs={docs.filter(d => d.session_id === s.id)}
                    />
                  ))}
                  {moduleSessions.length === 0 && (
                    <div className="bg-surface px-4 py-6 text-center text-xs text-outline">
                      Sesiones próximamente.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
