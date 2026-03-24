import type { FloorInfo } from "@/db/schema";

interface Props { floors: FloorInfo[] }

const ACCENT_BG: Record<string, string> = {
  "primary-container":    "bg-primary-container text-white",
  "secondary-container":  "bg-secondary-container text-white",
  "primary":              "bg-primary text-background",
  "tertiary":             "bg-tertiary text-background",
  "white":                "bg-white text-background",
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
          const badgeClass = ACCENT_BG[floor.accentColor ?? "primary-container"] ?? "bg-primary-container text-white";
          return (
            <div key={floor.id} className="flex flex-col md:flex-row gap-0 bg-surface-container-low group hover:bg-surface-container-high transition-colors">
              {/* Floor badge */}
              <div className={`${badgeClass} flex items-center justify-center min-w-[100px] py-8 px-6 font-headline font-black text-3xl skew-fix`}>
                <span className="block skew-content">{floor.floorLabel}</span>
              </div>
              {/* Content */}
              <div className="flex-1 p-8 border-l-0 md:border-l-4 border-outline-variant/20">
                <h3 className="font-headline font-black text-2xl mb-2 group-hover:text-secondary transition-colors">
                  {floor.title}
                </h3>
                <p className="font-body text-on-surface-variant">{floor.description}</p>
              </div>
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
