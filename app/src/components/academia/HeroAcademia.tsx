export function HeroAcademia() {
  return (
    <section className="relative min-h-[60vh] flex flex-col justify-end px-8 md:px-16 py-16 overflow-hidden border-b-[12px] border-tertiary">
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-surface-container-lowest via-background to-surface-container" />

      <div className="relative z-10 max-w-3xl">
        <div className="inline-block bg-tertiary px-4 py-1 mb-4 skew-fix">
          <span className="text-background font-black italic skew-content block text-sm tracking-widest font-headline">
            PRO-COACHING
          </span>
        </div>
        <h1 className="font-headline font-black text-5xl md:text-7xl leading-none tracking-tighter text-on-background">
          NUESTROS ENTRENADORES SON JUGADORES Y{" "}
          <span className="text-tertiary italic">PROFESIONALES DE ÉLITE.</span>
        </h1>
        <p className="font-body text-xl text-secondary mt-6 max-w-2xl border-l-4 border-tertiary pl-6">
          Domina el meta, desarrolla la mentalidad competitiva y forja tu carrera profesional con expertos de la industria gaming.
        </p>
      </div>
    </section>
  );
}
