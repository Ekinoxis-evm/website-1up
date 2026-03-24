"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

const NAV_LINKS = [
  { href: "/",             label: "Home"      },
  { href: "/gaming-tower", label: "Tower"     },
  { href: "/team",         label: "Team"      },
  { href: "/academia",     label: "Academia"  },
  { href: "/recreativo",   label: "Recreativo"},
];

export function TopAppBar() {
  const pathname = usePathname();
  const { login, logout, authenticated, ready } = usePrivy();

  return (
    <header className="flex justify-between items-center w-full px-6 py-4 sticky top-0 z-50 glass-panel border-b border-outline-variant/20">
      {/* Logo + Nav */}
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/1up.png" alt="1UP Gaming Tower" width={40} height={40} className="object-contain" />
          <span className="text-2xl font-black text-primary italic tracking-tighter font-headline hidden sm:block">
            1UP
          </span>
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
            <button
              onClick={logout}
              className="flex items-center gap-2 text-primary hover:text-primary-container transition-colors font-headline font-bold uppercase text-sm"
            >
              <span className="material-symbols-outlined text-xl">person</span>
              <span className="hidden sm:block">Exit</span>
            </button>
          ) : (
            <button
              onClick={login}
              className="bg-primary-container text-white px-6 py-2 font-headline font-black skew-fix hover:bg-primary hover:neo-shadow-pink transition-all active:scale-95"
            >
              <span className="block skew-content">JOIN NOW</span>
            </button>
          )
        )}
      </div>
    </header>
  );
}
