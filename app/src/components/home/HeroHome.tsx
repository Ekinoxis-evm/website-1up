import Link from "next/link";

export function HeroHome() {
  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center px-6 md:px-24 overflow-hidden border-b-[16px] border-primary-container">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-gradient-to-br from-surface-container-lowest via-background to-surface-container opacity-80" />
        {/* Decorative grid lines */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "linear-gradient(#ffb2bf 1px, transparent 1px), linear-gradient(90deg, #ffb2bf 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      <div className="relative z-10 max-w-4xl">
        {/* Badge */}
        <div className="inline-block bg-secondary-container px-4 py-1 mb-6 skew-fix">
          <span className="text-white font-black italic skew-content block text-sm tracking-widest font-headline">
            COLOMBIA E-SPORTS HUB
          </span>
        </div>

        <h1 className="font-headline font-black text-6xl md:text-8xl leading-none tracking-tighter mb-8 text-on-background">
          EL PRIMER ESPACIO{" "}
          <span className="text-primary italic text-glow-pink">EQUIPADO</span>{" "}
          PARA PRO-PLAYERS
        </h1>

        <p className="font-body text-xl md:text-2xl text-secondary max-w-2xl mb-12 border-l-4 border-primary pl-6">
          El primer espacio equipado en Colombia para jugadores profesionales de e-sport.
          Infraestructura de élite para el máximo rendimiento.
        </p>

        <div className="flex flex-wrap gap-6">
          <Link
            href="/gaming-tower"
            className="inline-block bg-primary-container text-white text-xl font-black px-10 py-5 skew-fix hover:neo-shadow-blue transition-all font-headline"
          >
            <span className="block skew-content">CONOCE LA TORRE</span>
          </Link>
          <Link
            href="/team"
            className="inline-block border-2 border-primary text-primary text-xl font-black px-10 py-5 skew-fix hover:bg-primary hover:text-background transition-all font-headline"
          >
            <span className="block skew-content">VER EQUIPO</span>
          </Link>
        </div>
      </div>

      {/* Decorative right accent */}
      <div className="absolute right-0 top-0 w-2 h-full bg-gradient-to-b from-primary-container via-secondary-container to-tertiary opacity-60" />
    </section>
  );
}
