import type { FloorInfo } from "@/types/database.types";

interface Props { floors: FloorInfo[] }

const ACCENT_BG: Record<string, string> = {
  "primary-container":   "bg-primary-container text-white",
  "secondary-container": "bg-secondary-container text-white",
  "primary":             "bg-primary text-background",
  "tertiary":            "bg-tertiary text-background",
  "white":               "bg-white text-background",
};

const ACCENT_BORDER: Record<string, string> = {
  "primary-container":   "border-primary-container",
  "secondary-container": "border-secondary-container",
  "primary":             "border-primary",
  "tertiary":            "border-tertiary",
  "white":               "border-white",
};

export function FloorBreakdown({ floors }: Props) {
  return (
    <section className="py-20 px-8 md:px-16 bg-surface-container">
      <div className="mb-12">
        <h2 className="font-headline text-4xl font-black uppercase tracking-tighter">
          DISTRIBUCIÓN <span className="text-secondary">TOWER</span>
        </h2>
        <div className="h-2 w-24 bg-tertiary mt-2" />
      </div>

      <div className="space-y-4">
        {floors.map((floor) => {
          const badgeClass  = ACCENT_BG[floor.accent_color ?? "primary-container"]   ?? "bg-primary-container text-white";
          const borderClass = ACCENT_BORDER[floor.accent_color ?? "primary-container"] ?? "border-primary-container";

          return (
            <div
              key={floor.id}
              className="flex flex-col md:flex-row bg-surface-container-low group hover:bg-surface-container-high transition-colors overflow-hidden"
            >
              {/* Floor badge */}
              <div className={`${badgeClass} flex items-center justify-center min-w-[100px] py-8 px-6 font-headline font-black text-3xl skew-fix flex-shrink-0`}>
                <span className="block skew-content">{floor.floor_label}</span>
              </div>

              {/* Content */}
              <div className={`flex-1 p-8 border-l-0 md:border-l-4 ${borderClass}`}>
                <h3 className="font-headline font-black text-2xl mb-2 group-hover:text-secondary transition-colors">
                  {floor.title}
                </h3>
                <p className="font-body text-on-surface-variant leading-relaxed">{floor.description}</p>
              </div>

              {/* Floor image */}
              {floor.image_url && (
                <div className="w-full md:w-80 aspect-video md:aspect-auto overflow-hidden relative flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={floor.image_url}
                    alt={floor.title}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                  />
                  {/* Blend edge into content on desktop */}
                  <div className="absolute inset-0 bg-gradient-to-r from-surface-container-low/60 to-transparent pointer-events-none hidden md:block" />
                </div>
              )}
            </div>
          );
        })}

        {floors.length === 0 && (
          <p className="text-outline font-body text-center py-12">
            Los pisos se configuran desde el panel de administración.
          </p>
        )}
      </div>
    </section>
  );
}
