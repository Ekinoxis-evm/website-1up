"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MODULES = [
  { href: "/app",            icon: "account_balance_wallet", label: "Wallet"     },
  { href: "/app/identidad",  icon: "badge",                  label: "Identidad"  },
  { href: "/app/beneficios", icon: "handshake",              label: "Beneficios" },
  { href: "/app/pass",       icon: "card_membership",        label: "Pass"       },
  { href: "/app/academia",   icon: "school",                 label: "Academia"   },
  { href: "/app/settings",   icon: "manage_accounts",        label: "Ajustes"    },
];

export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-container border-t border-outline-variant/20 flex">
      {MODULES.map(({ href, icon, label }) => {
        const active = pathname === href || (href !== "/app" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
              active ? "text-primary" : "text-on-surface/40 hover:text-on-surface"
            }`}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {icon}
            </span>
            <span className="font-headline font-bold text-[9px] uppercase tracking-tight leading-none">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
