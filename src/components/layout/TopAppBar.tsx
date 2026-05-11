"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

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
  const { logout, authenticated, ready, login, user } = usePrivy();

  const displayName =
    user?.google?.name ??
    user?.email?.address ??
    user?.linkedAccounts?.[0]?.type ?? null;

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
                className="flex items-center gap-1.5 font-headline font-bold uppercase text-sm transition-colors text-on-background/70 hover:text-primary"
              >
                <span
                  className="material-symbols-outlined text-xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  account_circle
                </span>
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
