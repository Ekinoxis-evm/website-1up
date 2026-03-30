export const metadata = { title: "Recreativo — 1UP Gaming Tower" };

const BENEFITS = [
  { icon: "sports_esports", label: "Gaming Tower Pass",  value: "1 mes de acceso por usuario",           color: "border-primary-container"   },
  { icon: "computer",       label: "Equipos Completos",  value: "Uso total de todas las instalaciones",   color: "border-secondary-container" },
  { icon: "local_cafe",     label: "Cafetería Incluida", value: "$10.000 COP en consumibles por persona", color: "border-tertiary"            },
];

export default function RecreativoPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[60vh] flex flex-col justify-end px-6 md:px-24 py-16 overflow-hidden border-b-[12px] border-secondary-container">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-surface-container-lowest via-background to-surface-container" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-block bg-secondary-container px-4 py-1 mb-4 skew-fix">
            <span className="text-white font-black italic skew-content block text-sm tracking-widest font-headline">
              CORPORATIVO
            </span>
          </div>
          <h1 className="font-headline font-black text-5xl md:text-7xl leading-none tracking-tighter text-on-background">
            JORNADAS <span className="text-secondary italic">RECREATIVAS</span>
          </h1>
          <p className="font-body text-xl text-on-surface-variant mt-6 max-w-2xl border-l-4 border-secondary pl-6">
            Lleva a tu equipo de trabajo a la experiencia gaming más completa de Colombia.
            Equipos de última generación, cafetería y un ambiente diseñado para el máximo disfrute.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-6 md:px-24 bg-surface-container-lowest">
        <div className="mb-12">
          <h2 className="font-headline text-4xl font-black uppercase tracking-tighter">
            EL <span className="text-secondary">PAQUETE</span>
          </h2>
          <div className="h-2 w-24 bg-tertiary mt-2" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BENEFITS.map(({ icon, label, value, color }) => (
            <div key={label} className={`bg-surface-container p-10 border-l-8 ${color}`}>
              <span className="material-symbols-outlined text-4xl text-secondary-container mb-4 block">{icon}</span>
              <div className="font-headline font-black text-xl text-on-background uppercase mb-2">{label}</div>
              <div className="font-body text-on-surface-variant">{value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 md:px-24 bg-surface-container flex flex-col items-center text-center">
        <h2 className="font-headline font-black text-4xl md:text-5xl tracking-tighter mb-6 text-on-background">
          ¿LISTO PARA LA<br />
          <span className="text-primary-container italic">EXPERIENCIA?</span>
        </h2>
        <p className="font-body text-on-surface-variant text-lg mb-10 max-w-xl">
          Contáctanos para coordinar tu jornada recreativa personalizada. Nuestro equipo diseñará una experiencia a la medida de tu organización.
        </p>
        <a
          href="https://wa.me/57300000000?text=Hola%2C%20quiero%20solicitar%20una%20jornada%20recreativa%20en%201UP%20Gaming%20Tower"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-secondary-container text-white font-headline font-black text-xl px-12 py-5 skew-fix hover:neo-shadow-blue transition-all"
        >
          <span className="block skew-content">SOLICITAR JORNADA RECREATIVA</span>
        </a>
      </section>
    </>
  );
}
