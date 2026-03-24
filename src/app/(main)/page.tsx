import { supabase } from "@/lib/supabase";
import { HeroHome } from "@/components/home/HeroHome";
import { TalentPipeline } from "@/components/home/TalentPipeline";
import { GamesGallery } from "@/components/home/GamesGallery";
import { RecruitmentForm } from "@/components/home/RecruitmentForm";

export default async function HomePage() {
  const [{ data: allCategories }, { data: allGames }] = await Promise.all([
    supabase.from("game_categories").select("*").order("sort_order"),
    supabase.from("games").select("*").order("sort_order"),
  ]);

  return (
    <>
      <HeroHome />
      <TalentPipeline />
      <GamesGallery categories={allCategories ?? []} games={allGames ?? []} />
      <RecruitmentForm categories={allCategories ?? []} games={allGames ?? []} />
    </>
  );
}
