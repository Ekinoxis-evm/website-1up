export function MarketplaceSection() {
  return (
    <section id="marketplace" className="py-24 px-8 md:px-16 bg-surface-container">
      <div className="max-w-4xl">
        <div className="inline-block bg-secondary px-4 py-1 mb-6 skew-fix">
          <span className="text-background font-black italic skew-content block text-sm tracking-widest font-headline">
            PRÓXIMAMENTE
          </span>
        </div>

        <h2 className="font-headline font-black text-5xl md:text-7xl uppercase tracking-tighter leading-none mb-4">
          MARKET<span className="text-secondary">PLACE</span>
        </h2>
        <div className="h-1 w-24 bg-secondary mb-8" />

        <p className="font-body text-on-surface/60 text-lg max-w-xl mb-12">
          Compra y vende equipos, periféricos y accesorios gaming directamente en el ecosistema 1UP.
          Pagos con $1UP tokens, envíos a todo Colombia.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: "headphones",        label: "Periféricos"   },
            { icon: "computer",          label: "Equipos"       },
            { icon: "sports_esports",    label: "Accesorios"    },
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
              <span className="font-headline font-black text-xl uppercase tracking-tight text-on-surface/50">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
