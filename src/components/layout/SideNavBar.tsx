"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/",             icon: "home",          label: "Home"       },
  { href: "/gaming-tower", icon: "domain",        label: "Gaming Tower"},
  { href: "/team",         icon: "groups",        label: "Team 1UP"   },
  { href: "/academia",     icon: "school",        label: "Academia"   },
  { href: "/recreativo",   icon: "sports_esports",label: "Recreativo" },
];

export function SideNavBar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-surface-container-lowest border-r-4 border-outline-variant/30 fixed left-0 top-0 z-40 pt-20 pb-8 px-4">
      <Link href="/" className="flex items-center gap-2 mb-10 px-2">
        <Image src="/1up.png" alt="1UP" width={32} height={32} className="object-contain" />
        <span className="font-headline font-black text-primary italic">1UP</span>
      </Link>

      <nav className="flex flex-col gap-1">
        {ITEMS.map(({ href, icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 font-headline font-bold uppercase text-sm tracking-tight transition-all ${
                active
                  ? "bg-primary-container text-white skew-fix"
                  : "text-on-surface/60 hover:text-on-surface hover:bg-surface-container"
              }`}
            >
              {active && <span className="block skew-content flex items-center gap-3 w-full">
                <span className="material-symbols-outlined text-base">{icon}</span>
                {label}
              </span>}
              {!active && <>
                <span className="material-symbols-outlined text-base">{icon}</span>
                {label}
              </>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2">
        <Link
          href="/admin"
          className="flex items-center gap-2 text-outline hover:text-secondary text-xs font-headline uppercase tracking-widest transition-colors"
        >
          <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
          Admin
        </Link>
      </div>
    </aside>
  );
}
