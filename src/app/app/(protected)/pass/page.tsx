export const metadata = { title: "1UP Pass — 1UP App" };

export default function AppPassPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline font-black text-5xl md:text-7xl text-on-surface leading-none tracking-tighter">
          TU <span className="text-primary">1UP PASS</span>
        </h1>
        <div className="h-1 w-16 bg-secondary-container mt-3" />
      </div>

      <div className="bg-surface-container-low border-l-8 border-primary-container p-12 flex flex-col items-center justify-center gap-6 text-center shadow-[12px_12px_0px_rgba(0,0,0,0.35)]">
        <span
          className="material-symbols-outlined text-primary-container text-6xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          card_membership
        </span>
        <div>
          <h2 className="font-headline font-black text-3xl text-on-surface uppercase tracking-tighter mb-2">
            No tienes un 1UP Pass
          </h2>
          <p className="font-body text-on-surface/50 max-w-md">
            El 1UP Pass te da acceso a beneficios exclusivos del Gaming Tower,
            descuentos en cursos y torneos privados.
          </p>
        </div>
        <div className="relative">
          <button
            disabled
            className="bg-primary-container/25 text-white/25 px-12 py-4 font-headline font-black text-xl uppercase tracking-tighter cursor-not-allowed"
          >
            OBTENER 1UP PASS
          </button>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="bg-surface-container border border-tertiary/50 text-tertiary font-headline text-xs uppercase tracking-widest px-5 py-1.5">
              PRÓXIMAMENTE
            </span>
          </div>
        </div>
      </div>

      <div className="bg-surface-container p-6">
        <h3 className="font-headline font-bold text-lg uppercase tracking-wider mb-6 text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">stars</span>
          Beneficios del Pass
        </h3>
        <p className="text-on-surface/40 font-headline text-xs uppercase tracking-widest">
          Los beneficios se cargarán desde el panel de administración.
        </p>
      </div>
    </div>
  );
}
