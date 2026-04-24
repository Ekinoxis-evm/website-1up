const STEPS = [
  { num: "01", label: "FUNDAMENTOS",  desc: "Bases técnicas, mecánicas del juego y entrenamiento mental.",  color: "bg-secondary-container" },
  { num: "02", label: "EJECUCIÓN",    desc: "Práctica en sets, análisis VOD con coaches certificados.",     color: "bg-primary-container"   },
  { num: "03", label: "MAESTRÍA",     desc: "Circuito competitivo, torneos y representación internacional.", color: "bg-tertiary"            },
];

interface Props { imageUrl?: string | null; updatedAt?: string | null }

export function LearningPath({ imageUrl, updatedAt }: Props) {
  const src = imageUrl
    ? `${imageUrl}?t=${updatedAt ? new Date(updatedAt).getTime() : 0}`
    : null;
  return (
    <section className="py-20 px-8 md:px-16 bg-surface-container-low">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left: steps */}
        <div>
          <div className="mb-10">
            <h2 className="font-headline text-4xl font-black uppercase tracking-tighter">
              ESTRUCTURA DE <span className="text-primary-container">APRENDIZAJE</span>
            </h2>
            <div className="h-2 w-24 bg-tertiary mt-2" />
          </div>
          <p className="font-body text-on-surface-variant mb-10">
            No es solo jugar; al entrenarte en 1UP aprendes la arquitectura del éxito. Nuestros coaches usan métodos probados para desarrollar talento a cualquier nivel.
          </p>

          <div className="space-y-4">
            {STEPS.map(({ num, label, desc, color }) => (
              <div key={num} className="flex gap-0 group">
                <div className={`${color} text-background font-headline font-black text-2xl min-w-[64px] flex items-center justify-center skew-fix group-hover:scale-105 transition-transform`}>
                  <span className="block skew-content">{num}</span>
                </div>
                <div className="bg-surface-container flex-1 p-5 border-l-0">
                  <div className="font-headline font-black text-sm uppercase tracking-widest text-on-background">{label}</div>
                  <div className="font-body text-sm text-on-surface-variant mt-1">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: image */}
        {src ? (
          <div className="aspect-square overflow-hidden relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Estructura de aprendizaje"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-square bg-surface-container flex items-center justify-center border-4 border-outline-variant/20 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5"
              style={{ backgroundImage: "linear-gradient(#abd600 1px, transparent 1px), linear-gradient(90deg, #abd600 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            <span className="material-symbols-outlined text-[8rem] text-tertiary/30 relative z-10">emoji_events</span>
          </div>
        )}
      </div>
    </section>
  );
}
