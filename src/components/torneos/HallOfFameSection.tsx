import { supabase } from "@/lib/supabase";

type HofEntry = {
  user_profile_id: number;
  username:        string | null;
  nombre:          string | null;
  apellidos:       string | null;
  gold_count:      number;
  silver_count:    number;
  bronze_count:    number;
  total_points:    number;
};

function Medal({ position }: { position: number }) {
  if (position === 1) return <span className="text-yellow-400 font-black text-lg">🥇</span>;
  if (position === 2) return <span className="text-slate-400 font-black text-lg">🥈</span>;
  if (position === 3) return <span className="text-amber-600 font-black text-lg">🥉</span>;
  return <span className="font-headline font-black text-sm text-outline">{position}</span>;
}

const ACCENT = ["bg-yellow-400", "bg-slate-400", "bg-amber-600"];

export async function HallOfFameSection() {
  const { data } = await supabase
    .from("hall_of_fame" as "tournaments")
    .select("*")
    .limit(20);

  const entries = (data ?? []) as unknown as HofEntry[];
  if (entries.length === 0) return null;

  return (
    <section className="py-20 px-8 md:px-16 bg-surface-container">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-2">Hall of Fame</p>
          <h2 className="font-headline font-black text-4xl uppercase tracking-tighter">
            TABLA DE <span className="text-primary-container">CAMPEONES</span>
          </h2>
          <div className="h-1 w-16 bg-primary-container mt-3" />
        </div>

        <div className="space-y-2">
          {entries.map((entry, i) => {
            const rank    = i + 1;
            const name    = [entry.nombre, entry.apellidos].filter(Boolean).join(" ") || entry.username || "Jugador";
            const isTop3  = rank <= 3;
            return (
              <div
                key={entry.user_profile_id}
                className={`flex items-center gap-4 px-5 py-4 ${isTop3 ? "bg-surface-container-high" : "bg-background"}`}
              >
                {isTop3 && <div className={`w-1 h-full self-stretch ${ACCENT[rank - 1]}`} style={{ minHeight: "2rem" }} />}
                <div className="w-8 flex justify-center shrink-0">
                  <Medal position={rank} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-headline font-black text-base uppercase tracking-tight text-on-surface truncate">
                    {name}
                  </p>
                  {entry.username && (
                    <p className="font-body text-xs text-outline truncate">@{entry.username}</p>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-2 text-xs font-headline font-bold text-outline/60 uppercase tracking-widest">
                    {entry.gold_count > 0 && <span>🥇 {entry.gold_count}</span>}
                    {entry.silver_count > 0 && <span>🥈 {entry.silver_count}</span>}
                    {entry.bronze_count > 0 && <span>🥉 {entry.bronze_count}</span>}
                  </div>
                  <div className="text-right">
                    <p className="font-headline font-black text-xl text-primary-container">{entry.total_points}</p>
                    <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline">pts</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
