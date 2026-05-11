import { supabase } from "@/lib/supabase";
import { HeroHome } from "@/components/home/HeroHome";
import { BrandsBanner } from "@/components/home/BrandsBanner";
import { TalentPipeline } from "@/components/home/TalentPipeline";
import { GamesGallery } from "@/components/home/GamesGallery";
import { MarketplaceSection } from "@/components/home/MarketplaceSection";
import { RecruitmentForm } from "@/components/home/RecruitmentForm";
import { PassSection } from "@/components/tower/PassSection";

export default async function HomePage() {
  const [{ data: allCategories }, { data: allGames }, { data: benefits }, { data: brandLogos }] = await Promise.all([
    supabase.from("game_categories").select("*").order("sort_order"),
    supabase.from("games").select("*").order("sort_order"),
    supabase.from("pass_benefits").select("*").order("sort_order"),
    supabase.from("brand_logos").select("*").eq("is_active", true).order("sort_order"),
  ]);

  return (
    <>
      <HeroHome />
      <BrandsBanner logos={brandLogos ?? []} />
      <PassSection benefits={benefits ?? []} />
      <TalentPipeline />
      <GamesGallery categories={allCategories ?? []} games={allGames ?? []} />
      <MarketplaceSection />
      <RecruitmentForm categories={allCategories ?? []} games={allGames ?? []} />
    </>
  );
}
