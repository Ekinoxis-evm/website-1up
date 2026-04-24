export function LocationMap() {
  return (
    <section className="py-20 px-8 md:px-16 bg-surface-container-low">
      <div className="mb-10">
        <h2 className="font-headline font-black text-4xl uppercase tracking-tighter text-on-background">
          ENCUÉNTRANOS
        </h2>
        <div className="h-1 w-20 bg-secondary-container mt-2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-4 border-outline-variant/20">
        {/* Map */}
        <div className="md:col-span-2 min-h-[360px] md:min-h-[440px] relative overflow-hidden">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d248.91636504142002!2d-76.54186769065491!3d3.4322248266472863!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e30a69b6da45d6d%3A0x2dd11c4e825ff1f7!2sCra.%2034%20%23%205A-19%2C%203%20de%20Julio%2C%20Cali%2C%20Valle%20del%20Cauca!5e0!3m2!1sen!2sco!4v1776995954509!5m2!1sen!2sco"
            className="absolute inset-0 w-full h-full"
            style={{ border: 0, filter: "grayscale(20%) contrast(1.05)" }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="1UP Gaming Tower — Ubicación"
          />
        </div>

        {/* Address info */}
        <div className="p-8 bg-surface-container-lowest flex flex-col justify-between border-l-4 border-secondary-container">
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary-container mt-0.5">location_on</span>
              <div>
                <div className="font-headline font-bold text-on-background text-xs uppercase tracking-widest mb-1">DIRECCIÓN</div>
                <div className="font-body text-on-surface-variant text-sm leading-relaxed">
                  Cra. 34 # 5A-19<br />
                  Barrio 3 de Julio<br />
                  Cali, Valle del Cauca
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary-container mt-0.5">stadium</span>
              <div>
                <div className="font-headline font-bold text-on-background text-xs uppercase tracking-widest mb-1">REFERENCIA</div>
                <div className="font-body text-on-surface-variant text-sm">
                  Junto al Estadio Pascual Guerrero
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary-container mt-0.5">schedule</span>
              <div>
                <div className="font-headline font-bold text-on-background text-xs uppercase tracking-widest mb-1">HORARIOS</div>
                <div className="font-body text-on-surface-variant text-sm">
                  Lun–Vie: 10am – 10pm<br />
                  Sáb–Dom: 9am – 11pm
                </div>
              </div>
            </div>
          </div>

          <a
            href="https://www.google.com/maps/dir/?api=1&destination=3.4322248266472863,-76.54186769065491"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-secondary-container text-white font-headline font-black text-sm px-6 py-3 mt-8 skew-fix hover:neo-shadow-blue transition-all"
          >
            <span className="block skew-content">GET DIRECTIONS</span>
          </a>
        </div>
      </div>
    </section>
  );
}
