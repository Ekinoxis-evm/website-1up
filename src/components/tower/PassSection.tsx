import type { PassBenefit } from "@/types/database.types";

interface Props { benefits: PassBenefit[] }

export function PassSection({ benefits }: Props) {
  return (
    <section className="py-20 px-8 md:px-16 bg-surface-container-lowest relative overflow-hidden">
      {/* Decorative pink slab */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-primary-container opacity-10 skew-x-[-8deg] translate-x-16" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left: benefits */}
        <div>
          <div className="inline-block bg-primary px-4 py-1 mb-6 skew-fix">
            <span className="text-background font-black italic skew-content block text-sm tracking-widest font-headline">
              MEMBERSHIP
            </span>
          </div>
          <h2 className="font-headline font-black text-6xl leading-none tracking-tighter mb-8">
            1UP<br /><span className="text-primary-container">PASS</span>
          </h2>

          <div className="space-y-3 mb-10">
            {benefits.map((b) => (
              <div key={b.id} className="flex items-start gap-4 bg-surface-container p-4 border-l-4 border-primary-container">
                <span className="material-symbols-outlined text-primary-container mt-0.5">check_circle</span>
                <div>
                  <div className="font-headline font-bold text-on-background">{b.title}</div>
                  {b.description && (
                    <div className="font-body text-sm text-on-surface-variant mt-1">{b.description}</div>
                  )}
                </div>
              </div>
            ))}
            {benefits.length === 0 && (
              <p className="text-outline font-body text-sm">Los beneficios se configuran desde admin.</p>
            )}
          </div>

          <a
            href="#contact"
            className="inline-block bg-primary-container text-white font-headline font-black text-lg px-10 py-4 skew-fix hover:neo-shadow-pink transition-all"
          >
            <span className="block skew-content">OBTENER MI PASS</span>
          </a>
        </div>

        {/* Right: pass card visual */}
        <div className="flex justify-center">
          <div className="w-72 aspect-[5/7] bg-gradient-to-br from-primary-container to-secondary-container p-6 flex flex-col justify-between relative overflow-hidden neo-shadow-pink">
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            <div className="relative z-10">
              <div className="text-4xl font-headline font-black text-white italic">1UP</div>
              <div className="text-xs font-headline font-bold text-white/70 tracking-widest mt-1">GAMING TOWER PASS</div>
            </div>
            <div className="relative z-10">
              <div className="h-10 bg-white/20 mb-4" />
              <div className="text-white/60 font-body text-xs tracking-widest uppercase">Member Access Card</div>
              <div className="text-white font-headline font-black text-xl mt-1">COLOMBIA</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
