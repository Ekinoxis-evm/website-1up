import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { TorneosClient, type TournamentFull, type IntlTournamentFull } from "@/components/torneos/TorneosClient";
import { HallOfFameSection } from "@/components/torneos/HallOfFameSection";
import { HallOfFame } from "@/components/team/HallOfFame";

export const metadata: Metadata = {
  title: "Torneos Esports — 1UP Gaming Tower Colombia",
  description:
    "Compite en los torneos oficiales del ecosistema 1UP. Premios en $1UP tokens, múltiples juegos, todos los niveles. Torneos presenciales y online en Colombia.",
  keywords: ["torneos esports Colombia", "competencias gaming Colombia", "torneos videojuegos Cali", "premios esports", "1UP torneos"],
  openGraph: {
    title: "Torneos Esports — 1UP Gaming Tower",
    description: "Compite, gana premios en $1UP y sube al Hall of Fame. Torneos oficiales del ecosistema 1UP en Colombia.",
    url: "https://1upesports.org/torneos",
    type: "website",
    images: [{ url: "/1up.png", width: 512, height: 512, alt: "Torneos 1UP Gaming Tower" }],
  },
  twitter: { card: "summary_large_image", title: "Torneos Esports 1UP", description: "Compite y gana en los torneos oficiales del ecosistema 1UP." },
  alternates: { canonical: "https://1upesports.org/torneos" },
};

export default async function TorneosPage() {
  const [{ data: tournaments }, { data: intlTournaments }, { data: games }, { data: competitions }] = await Promise.all([
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
    supabase.from("competitions").select("*").order("year", { ascending: false }),
  ]);

  const upcomingTournaments = (tournaments ?? []).filter((t) => t.status === "upcoming" || t.status === "live");
  const sportsEvents = upcomingTournaments.map((t) => ({
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: t.name,
    startDate: t.date ?? undefined,
    location: t.location_type === "online"
      ? { "@type": "VirtualLocation", url: "https://1upesports.org/torneos" }
      : { "@type": "Place", name: "1UP Gaming Tower", address: { "@type": "PostalAddress", addressLocality: "Cali", addressCountry: "CO" } },
    organizer: { "@type": "Organization", name: "1UP Gaming Tower", url: "https://1upesports.org" },
    url: "https://1upesports.org/torneos",
    sport: "Esports",
  }));

  return (
    <>
      {sportsEvents.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsEvents) }} />
      )}
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
      {(competitions ?? []).length > 0 && <HallOfFame competitions={competitions ?? []} />}
      <TorneosClient
        tournaments={(tournaments ?? []) as TournamentFull[]}
        intlTournaments={(intlTournaments ?? []) as IntlTournamentFull[]}
        games={games ?? []}
      />
    </>
  );
}
