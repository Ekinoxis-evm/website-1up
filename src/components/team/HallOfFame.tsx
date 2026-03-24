import type { Competition } from "@/types/database.types";

interface Props { competitions: Competition[] }

const RESULT_STYLE: Record<string, string> = {
  CHAMPIONS:    "bg-tertiary text-background",
  "TOP 4":      "bg-primary-container text-white",
  "TOP 8 GLOBAL": "bg-secondary-container text-white",
};

export function HallOfFame({ competitions }: Props) {
  return (
    <section className="py-20 px-8 md:px-16 bg-surface-container-low">
      <div className="mb-12 text-center">
        <h2 className="font-headline text-5xl font-black text-primary-container italic tracking-tighter">
          HALL OF FAME
        </h2>
        <div className="h-1 w-32 bg-primary-container mx-auto mt-3" />
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container-highest">
              {["EVENT", "LOCATION", "YEAR", "RESULT"].map((h) => (
                <th key={h} className="text-left font-headline font-black text-xs uppercase tracking-widest text-outline px-6 py-4">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {competitions.map((c, i) => {
              const resultStyle = Object.entries(RESULT_STYLE).find(([k]) =>
                c.result.toUpperCase().includes(k)
              )?.[1] ?? "bg-surface-container text-on-background";

              return (
                <tr key={c.id} className={`${i % 2 === 0 ? "bg-surface-container" : "bg-surface-container-low"} hover:bg-surface-container-high transition-colors`}>
                  <td className="px-6 py-4 font-headline font-black text-on-background uppercase">
                    {c.tournament_name}
                  </td>
                  <td className="px-6 py-4 font-body text-on-surface-variant text-sm">
                    {c.city ? `${c.city}, ` : ""}{c.country}
                  </td>
                  <td className="px-6 py-4 font-headline font-bold text-on-surface-variant">{c.year}</td>
                  <td className="px-6 py-4">
                    <span className={`${resultStyle} font-headline font-black text-xs px-3 py-1 uppercase tracking-widest`}>
                      {c.result}
                    </span>
                  </td>
                </tr>
              );
            })}
            {competitions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-outline font-body text-sm">
                  El historial de competencias se carga desde admin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
