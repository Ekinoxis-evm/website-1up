import { supabase } from "@/lib/supabase";
import { HeroTeam } from "@/components/team/HeroTeam";
import { PlayerGrid } from "@/components/team/PlayerGrid";
import { HallOfFame } from "@/components/team/HallOfFame";
import { RecruitmentForm } from "@/components/home/RecruitmentForm";

export const metadata = { title: "Team 1UP — Pro Roster" };

export default async function TeamPage() {
  const [
    { data: allPlayers },
    { data: allCompetitions },
    { data: allCategories },
    { data: allGames },
  ] = await Promise.all([
    supabase.from("players").select("*").order("sort_order"),
    supabase.from("competitions").select("*").order("year"),
    supabase.from("game_categories").select("*").order("sort_order"),
    supabase.from("games").select("*").order("sort_order"),
  ]);

  return (
    <>
      <HeroTeam />
      <PlayerGrid players={allPlayers ?? []} />
      <HallOfFame competitions={allCompetitions ?? []} />
      <RecruitmentForm categories={allCategories ?? []} games={allGames ?? []} source="team" />
    </>
  );
}
