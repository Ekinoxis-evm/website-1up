"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.1upesports.org";

const STATIC_TABS = [
  { href: "/",            icon: "home",         label: "HOME"    },
  { href: "/torneos",     icon: "emoji_events", label: "TORNEOS" },
  { href: "/academia",    icon: "school",       label: "ACADEMY" },
  { href: "/marketplace", icon: "storefront",   label: "STORE"   },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { authenticated } = usePrivy();

  const profileTab = {
    href:  authenticated ? APP_URL : `${APP_URL}/login`,
    icon:  "account_circle",
    label: "PERFIL",
  };

  const tabs = [...STATIC_TABS, profileTab];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t-4 border-primary-container z-50 flex justify-around p-2">
      {tabs.map(({ href, icon, label }) => {
        const isProfile = label === "PERFIL";
        const active = !isProfile && (pathname === href || (href !== "/" && pathname.startsWith(href)));
        return (
          <a
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 transition-colors ${
              active ? "text-primary" : isProfile && authenticated ? "text-secondary" : "text-on-surface/50"
            }`}
          >
            <span
              className="material-symbols-outlined text-xl"
              style={(active || (isProfile && authenticated)) ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {icon}
            </span>
            <span className="text-[9px] font-headline font-black">{label}</span>
          </a>
        );
      })}
    </nav>
  );
}
