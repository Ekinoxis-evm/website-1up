"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

const PUBLIC_TABS = [
  { href: "/",             icon: "home",   label: "HOME"     },
  { href: "/gaming-tower", icon: "domain", label: "TOWER"    },
  { href: "/team",         icon: "groups", label: "TEAM"     },
  { href: "/academia",     icon: "school", label: "ACADEMIA" },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { authenticated } = usePrivy();

  const tabs = authenticated
    ? [...PUBLIC_TABS, { href: "/perfil", icon: "account_circle", label: "PERFIL" }]
    : PUBLIC_TABS;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t-4 border-primary-container z-50 flex justify-around p-2">
      {tabs.map(({ href, icon, label }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 transition-colors ${
              active ? "text-primary" : "text-on-surface/50"
            }`}
          >
            <span
              className="material-symbols-outlined text-xl"
              style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {icon}
            </span>
            <span className="text-[9px] font-headline font-black">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
