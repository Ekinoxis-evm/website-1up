import Link from "next/link";

export function TorneosSection() {
  return (
    <section id="torneos" className="py-24 px-8 md:px-16 bg-surface-container">
      <div className="max-w-4xl">
        <div className="inline-block bg-secondary px-4 py-1 mb-6 skew-fix">
          <span className="text-background font-black italic skew-content block text-sm tracking-widest font-headline">
            COMPETENCIAS OFICIALES
          </span>
        </div>

        <h2 className="font-headline font-black text-5xl md:text-7xl uppercase tracking-tighter leading-none mb-4">
          TOR<span className="text-secondary">NEOS</span>
        </h2>
        <div className="h-1 w-24 bg-secondary mb-8" />

        <p className="font-body text-on-surface/60 text-lg max-w-xl mb-12">
          Competencias organizadas por 1UP con premios en tokens $1UP. Inscríbete, demuestra tu
          nivel y escala el leaderboard.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[
            { icon: "emoji_events",   label: "Premios en $1UP"   },
            { icon: "token",          label: "Recompensas token"  },
            { icon: "leaderboard",    label: "Ranking oficial"    },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="bg-surface-container-low p-6 border-l-4 border-secondary/30 flex items-center gap-4"
            >
              <span
                className="material-symbols-outlined text-secondary text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {icon}
              </span>
              <span className="font-headline font-black text-base uppercase tracking-tight text-on-surface/50">
                {label}
              </span>
            </div>
          ))}
        </div>

        <Link
          href="/torneos"
          className="inline-block bg-secondary text-background font-headline font-black skew-fix hover:neo-shadow-blue transition-all text-sm px-8 py-3"
        >
          <span className="block skew-content">VER TORNEOS →</span>
        </Link>
      </div>
    </section>
  );
}
