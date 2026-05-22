"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import type { Course } from "@/types/database.types";
import { formatCop } from "@/lib/utils";
import { CourseCheckoutWizard } from "./CourseCheckoutWizard";

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
  duration_minutes: number | null;
  sort_order: number;
};

interface Props {
  course: Course;
  modules: Module[];
  sessions: Session[];
  masterName: string | null;
  masterPhoto: string | null;
}

const CAT_STYLE: Record<string, { badge: string; accent: string }> = {
  Performance: { badge: "bg-tertiary text-background",       accent: "text-tertiary" },
  Technology:  { badge: "bg-secondary-container text-white", accent: "text-secondary-container" },
  Gaming:      { badge: "bg-primary-container text-white",   accent: "text-primary-container" },
};

function IntroPlayer({ courseId }: { courseId: number }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const customerCode = process.env.NEXT_PUBLIC_CF_CUSTOMER_CODE;

  async function play() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/public/course-intro-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      if (!res.ok) { setError("No se pudo cargar el video."); setLoading(false); return; }
      const { token: t } = await res.json();
      setToken(t);
    } catch {
      setError("No se pudo cargar el video.");
    } finally {
      setLoading(false);
    }
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
      <span
        className="material-symbols-outlined text-6xl text-primary-container"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {loading ? "hourglass_top" : "play_circle"}
      </span>
      <span className="text-xs font-bold uppercase tracking-widest text-outline">
        {loading ? "Cargando..." : error ?? "Ver presentación"}
      </span>
    </button>
  );
}

