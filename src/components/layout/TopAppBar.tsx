"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Avatar } from "@/components/ui/Avatar";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.1upesports.org";

const NAV_LINKS = [
  { href: "/",             label: "Home"        },
  { href: "/academia",     label: "Academia"    },
  { href: "/torneos",      label: "Torneos"     },
  { href: "/gaming-tower", label: "Tower"       },
  { href: "/recreativo",   label: "Recreativo"  },
  { href: "/marketplace",  label: "Marketplace" },
];

export function TopAppBar() {
  const pathname = usePathname();
  const { logout, authenticated, ready, login, user, getAccessToken } = usePrivy();

  const displayName =
    user?.google?.name ??
    user?.email?.address ??
    user?.linkedAccounts?.[0]?.type ?? null;

  const [avatarUrl, setAvatarUrl]   = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);

  // Lazy-fetch the user's avatar + display name from the profile table.
  // Pure progressive enhancement — Privy already gives us a working displayName.
  useEffect(() => {
    if (!authenticated) { setAvatarUrl(null); setProfileName(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await fetch("/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setAvatarUrl(data.avatar_url ?? null);
        const name = [data.nombre, data.apellidos].filter(Boolean).join(" ") || data.username || null;
        setProfileName(name);
      } catch { /* silent — fallback to Privy displayName */ }
    })();
    return () => { cancelled = true; };
  }, [authenticated, getAccessToken]);

  return (
    <header className="flex justify-between items-center w-full px-6 py-4 sticky top-0 z-50 glass-panel">
      {/* Logo + Nav */}
      <div className="flex items-center gap-8">
        <Link href="/">
          <Image src="/1up.png" alt="1UP Gaming Tower" width={44} height={44} className="object-contain" />
        </Link>

        <nav className="hidden md:flex gap-6 items-center">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`font-headline font-bold uppercase tracking-tighter transition-colors ${
                  active
                    ? "text-primary border-b-4 border-primary-container pb-1"
                    : "text-on-background hover:text-secondary"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Auth */}
      <div className="flex items-center gap-3">
        {ready && (
          authenticated ? (
            <div className="flex items-center gap-3">
              {/* User identity */}
              {displayName && (
                <span className="hidden sm:block font-headline font-bold text-xs text-on-background/50 uppercase tracking-widest max-w-[140px] truncate">
                  {displayName}
                </span>
              )}

              {/* Go to app */}
              <a
                href={APP_URL}
                className="flex items-center gap-2 font-headline font-bold uppercase text-sm transition-colors text-on-background/70 hover:text-primary"
              >
                <Avatar
                  src={avatarUrl}
                  name={profileName ?? displayName}
                  size="sm"
                  square
                />
                <span className="hidden sm:block">Mi cuenta</span>
              </a>

              {/* Logout */}
              <button
                onClick={logout}
                className="flex items-center gap-1 text-on-background/40 hover:text-error transition-colors font-headline font-bold uppercase text-xs"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                <span className="hidden sm:block">Salir</span>
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="bg-primary-container text-white px-6 py-2 font-headline font-black skew-fix hover:bg-secondary hover:neo-shadow-blue transition-all"
            >
              <span className="block skew-content">INGRESAR</span>
            </button>
          )
        )}
      </div>
    </header>
  );
}
