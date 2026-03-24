import { db } from "@/db";
import { games, gameCategories } from "@/db/schema";
import { HeroHome } from "@/components/home/HeroHome";
import { TalentPipeline } from "@/components/home/TalentPipeline";
import { GamesGallery } from "@/components/home/GamesGallery";
import { RecruitmentForm } from "@/components/home/RecruitmentForm";

export default async function HomePage() {
  const [allCategories, allGames] = await Promise.all([
    db.select().from(gameCategories).orderBy(gameCategories.sortOrder),
    db.select().from(games).orderBy(games.sortOrder),
  ]).catch(() => [[], []]);

  return (
    <>
      <HeroHome />
      <TalentPipeline />
      <GamesGallery categories={allCategories} games={allGames} />
      <RecruitmentForm categories={allCategories} games={allGames} />
    </>
  );
}
