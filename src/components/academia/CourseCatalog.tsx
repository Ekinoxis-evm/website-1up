"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import type { Course } from "@/types/database.types";
import { formatCop } from "@/lib/utils";

interface Props { courses: Course[] }

const CATEGORIES = ["All", "Performance", "Technology", "Gaming"] as const;
type Cat = (typeof CATEGORIES)[number];

const CAT_STYLE: Record<string, { badge: string; border: string }> = {
  Performance: { badge: "bg-tertiary text-background",         border: "border-tertiary"           },
  Technology:  { badge: "bg-secondary-container text-white",   border: "border-secondary-container" },
  Gaming:      { badge: "bg-primary-container text-white",     border: "border-primary-container"  },
};

type CheckoutStatus = "idle" | "loading" | "redirecting" | "error";

export function CourseCatalog({ courses }: Props) {
  const [active, setActive] = useState<Cat>("All");
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<Record<number, CheckoutStatus>>({});

  const visible = active === "All" ? courses : courses.filter((c) => c.category === active);

  // Fetch affiliate status once user is authenticated
  const fetchAffiliateStatus = useCallback(async () => {
    if (!authenticated) return;
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/user/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const profile = await res.json();
        setIsAffiliate(profile?.comfenalco_afiliado === true);
      }
    } catch {
      // Non-blocking — affiliate status is a bonus, not required
    }
  }, [authenticated, getAccessToken]);

  useEffect(() => { fetchAffiliateStatus(); }, [fetchAffiliateStatus]);

  async function handleEnroll(course: Course) {
    if (!ready) return;

    if (!authenticated) {
      login();
      return;
    }

    if (!course.price_cop) return;

    setCheckoutStatus((prev) => ({ ...prev, [course.id]: "loading" }));

    try {
      const token = await getAccessToken();
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ courseId: course.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("[Checkout]", data.error);
        setCheckoutStatus((prev) => ({ ...prev, [course.id]: "error" }));
        setTimeout(() => setCheckoutStatus((prev) => ({ ...prev, [course.id]: "idle" })), 3000);
        return;
      }

      setCheckoutStatus((prev) => ({ ...prev, [course.id]: "redirecting" }));
      window.location.href = data.checkoutUrl;
    } catch {
      setCheckoutStatus((prev) => ({ ...prev, [course.id]: "error" }));
      setTimeout(() => setCheckoutStatus((prev) => ({ ...prev, [course.id]: "idle" })), 3000);
    }
  }

  function getPriceDisplay(course: Course) {
    if (!course.price_cop) return null;
    // Affiliate discount preview is approximate — real discount applied at checkout
    // We show the badge, actual final price is computed server-side
    return {
      original: formatCop(course.price_cop),
      hasDiscount: isAffiliate,
    };
  }

  return (
    <section className="py-20 px-8 md:px-16 bg-surface-container-lowest">
      {/* Header + filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h2 className="font-headline text-4xl font-black uppercase tracking-tighter">
            COURSE <span className="text-tertiary">CATALOG</span>
          </h2>
          <div className="h-2 w-24 bg-primary-container mt-2" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`font-headline font-black text-xs px-5 py-2 uppercase tracking-widest transition-all ${
                active === cat
                  ? "bg-primary-container text-white"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {cat === "All" ? "Todos" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Comfenalco banner (only shown to authenticated affiliates) */}
      {authenticated && isAffiliate && (
        <div className="bg-secondary-container/10 border-l-4 border-secondary-container px-6 py-4 mb-8 flex items-center gap-3">
          <span className="material-symbols-outlined text-secondary-container text-xl">verified</span>
          <p className="font-body text-sm text-on-surface">
            <span className="font-headline font-black text-secondary-container">Afiliado Comfenalco</span>
            {" — "}Tu descuento se aplica automáticamente al inscribirte.
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {visible.map((course) => {
          const style = CAT_STYLE[course.category] ?? CAT_STYLE.Gaming;
          const priceDisplay = getPriceDisplay(course);
          const cStatus = checkoutStatus[course.id] ?? "idle";

          return (
            <div
              key={course.id}
              className={`bg-surface-container border-t-4 ${style.border} group hover:bg-surface-container-high transition-colors`}
            >
              {/* Image */}
              <div className="aspect-video bg-surface-container-high relative overflow-hidden">
                {course.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={course.image_url}
                    alt={course.name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-[3rem] text-surface-container-highest">school</span>
                  </div>
                )}
                {/* Category badge */}
                <span className={`absolute top-3 left-3 ${style.badge} font-headline font-black text-[10px] px-2 py-1 uppercase tracking-widest`}>
                  {course.category}
                </span>
                {/* Duration */}
                {course.duration_hours && (
                  <span className="absolute top-3 right-3 bg-surface-container-lowest/80 text-on-surface font-headline font-bold text-[10px] px-2 py-1 uppercase">
                    {course.duration_hours}H
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="p-6">
                <h3 className="font-headline font-black text-xl text-on-background uppercase tracking-tight mb-2">
                  {course.name}
                </h3>
                {course.description && (
                  <p className="font-body text-sm text-on-surface-variant mb-4 leading-relaxed">
                    {course.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-4">
                  {/* Price */}
                  <div>
                    <div className="font-headline font-black text-primary text-lg">
                      {priceDisplay?.original ?? "Por definir"}
                      {priceDisplay && (
                        <span className="text-xs text-outline font-body font-normal ml-1">/ persona</span>
                      )}
                    </div>
                    {priceDisplay?.hasDiscount && (
                      <div className="font-headline font-black text-[10px] text-secondary-container uppercase tracking-widest mt-0.5">
                        Descuento Comfenalco aplicado al pagar
                      </div>
                    )}
                  </div>

                  {/* Enroll button */}
                  {course.price_cop ? (
                    <button
                      onClick={() => handleEnroll(course)}
                      disabled={cStatus === "loading" || cStatus === "redirecting"}
                      className={`font-headline font-black text-xs px-5 py-2 skew-fix transition-all disabled:opacity-70 ${
                        cStatus === "error"
                          ? "bg-error text-white"
                          : "bg-primary-container text-white hover:neo-shadow-pink"
                      }`}
                    >
                      <span className="block skew-content">
                        {cStatus === "loading"    ? "..." :
                         cStatus === "redirecting" ? "REDIRIGIENDO" :
                         cStatus === "error"       ? "ERROR" :
                         authenticated             ? "INSCRIBIRSE" : "LOGIN"}
                      </span>
                    </button>
                  ) : (
                    <span className="font-headline text-xs text-outline uppercase tracking-widest">Pronto</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {visible.length === 0 && (
          <p className="col-span-3 text-outline font-body text-center py-12">
            {active === "All"
              ? "Los cursos se configuran desde el panel de administración."
              : `No hay cursos de ${active} disponibles aún.`}
          </p>
        )}
      </div>
    </section>
  );
}
