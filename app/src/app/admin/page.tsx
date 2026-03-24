import { db } from "@/db";
import { games, players, courses, recruitmentSubmissions } from "@/db/schema";
import { sql } from "drizzle-orm";
import Link from "next/link";

const CARDS = [
  { href: "/admin/games",        icon: "sports_esports",  label: "Juegos",      color: "border-primary-container"   },
  { href: "/admin/players",      icon: "groups",          label: "Jugadores",   color: "border-secondary-container" },
  { href: "/admin/courses",      icon: "school",          label: "Cursos",      color: "border-tertiary"            },
  { href: "/admin/submissions",  icon: "inbox",           label: "Solicitudes", color: "border-white"               },
];

export default async function AdminDashboard() {
  const [gamesCount, playersCount, coursesCount, submissionsCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(games),
    db.select({ count: sql<number>`count(*)` }).from(players),
    db.select({ count: sql<number>`count(*)` }).from(courses),
    db.select({ count: sql<number>`count(*)` }).from(recruitmentSubmissions),
  ]).catch(() => [[{ count: 0 }], [{ count: 0 }], [{ count: 0 }], [{ count: 0 }]]);

  const counts = [
    Number(gamesCount[0]?.count ?? 0),
    Number(playersCount[0]?.count ?? 0),
    Number(coursesCount[0]?.count ?? 0),
    Number(submissionsCount[0]?.count ?? 0),
  ];

  return (
    <div>
      <div className="mb-10">
        <h1 className="font-headline font-black text-4xl text-on-background uppercase tracking-tighter">
          ADMIN <span className="text-primary-container">DASHBOARD</span>
        </h1>
        <div className="h-1 w-20 bg-primary-container mt-2" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {CARDS.map(({ href, icon, label, color }, i) => (
          <Link key={href} href={href} className={`bg-surface-container p-6 border-l-4 ${color} hover:bg-surface-container-high transition-colors`}>
            <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-3 block">{icon}</span>
            <div className="font-headline font-black text-4xl text-on-background">{counts[i]}</div>
            <div className="font-headline font-bold text-xs text-outline uppercase tracking-widest mt-1">{label}</div>
          </Link>
        ))}
      </div>

      <div className="bg-surface-container p-6 border-l-4 border-tertiary">
        <h2 className="font-headline font-black text-sm uppercase tracking-widest text-on-background mb-4">ACCESOS RÁPIDOS</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { href: "/admin/players",       label: "+ Jugador"       },
            { href: "/admin/courses",        label: "+ Curso"         },
            { href: "/admin/competitions",   label: "+ Competición"   },
            { href: "/admin/games",          label: "+ Juego"         },
            { href: "/admin/pass-benefits",  label: "+ Beneficio Pass"},
            { href: "/admin/floors",         label: "+ Piso"          },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="bg-surface-container-high text-on-surface-variant font-headline font-bold text-xs px-4 py-2 hover:bg-primary-container hover:text-white transition-colors uppercase tracking-wider"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
