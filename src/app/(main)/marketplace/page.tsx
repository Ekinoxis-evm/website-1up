export const metadata = { title: "Marketplace — 1UP Gaming Tower" };

export default function MarketplacePage() {
  return (
    <>
      {/* Hero */}
      <section className="min-h-[70vh] flex flex-col justify-center px-8 md:px-16 py-24 bg-background">
        <div className="max-w-4xl">
          <div className="inline-block bg-primary-container px-4 py-1 mb-6 skew-fix">
            <span className="text-white font-black italic skew-content block text-sm tracking-widest font-headline">
              PRÓXIMAMENTE
            </span>
          </div>

          <h1 className="font-headline font-black text-6xl md:text-9xl uppercase tracking-tighter leading-none mb-4">
            MARKET<span className="text-primary-container">PLACE</span>
          </h1>
          <div className="h-1 w-24 bg-primary-container mb-10" />

          <p className="font-body text-on-surface/60 text-xl max-w-xl mb-12">
            Compra y vende merchandise, periféricos, coleccionables y más dentro del ecosistema 1UP.
            Pagos con $1UP tokens.
          </p>

          {/* Feature teaser grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
            {[
              { icon: "checkroom",        label: "Merchandise oficial" },
              { icon: "sports_esports",   label: "Periféricos gaming"  },
              { icon: "token",            label: "Paga con $1UP"       },
            ].map(({ icon, label }) => (
              <div key={label} className="bg-surface-container p-5 flex items-center gap-3">
                <span
                  className="material-symbols-outlined text-primary-container text-2xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {icon}
                </span>
                <span className="font-headline font-bold text-sm uppercase tracking-tight text-on-surface/80">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Notify strip */}
      <section className="bg-primary-container px-8 md:px-16 py-12">
        <div className="max-w-4xl flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex-1">
            <p className="font-headline font-black text-white text-2xl uppercase tracking-tighter">
              Sé el primero en saber cuándo abre
            </p>
            <p className="font-body text-white/70 text-sm mt-1">
              Síguenos en redes sociales para el anuncio oficial de apertura.
            </p>
          </div>
          <a
            href="https://www.instagram.com/1upgamingtower/"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 bg-white text-primary-container font-headline font-black text-sm py-3 px-8 uppercase tracking-tight hover:bg-white/90 transition-colors"
          >
            SEGUIR @1UPGAMINGTOWER
          </a>
        </div>
      </section>
    </>
  );
}
