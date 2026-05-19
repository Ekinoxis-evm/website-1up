"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "https://admin.1upesports.org";

type NavItem = { href: string; icon: string; label: string };
type NavGroup = { label: string; icon: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    label: "Sitio Web",
    icon: "language",
    items: [
      { href: "/admin/games",       icon: "sports_esports", label: "Juegos"         },
      { href: "/admin/floors",      icon: "domain",         label: "Gaming Tower"   },
      { href: "/admin/aliados",     icon: "handshake",      label: "Aliados"        },
      { href: "/admin/site-images", icon: "image",          label: "Imágenes Sitio" },
      { href: "/admin/social-links",icon: "share",          label: "Redes"          },
    ],
  },
  {
    label: "Competiciones",
    icon: "emoji_events",
    items: [
      { href: "/admin/torneos",                  icon: "emoji_events",  label: "Torneos"          },
      { href: "/admin/tournament-registrations", icon: "how_to_reg",    label: "Inscripciones"    },
      { href: "/admin/tournament-brackets",      icon: "account_tree",  label: "Brackets"         },
      { href: "/admin/tournament-results",       icon: "leaderboard",   label: "Hall of Fame"     },
      { href: "/admin/torneos-internacionales",  icon: "public",        label: "Intl. Torneos"    },
      { href: "/admin/players",                  icon: "groups",        label: "Jugadores"        },
      { href: "/admin/competitions",             icon: "military_tech", label: "Competiciones"    },
    ],
  },
  {
    label: "Academia",
    icon: "school",
    items: [
      { href: "/admin/masters",     icon: "star",          label: "Masters"       },
      { href: "/admin/courses",     icon: "school",        label: "Cursos"        },
      { href: "/admin/enrollments", icon: "receipt_long",  label: "Inscripciones" },
      { href: "/admin/discounts",   icon: "local_offer",   label: "Descuentos"    },
    ],
  },
  {
    label: "1UP Pass & Tokens",
    icon: "token",
    items: [
      { href: "/admin/1pass",         icon: "card_membership",  label: "1UP Pass"       },
      { href: "/admin/pass-orders",   icon: "verified",         label: "Órdenes Pass"   },
      { href: "/admin/token-orders",  icon: "currency_exchange",label: "Órdenes $1UP"   },
      { href: "/admin/bank-accounts", icon: "account_balance",  label: "Cuentas Banco"  },
    ],
  },
  {
    label: "Sistema",
    icon: "settings",
    items: [
      { href: "/admin/privy-users",   icon: "manage_accounts",      label: "Usuarios"     },
      { href: "/admin/user-profiles", icon: "people",               label: "Perfiles App" },
      { href: "/admin/referral-codes",icon: "confirmation_number",  label: "Referidos"    },
      { href: "/admin/submissions",   icon: "inbox",                label: "Solicitudes"  },
      { href: "/admin/users",         icon: "admin_panel_settings", label: "Admins"       },
    ],
  },
];

function groupContainsPath(group: NavGroup, pathname: string) {
  return group.items.some(
    ({ href }) => pathname === href || (href !== "/admin" && pathname.startsWith(href))
  );
}

function NavGroupSection({ group, defaultOpen }: { group: NavGroup; defaultOpen: boolean }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(defaultOpen);
  const active = groupContainsPath(group, pathname);

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`w-full flex items-center justify-between px-3 py-2 font-headline font-black text-[10px] uppercase tracking-widest transition-colors ${
          active ? "text-primary" : "text-outline/60 hover:text-on-surface/70"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-sm"
            style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {group.icon}
          </span>
          {group.label}
        </div>
        <span className="material-symbols-outlined text-sm transition-transform duration-200" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
          expand_more
        </span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-0.5 mt-0.5">
          {group.items.map(({ href, icon, label }) => {
            const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 pl-8 pr-3 py-2.5 font-headline font-bold uppercase text-xs tracking-tight transition-all ${
                  isActive
                    ? "bg-primary-container/20 text-primary border-l-2 border-primary-container"
                    : "text-on-surface/60 hover:text-on-surface hover:bg-surface-container-high"
                }`}
              >
                <span
                  className="material-symbols-outlined text-sm"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {icon}
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { logout } = usePrivy();

  async function handleLogout() {
    await logout();
    window.location.href = `${ADMIN_URL}/login`;
  }

  useEffect(() => { setOpen(false); }, [pathname]);

  const navContent = (
    <>
      {/* Dashboard — always visible, not collapsible */}
      <div className="mb-2">
        <Link
          href="/admin"
          className={`flex items-center gap-3 px-3 py-3 font-headline font-bold uppercase text-xs tracking-tight transition-all ${
            pathname === "/admin"
              ? "bg-primary-container/20 text-primary border-l-2 border-primary-container"
              : "text-on-surface/60 hover:text-on-surface hover:bg-surface-container-high"
          }`}
        >
          <span
            className="material-symbols-outlined text-sm"
            style={pathname === "/admin" ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            dashboard
          </span>
          Dashboard
        </Link>
      </div>

      <nav className="flex flex-col gap-1">
        {GROUPS.map((group) => (
          <NavGroupSection
            key={group.label}
            group={group}
            defaultOpen={groupContainsPath(group, pathname)}
          />
        ))}
      </nav>

      <div className="mt-auto pt-6 px-2 flex flex-col gap-3">
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
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-surface-container flex items-center gap-3 px-4">
        <button
          onClick={() => setOpen(true)}
          className="p-2 text-on-surface/70 hover:text-on-surface transition-colors"
          aria-label="Abrir menú"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>
        <div className="font-headline font-black text-primary italic text-lg">1UP</div>
        <div className="font-body text-xs text-outline uppercase tracking-widest">Admin</div>
      </div>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — h-screen + overflow-y-auto so it scrolls */}
      <aside
        className={`flex flex-col w-64 md:w-56 h-screen bg-surface-container border-r border-outline-variant/20
          fixed left-0 top-0 z-50 py-8 px-4 overflow-y-auto transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-6 px-2">
          <div>
            <div className="font-headline font-black text-primary italic text-xl">1UP</div>
            <div className="font-body text-xs text-outline uppercase tracking-widest mt-1">Admin Panel</div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden p-1 text-outline hover:text-on-surface transition-colors"
            aria-label="Cerrar menú"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {navContent}
      </aside>
    </>
  );
}
