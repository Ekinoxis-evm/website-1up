import { supabase } from "@/lib/supabase";
import { TorneosClient, type TournamentFull, type IntlTournamentFull } from "@/components/torneos/TorneosClient";
import { HallOfFameSection } from "@/components/torneos/HallOfFameSection";

export default async function TorneosPage() {
  const [{ data: tournaments }, { data: intlTournaments }, { data: games }] = await Promise.all([
    supabase
      .from("tournaments")
      .select("*, games(id, name), tournament_prizes(*)")
      .eq("is_active", true)
      .order("sort_order")
      .order("date", { ascending: true }),
    supabase
      .from("international_tournaments")
      .select("*, games(id, name)")
      .eq("is_active", true)
      .order("sort_order")
      .order("date", { ascending: true }),
    supabase.from("games").select("id, name").order("name"),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="py-24 px-8 md:px-16 bg-background">
        <div className="max-w-5xl">
          <div className="inline-block bg-primary-container px-4 py-1 mb-6 skew-fix">
            <span className="text-white font-black italic skew-content block text-sm tracking-widest font-headline">
              ESPORTS
            </span>
          </div>
          <h1 className="font-headline font-black text-6xl md:text-8xl uppercase tracking-tighter leading-none mb-4">
            TOR<span className="text-primary-container">NEOS</span>
          </h1>
          <div className="h-1 w-24 bg-primary-container mb-8" />
          <p className="font-body text-on-surface/60 text-lg max-w-xl">
            Compite en los torneos oficiales del ecosistema 1UP. Todos los niveles, múltiples juegos,
            premios reales.
          </p>
        </div>
      </section>

      <HallOfFameSection />
      <TorneosClient
        tournaments={(tournaments ?? []) as TournamentFull[]}
        intlTournaments={(intlTournaments ?? []) as IntlTournamentFull[]}
        games={games ?? []}
      />
    </>
  );
}
