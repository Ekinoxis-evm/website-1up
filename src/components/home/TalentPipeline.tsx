import Link from "next/link";

const STAGES = [
  {
    title: "RECREATIVO",
    desc: "Espacio abierto para la comunidad. Juega, conecta y disfruta de equipos pro.",
    cta: "EXPLORAR", href: "/recreativo",
    border: "border-secondary", hover: "hover:bg-secondary-container", icon: "sports_esports",
    ctaColor: "text-secondary group-hover:text-white",
  },
  {
    title: "ACADEMIA",
    desc: "Entrenamiento técnico y táctico guiado por coaches certificados.",
    cta: "APRENDER", href: "/academia",
    border: "border-primary", hover: "hover:bg-primary-container", icon: "school",
    ctaColor: "text-primary group-hover:text-white",
  },
  {
    title: "TORNEOS",
    desc: "Competencias organizadas por 1UP. Demuestra tu nivel y gana premios.",
    cta: "COMPETIR", href: "/torneos",
    border: "border-white", hover: "hover:bg-white", icon: "emoji_events",
    ctaColor: "text-white group-hover:text-black",
    hoverText: "group-hover:text-black",
  },
];

export function TalentPipeline() {
  return (
    <section className="py-24 px-6 bg-surface-container-lowest">
      <div className="mb-16">
        <h2 className="font-headline text-5xl font-black uppercase tracking-tighter">
          Talent <span className="text-secondary">Pipeline</span>
        </h2>
        <div className="h-2 w-32 bg-tertiary mt-2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STAGES.map(({ title, desc, cta, href, border, hover, icon, ctaColor, hoverText }) => (
          <Link
            key={title}
            href={href}
            className={`bg-surface-container p-8 border-l-8 ${border} group ${hover} transition-all cursor-pointer`}
          >
            <h3 className={`font-headline text-2xl font-black mb-4 ${hoverText ?? "group-hover:text-white"} transition-colors`}>
              {title}
            </h3>
            <p className={`text-on-surface-variant mb-6 ${hoverText ? "group-hover:text-black/70" : "group-hover:text-white/80"} transition-colors font-body text-sm`}>
              {desc}
            </p>
            <span className={`font-headline font-bold flex items-center gap-2 ${ctaColor} transition-colors`}>
              {cta}
              <span className="material-symbols-outlined text-sm">{icon}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
