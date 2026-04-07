"use client";

import { useEffect } from "react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.1upesports.org";

export default function AppLoginPage() {
  const { login, authenticated, ready } = usePrivy();

  useEffect(() => {
    if (ready && authenticated) {
      window.location.href = APP_URL;
    }
  }, [ready, authenticated]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      {/* Top accent bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-primary-container" />

      <div className="w-full max-w-md space-y-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <Image src="/1up.png" alt="1UP Gaming Tower" width={72} height={72} className="object-contain" />
          <div className="text-center">
            <h1 className="font-headline font-black text-5xl text-primary italic tracking-tighter leading-none">
              1UP
            </h1>
            <p className="font-headline font-bold text-on-background/50 uppercase tracking-widest text-xs mt-1">
              Gaming Tower
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface-container border-l-4 border-primary-container p-8 space-y-6">
          <div>
            <h2 className="font-headline font-black text-3xl uppercase tracking-tighter text-on-background leading-tight">
              ACCEDE A TU <span className="text-primary">PERFIL</span>
            </h2>
            <p className="font-body text-on-background/50 text-sm mt-2">
              Gestiona tu wallet $1UP, cursos, identidad y tu 1UP Pass.
            </p>
          </div>

          <button
            onClick={login}
            disabled={!ready}
            className="w-full bg-primary-container text-white py-4 font-headline font-black text-xl uppercase tracking-tighter skew-fix hover:bg-primary hover:neo-shadow-pink transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="block skew-content">
              {!ready ? "CARGANDO..." : "INGRESAR"}
            </span>
          </button>

          <p className="font-body text-on-background/30 text-xs text-center">
            Email · Google · Discord — impulsado por Privy
          </p>
        </div>

        {/* Back link */}
        <div className="text-center">
          <a
            href={process.env.NEXT_PUBLIC_BASE_URL ?? "https://1upesports.org"}
            className="font-headline font-bold text-xs uppercase tracking-widest text-on-background/30 hover:text-primary transition-colors"
          >
            ← Volver al sitio
          </a>
        </div>
      </div>

      {/* Bottom accent */}
      <div className="fixed bottom-0 left-0 w-full h-1 bg-secondary-container" />
    </div>
  );
}
