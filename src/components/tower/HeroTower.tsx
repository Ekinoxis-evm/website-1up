export function HeroTower() {
  return (
    <section className="relative min-h-[60vh] flex flex-col justify-end px-8 md:px-16 py-16 overflow-hidden border-b-[12px] border-secondary-container">
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-gradient-to-br from-surface-container-lowest to-surface-container" />
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "linear-gradient(#0897ff 1px, transparent 1px), linear-gradient(90deg, #0897ff 1px, transparent 1px)", backgroundSize: "80px 80px" }} />
      </div>

      <div className="relative z-10">
        <div className="inline-block bg-secondary-container px-4 py-1 mb-4 skew-fix">
          <span className="text-white font-black italic skew-content block text-sm tracking-widest font-headline">
            BOGOTÁ, COLOMBIA
          </span>
        </div>
        <h1 className="font-headline font-black text-7xl md:text-9xl leading-none tracking-tighter text-on-background">
          GAMING<br />
          <span className="text-secondary text-glow-blue">TOWER</span>
        </h1>
        <p className="font-body text-xl text-on-surface-variant mt-6 max-w-xl border-l-4 border-secondary pl-6">
          6 pisos de infraestructura de élite. El monolito del e-sport colombiano.
        </p>
      </div>
    </section>
  );
}
