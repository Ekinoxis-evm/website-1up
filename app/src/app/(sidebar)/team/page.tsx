import { db } from "@/db";
import { players, competitions, games, gameCategories } from "@/db/schema";
import { HeroTeam } from "@/components/team/HeroTeam";
import { PlayerGrid } from "@/components/team/PlayerGrid";
import { HallOfFame } from "@/components/team/HallOfFame";
import { RecruitmentForm } from "@/components/home/RecruitmentForm";

export const metadata = { title: "Team 1UP — Pro Roster" };

export default async function TeamPage() {
  const [allPlayers, allCompetitions, allCategories, allGames] = await Promise.all([
    db.select().from(players).orderBy(players.sortOrder),
    db.select().from(competitions).orderBy(competitions.year),
    db.select().from(gameCategories).orderBy(gameCategories.sortOrder),
    db.select().from(games).orderBy(games.sortOrder),
  ]).catch(() => [[], [], [], []]);

  return (
    <>
      <HeroTeam />
      <PlayerGrid players={allPlayers} />
      <HallOfFame competitions={allCompetitions} />
      <RecruitmentForm categories={allCategories} games={allGames} extended />
    </>
  );
}
