"use client";

import { useState, useEffect } from "react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.1upesports.org";
const SESSION_KEY = "1up-pass-banner-dismissed";

export function PassSuggestionBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-background border-t-4 border-primary-container px-6 py-4 flex items-center justify-between gap-4 shadow-2xl">
      <div className="flex items-center gap-4 min-w-0">
        <span
          className="material-symbols-outlined text-primary-container text-2xl shrink-0"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          card_membership
        </span>
        <div className="min-w-0">
          <p className="font-headline font-black text-sm uppercase tracking-tighter text-on-background leading-tight">
            Obtén tu <span className="text-primary-container">1UP PASS</span>
          </p>
          <p className="font-body text-xs text-on-surface/60 hidden sm:block">
            Acceso completo al Gaming Tower + descuentos en cursos + beneficios exclusivos.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <a
          href={`${APP_URL}/pass`}
          className="bg-primary-container text-white font-headline font-black text-xs px-5 py-2 skew-fix hover:neo-shadow-pink transition-all whitespace-nowrap"
        >
          <span className="block skew-content">VER PASS</span>
        </a>
        <button
          onClick={dismiss}
          className="text-outline hover:text-on-surface transition-colors p-1"
          aria-label="Cerrar"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>
    </div>
  );
}
