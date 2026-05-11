import Link from "next/link";

export function AcademiaSection() {
  return (
    <section id="academia" className="py-24 px-8 md:px-16 bg-surface-container-lowest">
      <div className="max-w-4xl">
        <div className="inline-block bg-primary-container px-4 py-1 mb-6 skew-fix">
          <span className="text-white font-black italic skew-content block text-sm tracking-widest font-headline">
            FORMACIÓN PROFESIONAL
          </span>
        </div>

        <h2 className="font-headline font-black text-5xl md:text-7xl uppercase tracking-tighter leading-none mb-4">
          ACADE<span className="text-primary">MIA</span>
        </h2>
        <div className="h-1 w-24 bg-primary-container mb-8" />

        <p className="font-body text-on-surface/60 text-lg max-w-xl mb-12">
          Cursos de esports impartidos por coaches certificados. Mejora tu mecánica, estrategia
          y mentalidad competitiva con el respaldo de 1UP.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[
            { icon: "school",                label: "Cursos técnicos"     },
            { icon: "psychology",            label: "Mentalidad pro"      },
            { icon: "workspace_premium",     label: "Coaches certificados" },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="bg-surface-container p-6 border-l-4 border-primary-container/40 flex items-center gap-4"
            >
              <span
                className="material-symbols-outlined text-primary text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {icon}
              </span>
              <span className="font-headline font-black text-base uppercase tracking-tight text-on-surface/70">
                {label}
              </span>
            </div>
          ))}
        </div>

        <Link
          href="/academia"
          className="inline-block bg-primary-container text-white font-headline font-black skew-fix hover:neo-shadow-pink transition-all text-sm px-8 py-3"
        >
          <span className="block skew-content">VER CURSOS →</span>
        </Link>
      </div>
    </section>
  );
}
