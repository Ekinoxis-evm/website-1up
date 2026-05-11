"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Suspense } from "react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.1upesports.org";

function RefreshInner() {
  const { getAccessToken, ready } = usePrivy();
  const search = useSearchParams();

  useEffect(() => {
    if (!ready) return;
    (async () => {
      const token = await getAccessToken();
      const redirectUri = search.get("redirect_uri") ?? "/";
      if (token) {
        window.location.href = `${APP_URL}${redirectUri}`;
      } else {
        window.location.href = `${APP_URL}/login`;
      }
    })();
  }, [ready, getAccessToken, search]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
        <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline">
          Verificando sesión…
        </p>
      </div>
    </div>
  );
}

export default function RefreshPage() {
  return (
    <Suspense fallback={null}>
      <RefreshInner />
    </Suspense>
  );
}
