import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { HeroTeam } from "@/components/team/HeroTeam";
import { PlayerGrid } from "@/components/team/PlayerGrid";
import { RecruitmentForm } from "@/components/home/RecruitmentForm";

export const metadata: Metadata = {
  title: "Team 1UP — Roster Profesional de Esports en Colombia",
  description:
    "Conoce a los jugadores profesionales de 1UP Gaming Tower. Roster activo de esports en Colombia y reclutamiento para nuevos talentos.",
  keywords: ["team esports Colombia", "jugadores profesionales esports", "roster 1UP", "esports Cali", "jugadores esports Colombia"],
  openGraph: {
    title: "Team 1UP — Roster Profesional de Esports",
    description: "Jugadores pro y reclutamiento. Conoce al equipo de 1UP Gaming Tower.",
    url: "https://1upesports.org/team",
    type: "website",
    images: [{ url: "/1up.png", width: 512, height: 512, alt: "Team 1UP Esports" }],
  },
  twitter: { card: "summary_large_image", title: "Team 1UP Esports Colombia", description: "Roster profesional y Hall of Fame del primer gaming tower de Colombia." },
  alternates: { canonical: "https://1upesports.org/team" },
};

export default async function TeamPage() {
  const [
    { data: allPlayers },
    { data: allCategories },
    { data: allGames },
  ] = await Promise.all([
    supabase.from("players").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("game_categories").select("*").order("sort_order"),
    supabase.from("games").select("*").order("sort_order"),
  ]);

  return (
    <>
      <HeroTeam />
      <PlayerGrid players={allPlayers ?? []} />
      <RecruitmentForm categories={allCategories ?? []} games={allGames ?? []} source="team" />
    </>
  );
}
