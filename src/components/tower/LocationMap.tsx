export function LocationMap() {
  return (
    <section className="py-20 px-8 md:px-16 bg-surface-container-low">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-8 border-outline-variant/20">
        {/* Map placeholder */}
        <div className="md:col-span-2 min-h-[300px] bg-surface-container flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: "linear-gradient(#0897ff 1px, transparent 1px), linear-gradient(90deg, #0897ff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="text-center relative z-10">
            <span className="material-symbols-outlined text-[5rem] text-secondary-container/50">location_on</span>
            <p className="font-headline font-bold text-outline mt-4 tracking-widest text-sm uppercase">
              Mapa próximamente
            </p>
            <p className="font-body text-xs text-outline/60 mt-2">Bogotá, Colombia</p>
          </div>
        </div>

        {/* Address + CTA */}
        <div className="p-8 bg-surface-container-lowest flex flex-col justify-between border-l-4 border-secondary-container">
          <div>
            <h3 className="font-headline font-black text-2xl mb-6 text-on-background uppercase tracking-tight">
              ENCUÉNTRANOS
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-secondary-container">location_on</span>
                <div>
                  <div className="font-headline font-bold text-on-background text-sm">DIRECCIÓN</div>
                  <div className="font-body text-on-surface-variant text-sm mt-1">Por confirmar — Bogotá, Colombia</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-secondary-container">schedule</span>
                <div>
                  <div className="font-headline font-bold text-on-background text-sm">HORARIOS</div>
                  <div className="font-body text-on-surface-variant text-sm mt-1">Lun–Vie: 10am–10pm<br />Sáb–Dom: 9am–11pm</div>
                </div>
              </div>
            </div>
          </div>
          <a
            href="https://maps.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-secondary-container text-white font-headline font-black text-sm px-6 py-3 mt-6 skew-fix hover:neo-shadow-blue transition-all"
          >
            <span className="block skew-content">GET DIRECTIONS</span>
          </a>
        </div>
      </div>
    </section>
  );
}
