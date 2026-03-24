import Link from "next/link";

const MODULES = [
  { href: "/admin",              icon: "dashboard",           label: "Dashboard"      },
  { href: "/admin/games",        icon: "sports_esports",      label: "Juegos"         },
  { href: "/admin/players",      icon: "groups",              label: "Jugadores"      },
  { href: "/admin/competitions", icon: "emoji_events",        label: "Competiciones"  },
  { href: "/admin/courses",      icon: "school",              label: "Cursos"         },
  { href: "/admin/pass-benefits",icon: "card_membership",     label: "Pass Benefits"  },
  { href: "/admin/floors",       icon: "domain",              label: "Pisos"          },
  { href: "/admin/submissions",  icon: "inbox",               label: "Solicitudes"    },
];

export function AdminSidebar() {
  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-surface-container border-r border-outline-variant/20 fixed left-0 top-0 z-40 py-8 px-4">
      <div className="mb-8 px-2">
        <div className="font-headline font-black text-primary italic text-xl">1UP</div>
        <div className="font-body text-xs text-outline uppercase tracking-widest mt-1">Admin Panel</div>
      </div>
      <nav className="flex flex-col gap-1">
        {MODULES.map(({ href, icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-4 py-3 font-headline font-bold uppercase text-xs tracking-tight text-on-surface/70 hover:text-on-surface hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined text-sm">{icon}</span>
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto px-2">
        <Link href="/" className="flex items-center gap-2 text-outline hover:text-secondary text-xs font-headline uppercase tracking-widest transition-colors">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Ver Sitio
        </Link>
      </div>
    </aside>
  );
}
