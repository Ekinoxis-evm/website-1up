"use client";

import { useEffect } from "react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "https://admin.1upesports.org";

export default function AdminLoginPage() {
  const { login, authenticated, ready } = usePrivy();

  useEffect(() => {
    if (ready && authenticated) {
      window.location.href = ADMIN_URL;
    }
  }, [ready, authenticated]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="fixed top-0 left-0 w-full h-1 bg-primary-container" />

      <div className="w-full max-w-md space-y-10">
        <div className="flex flex-col items-center gap-4">
          <Image src="/1up.png" alt="1UP Gaming Tower" width={64} height={64} className="object-contain" />
          <div className="text-center">
            <h1 className="font-headline font-black text-4xl text-primary italic tracking-tighter leading-none">
              1UP
            </h1>
            <p className="font-headline font-bold text-on-background/40 uppercase tracking-widest text-xs mt-1">
              Admin Panel
            </p>
          </div>
        </div>

        <div className="bg-surface-container border-l-4 border-secondary-container p-8 space-y-6">
          <div>
            <h2 className="font-headline font-black text-2xl uppercase tracking-tighter text-on-background leading-tight">
              ACCESO <span className="text-secondary">ADMINISTRADOR</span>
            </h2>
            <p className="font-body text-on-background/50 text-sm mt-2">
              Solo usuarios autorizados por el equipo 1UP.
            </p>
          </div>

          <button
            onClick={login}
            disabled={!ready}
            className="w-full bg-secondary-container text-white py-4 font-headline font-black text-xl uppercase tracking-tighter hover:neo-shadow-blue transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {!ready ? "CARGANDO..." : "INGRESAR"}
          </button>

          <p className="font-body text-on-background/30 text-xs text-center">
            Email · Google · Discord — impulsado por Privy
          </p>
        </div>

        <div className="text-center">
          <a
            href={process.env.NEXT_PUBLIC_BASE_URL ?? "https://1upesports.org"}
            className="font-headline font-bold text-xs uppercase tracking-widest text-on-background/30 hover:text-primary transition-colors"
          >
            ← Volver al sitio
          </a>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full h-1 bg-secondary-container" />
    </div>
  );
}
