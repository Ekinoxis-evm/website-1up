"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.1upesports.org";

const MODULES = [
  { href: "/app",             icon: "account_balance_wallet", label: "Wallet"      },
  { href: "/app/identidad",   icon: "badge",                  label: "Identidad"   },
  { href: "/app/beneficios",  icon: "handshake",              label: "Beneficios"  },
  { href: "/app/pass",        icon: "card_membership",        label: "1UP Pass"    },
  { href: "/app/academia",    icon: "school",                 label: "Academia"    },
  { href: "/app/settings",    icon: "manage_accounts",        label: "Ajustes"     },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { logout } = usePrivy();

  async function handleLogout() {
    await logout();
    window.location.href = `${APP_URL}/login`;
  }

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-surface-container border-r border-outline-variant/20 fixed left-0 top-0 z-40 py-8 px-4">
      <div className="mb-8 px-2">
        <div className="font-headline font-black text-primary italic text-2xl">1UP</div>
        <div className="font-body text-xs text-outline uppercase tracking-widest mt-1">Mi Cuenta</div>
      </div>
      <nav className="flex flex-col gap-1">
        {MODULES.map(({ href, icon, label }) => {
          const active = pathname === href || (href !== "/app" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 font-headline font-bold uppercase text-xs tracking-tight transition-all ${
                active
                  ? "bg-primary-container/20 text-primary border-l-2 border-primary-container"
                  : "text-on-surface/70 hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              <span
                className="material-symbols-outlined text-sm"
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {icon}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-2 flex flex-col gap-3">
        <Link
          href={process.env.NEXT_PUBLIC_BASE_URL ?? "https://1upesports.org"}
          className="flex items-center gap-2 text-outline hover:text-secondary text-xs font-headline uppercase tracking-widest transition-colors"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Ver Sitio
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-error/50 hover:text-error text-xs font-headline uppercase tracking-widest transition-colors"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