export function CoursePreview({ course, modules, sessions, masterName, masterPhoto }: Props) {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const [checkout, setCheckout] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState<string | null>(null);
  const [openModuleId, setOpenModuleId] = useState<number | null>(modules[0]?.id ?? null);

  const embedded = wallets.find((w) => w.walletClientType === "privy");
  const walletAddress = embedded?.address ?? wallets[0]?.address ?? null;

  useEffect(() => {
    fetch("/api/user/pass-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => { if (cfg?.recipient_address) setRecipientAddress(cfg.recipient_address); })
      .catch(() => null);
  }, []);

  function handleEnroll() {
    if (!ready) return;
    if (!authenticated) { login(); return; }
    if (!course.price_cop) return;
    setCheckout(true);
  }

  const style = CAT_STYLE[course.category] ?? CAT_STYLE.Gaming;
  const totalSessions = sessions.length;
  const totalDuration = sessions.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0);

  return (
    <div className="bg-background min-h-screen pb-24">
      {/* Breadcrumb */}
      <div className="px-8 md:px-16 pt-8 pb-4 flex items-center gap-2 text-xs uppercase tracking-widest text-outline font-headline font-bold">
        <Link href="/academia" className="hover:text-on-surface">Academia</Link>
        <span>/</span>
        <span className="text-on-surface truncate">{course.name}</span>
      </div>

      {/* Hero — intro video left, info card (with cover image) right */}
      <section className="px-8 md:px-16 grid grid-cols-1 lg:grid-cols-5 gap-6 pb-12">
        {/* Left — intro video (falls back to the cover image when there is no video) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative">
            {course.intro_video_uid ? (
              <IntroPlayer courseId={course.id} />
            ) : course.image_url ? (
              <div className="aspect-video bg-surface-container overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={course.image_url} alt={course.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-video bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-7xl text-surface-container-highest">school</span>
              </div>
            )}
            <span className={`absolute top-4 left-4 ${style.badge} font-headline font-black text-xs px-3 py-1 uppercase tracking-widest z-10`}>
              {course.category}
            </span>
          </div>
          {course.intro_video_uid && (
            <p className="font-body text-sm md:text-base text-on-surface-variant leading-relaxed whitespace-pre-line">
              {course.intro_description || "Mira el video de presentación para conocer este curso por dentro."}
            </p>
          )}
        </div>

        {/* Right — info card */}
        <div className="lg:col-span-2 bg-surface-container p-6 flex flex-col gap-4">
          {/* Cover image (shown here when the hero slot is taken by the video) */}
          {course.intro_video_uid && course.image_url && (
            <div className="aspect-video bg-surface overflow-hidden -mt-6 -mx-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={course.image_url} alt={course.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <div className="inline-block bg-primary-container px-3 py-1 mb-3 skew-fix">
              <span className="text-white font-black italic skew-content block text-[10px] tracking-widest font-headline">
                CURSO ACADEMIA 1UP
              </span>
            </div>
            <h1 className="font-headline font-black text-3xl md:text-4xl uppercase tracking-tighter leading-none">
              {course.name}
            </h1>
            <div className={`h-1 w-16 ${style.accent.replace("text-", "bg-")} mt-3`} />
          </div>

          {masterName && (
            <div className="flex items-center gap-3 bg-surface px-3 py-2">
              {masterPhoto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={masterPhoto} alt={masterName} className="w-8 h-8 object-cover rounded-full shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-outline font-headline font-bold">Master</p>
                <p className="text-sm text-on-surface font-bold truncate">{masterName}</p>
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-px bg-outline-variant">
            <Stat icon="schedule" label="Duración" value={course.duration_hours ? `${course.duration_hours}h` : "—"} />
            <Stat icon="layers" label="Sesiones" value={totalSessions > 0 ? String(totalSessions) : "—"} />
            <Stat icon="timer" label="Por sesión" value={course.session_duration_min ? `${course.session_duration_min}m` : "—"} />
          </div>

          {course.description && (
            <p className="font-body text-sm text-on-surface-variant leading-relaxed">{course.description}</p>
          )}

          {/* Price + CTA */}
          <div className="bg-surface px-4 py-4 mt-auto">
            <p className="text-[10px] uppercase tracking-widest text-outline font-headline font-bold">Precio</p>
            <div className="flex items-baseline gap-2">
              <span className="font-headline font-black text-3xl text-primary-container">
                {course.price_cop ? formatCop(course.price_cop) : "Próximamente"}
              </span>
              {course.price_cop && (
                <span className="text-xs text-outline font-body">/ persona</span>
              )}
            </div>
            {course.price_token && (
              <p className="text-xs text-outline mt-1">
                o <span className="text-on-surface font-bold">{course.price_token} $1UP</span>
              </p>
            )}
          </div>

          {course.price_cop ? (
            <button
              onClick={handleEnroll}
              className="font-headline font-black text-sm px-6 py-3 skew-fix bg-primary-container text-white hover:neo-shadow-pink transition-all w-full"
            >
              <span className="block skew-content">
                {authenticated ? "INSCRIBIRSE AHORA" : "INICIAR SESIÓN PARA INSCRIBIRSE"}
              </span>
            </button>
          ) : (
            <div className="bg-surface text-center py-3 font-headline font-bold text-xs text-outline uppercase tracking-widest">
              Inscripciones próximamente
            </div>
          )}
        </div>
      </section>

      {/* Curriculum */}
      <section className="px-8 md:px-16 pb-12">
        <div className="inline-block bg-primary-container px-3 py-1 mb-4 skew-fix">
          <span className="text-white font-black italic skew-content block text-[10px] tracking-widest font-headline">
            CONTENIDO DEL CURSO
          </span>
        </div>
        <h2 className="font-headline font-black text-2xl md:text-3xl uppercase tracking-tighter mb-6">
          MÓDULOS Y <span className="text-primary-container">SESIONES</span>
        </h2>

        {modules.length === 0 ? (
          <div className="bg-surface-container p-8 text-center text-outline text-sm">
            El temario se publicará próximamente.
          </div>
        ) : (
          <div className="space-y-1 bg-surface-container">
            {modules.map((m, idx) => {
              const moduleSessions = sessions.filter((s) => s.module_id === m.id);
              const open = openModuleId === m.id;
              const moduleMinutes = moduleSessions.reduce((a, s) => a + (s.duration_minutes ?? 0), 0);
              return (
                <div key={m.id} className="bg-surface">
                  <button
                    onClick={() => setOpenModuleId(open ? null : m.id)}
                    className="w-full flex items-center gap-3 px-4 py-4 hover:bg-surface-container transition-colors text-left"
                  >
                    <span className="font-headline font-black text-xs text-outline w-8 shrink-0">
                      M{String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-headline font-bold text-sm text-on-surface uppercase tracking-tight truncate">
                        {m.title}
                      </p>
                      <p className="text-xs text-outline mt-0.5">
                        {moduleSessions.length} sesión{moduleSessions.length !== 1 ? "es" : ""}
                        {moduleMinutes > 0 && ` · ${moduleMinutes} min`}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-outline">
                      {open ? "expand_less" : "expand_more"}
                    </span>
                  </button>

                  {open && (
                    <div className="bg-surface-container-lowest">
                      {m.description && (
                        <p className="px-4 py-3 text-sm text-on-surface-variant border-l-4 border-primary-container">
                          {m.description}
                        </p>
                      )}
                      {moduleSessions.length === 0 ? (
                        <p className="px-4 py-4 text-xs text-outline text-center">
                          Sesiones próximamente.
                        </p>
                      ) : (
                        <div className="space-y-px">
                          {moduleSessions.map((s, sIdx) => (
                            <div
                              key={s.id}
                              className="flex items-center gap-3 px-4 py-3 bg-surface"
                            >
                              <span className="font-mono text-xs text-outline w-8 shrink-0">
                                {idx + 1}.{sIdx + 1}
                              </span>
                              <span
                                className="material-symbols-outlined text-sm text-outline shrink-0"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                                title="Contenido bloqueado — requiere inscripción"
                              >
                                lock
                              </span>
                              <span className="flex-1 text-sm text-on-surface truncate">{s.title}</span>
                              {s.duration_minutes && (
                                <span className="text-xs text-outline shrink-0">{s.duration_minutes} min</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalDuration > 0 && (
          <p className="mt-4 text-xs text-outline uppercase tracking-widest font-headline font-bold">
            <span className="material-symbols-outlined text-sm align-text-bottom">play_circle</span>{" "}
            {totalDuration} minutos de contenido en video
          </p>
        )}
      </section>

      {/* Sticky-ish bottom CTA */}
      <section className="px-8 md:px-16">
        <div className="bg-primary-container/10 border-l-4 border-primary-container p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
          <span
            className="material-symbols-outlined text-4xl text-primary-container"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            lock_open
          </span>
          <div className="flex-1">
            <p className="font-headline font-black text-lg md:text-xl uppercase tracking-tight">
              Desbloquea todo el contenido
            </p>
            <p className="text-sm text-on-surface-variant">
              Inscríbete para acceder a los videos, documentos y links de cada sesión.
            </p>
          </div>
          {course.price_cop && (
            <button
              onClick={handleEnroll}
              className="font-headline font-black text-sm px-6 py-3 skew-fix bg-primary-container text-white hover:neo-shadow-pink transition-all w-full md:w-auto"
            >
              <span className="block skew-content">
                {authenticated ? `INSCRIBIRSE — ${formatCop(course.price_cop)}` : "INICIAR SESIÓN"}
              </span>
            </button>
          )}
        </div>
      </section>

      {checkout && (
        <CourseCheckoutWizard
          course={course}
          walletAddress={walletAddress}
          recipientAddress={recipientAddress}
          getAccessToken={getAccessToken}
          onClose={() => setCheckout(false)}
        />
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-surface px-3 py-3 flex flex-col items-center text-center">
      <span className="material-symbols-outlined text-primary-container text-base mb-1">{icon}</span>
      <p className="text-[10px] uppercase tracking-widest text-outline font-headline font-bold">{label}</p>
      <p className="text-sm text-on-surface font-bold">{value}</p>
    </div>
  );
}
