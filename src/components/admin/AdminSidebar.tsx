"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS = [
  {
    label: "Sitio Web",
    items: [
      { href: "/admin",              icon: "dashboard",       label: "Dashboard"     },
      { href: "/admin/games",        icon: "sports_esports",  label: "Juegos"        },
      { href: "/admin/floors",       icon: "domain",          label: "Gaming Tower"  },
      { href: "/admin/players",      icon: "groups",          label: "Jugadores"     },
      { href: "/admin/competitions", icon: "emoji_events",    label: "Competiciones" },
      { href: "/admin/masters",      icon: "star",            label: "Masters"       },
      { href: "/admin/site-images",  icon: "image",           label: "Imágenes Sitio" },
    ],
  },
  {
    label: "Academia & App",
    items: [
      { href: "/admin/courses",          icon: "school",          label: "Cursos"        },
      { href: "/admin/academia-content", icon: "play_circle",     label: "Contenido"     },
      { href: "/admin/1pass",            icon: "card_membership", label: "1UP Pass"      },
      { href: "/admin/pass-benefits",    icon: "checklist",       label: "Pass Benefits" },
      { href: "/admin/discounts",        icon: "local_offer",     label: "Descuentos"    },
      { href: "/admin/enrollments",      icon: "receipt_long",    label: "Inscripciones" },
    ],
  },
  {
    label: "Tokens $1UP",
    items: [
      { href: "/admin/token-orders",  icon: "currency_exchange", label: "Órdenes 1UP"   },
      { href: "/admin/bank-accounts", icon: "account_balance",   label: "Cuentas Banco" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/privy-users",    icon: "manage_accounts",       label: "Usuarios"    },
      { href: "/admin/user-profiles",  icon: "people",                label: "Perfiles App" },
      { href: "/admin/social-links",   icon: "share",                 label: "Redes"       },
      { href: "/admin/aliados",        icon: "handshake",             label: "Aliados"     },
      { href: "/admin/submissions",    icon: "inbox",                 label: "Solicitudes" },
      { href: "/admin/users",          icon: "admin_panel_settings",  label: "Admins"      },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-surface-container border-r border-outline-variant/20 fixed left-0 top-0 z-40 py-8 px-4 overflow-y-auto">
      <div className="mb-8 px-2">
        <div className="font-headline font-black text-primary italic text-xl">1UP</div>
        <div className="font-body text-xs text-outline uppercase tracking-widest mt-1">Admin Panel</div>
      </div>

      <nav className="flex flex-col gap-6">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="font-headline font-black text-[10px] uppercase tracking-widest text-outline/50 px-2 mb-1">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map(({ href, icon, label }) => {
                const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2.5 font-headline font-bold uppercase text-xs tracking-tight transition-all ${
                      active
                        ? "bg-primary-container/20 text-primary border-l-2 border-primary-container"
                        : "text-on-surface/60 hover:text-on-surface hover:bg-surface-container-high"
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
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto pt-6 px-2">
        <Link
          href={process.env.NEXT_PUBLIC_BASE_URL ?? "https://1upesports.org"}
          className="flex items-center gap-2 text-outline hover:text-secondary text-xs font-headline uppercase tracking-widest transition-colors"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Ver Sitio
        </Link>
      </div>
    </aside>
  );
}
