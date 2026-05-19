"use client";

import { useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";

type ContentItem = {
  id: number;
  title: string;
  content_type: string;
  url: string | null;
  stream_uid: string | null;
  is_published: boolean | null;
  sort_order: number | null;
};

type EnrolledCourse = {
  course_id: number;
  course_name: string;
  content: ContentItem[];
};

interface Props {
  enrolledCourses: EnrolledCourse[];
  baseUrl: string;
}

function StreamPlayer({ contentId }: { contentId: number }) {
  const { getAccessToken } = usePrivy();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function play() {
    setLoading(true);
    setError(null);
    const accessToken = await getAccessToken();
    const res = await fetch("/api/user/stream-token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ contentId }),
    });
    if (!res.ok) { setError("No se pudo cargar el video."); setLoading(false); return; }
    const { token: t } = await res.json();
    setToken(t);
    setLoading(false);
  }

  if (token) {
    return (
      <div className="w-full aspect-video bg-black">
        <iframe
          src={`https://customer-${process.env.NEXT_PUBLIC_CF_CUSTOMER_CODE}.cloudflarestream.com/${token}/iframe`}
          className="w-full h-full"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      onClick={play}
      disabled={loading}
      className="w-full aspect-video bg-surface-container-lowest flex flex-col items-center justify-center gap-3 hover:bg-surface-container transition-colors disabled:opacity-60"
    >
      {loading ? (
        <span className="material-symbols-outlined text-4xl text-on-surface/30 animate-pulse">hourglass_top</span>
      ) : (
        <>
          <span className="material-symbols-outlined text-5xl text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
          <span className="font-headline font-bold text-xs uppercase text-on-surface/50">Ver video</span>
        </>
      )}
      {error && <p className="text-error text-xs font-body mt-1">{error}</p>}
    </button>
  );
}

export function AppAcademiaClient({ enrolledCourses, baseUrl }: Props) {
  const [openCourse, setOpenCourse] = useState<number | null>(
    enrolledCourses[0]?.course_id ?? null
  );

  if (enrolledCourses.length === 0) {
    return (
      <div className="bg-surface-container-low p-12 flex flex-col items-center justify-center gap-6 text-center">
        <span className="material-symbols-outlined text-on-surface/15 text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
        <div>
          <h2 className="font-headline font-black text-3xl text-on-surface uppercase tracking-tighter mb-2">Sin cursos inscritos</h2>
          <p className="font-body text-on-surface/50 max-w-md">Aquí verás los cursos en los que estés inscrito, el acceso al contenido y tus certificados en blockchain.</p>
        </div>
        <a href={`${baseUrl}/academia`} className="bg-secondary-container text-white px-10 py-4 font-headline font-black text-lg uppercase tracking-tighter skew-fix hover:neo-shadow-pink transition-all active:scale-95">
          <span className="block skew-content">VER CURSOS</span>
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {enrolledCourses.map((ec) => {
        const isOpen = openCourse === ec.course_id;
        const published = ec.content.filter((c) => c.is_published);
        return (
          <div key={ec.course_id} className="bg-surface-container">
            <div className="flex items-center px-6 py-4">
              <button
                onClick={() => setOpenCourse(isOpen ? null : ec.course_id)}
                className="flex-1 text-left"
              >
                <span className="font-headline font-black text-lg uppercase tracking-tighter text-on-background">{ec.course_name}</span>
              </button>
              <Link
                href={`/app/academia/${ec.course_id}`}
                className="text-xs font-bold uppercase tracking-widest text-primary-container mr-4"
              >
                Ver curriculum
              </Link>
              <button onClick={() => setOpenCourse(isOpen ? null : ec.course_id)}>
                <span className="material-symbols-outlined text-on-surface/50">{isOpen ? "expand_less" : "expand_more"}</span>
              </button>
            </div>

            {isOpen && (
              <div className="px-6 pb-6 space-y-4">
                {published.length === 0 && (
                  <p className="font-body text-sm text-on-surface/40">Contenido próximamente.</p>
                )}
                {published.map((item) => (
                  <div key={item.id} className="bg-surface-container-lowest">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="material-symbols-outlined text-primary-container text-xl" style={{ fontVariationSettings: item.content_type === "video" ? "'FILL' 1" : "'FILL' 0" }}>
                        {item.content_type === "video" ? "play_circle" : item.content_type === "document" ? "description" : "quiz"}
                      </span>
                      <span className="font-headline font-bold text-sm text-on-background flex-1">{item.title}</span>
                      {item.content_type !== "video" && item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-secondary font-headline font-bold text-xs uppercase">Abrir</a>
                      )}
                    </div>
                    {item.content_type === "video" && item.stream_uid && (
                      <StreamPlayer contentId={item.id} />
                    )}
                    {item.content_type === "video" && !item.stream_uid && item.url && (
                      <div className="px-4 pb-3">
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-secondary font-headline font-bold text-xs uppercase">Ver en enlace externo</a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
