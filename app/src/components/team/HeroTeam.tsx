export function HeroTeam() {
  return (
    <section className="relative min-h-[60vh] flex flex-col justify-end px-8 md:px-16 py-16 overflow-hidden border-b-[12px] border-primary-container">
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-surface-container-lowest via-background to-surface-container" />
      <div className="absolute top-0 right-0 w-px h-full bg-primary-container opacity-60" />

      <div className="relative z-10 max-w-3xl">
        <div className="inline-block bg-primary-container px-4 py-1 mb-4 skew-fix">
          <span className="text-white font-black italic skew-content block text-sm tracking-widest font-headline">
            ELITE ROSTER
          </span>
        </div>
        <h1 className="font-headline font-black text-5xl md:text-7xl leading-none tracking-tighter text-on-background">
          NUESTRO EQUIPO ESTÁ COMPUESTO POR{" "}
          <span className="text-primary italic text-glow-pink">ESPECIALISTAS</span>{" "}
          DE TALLA MUNDIAL.
        </h1>
      </div>
    </section>
  );
}
