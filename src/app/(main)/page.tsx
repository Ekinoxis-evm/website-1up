import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { HeroHome } from "@/components/home/HeroHome";

export const metadata: Metadata = {
  title: "1UP Gaming Tower — El Primer Hub de Esports Profesional en Colombia",
  description:
    "Gaming Tower, Academia de esports, torneos con premios en $1UP y 1UP Pass mensual. Cali, Colombia. El primer espacio equipado de élite para jugadores profesionales.",
  keywords: ["esports Colombia", "gaming tower Cali", "torneos esports Colombia", "academia gaming", "1UP esports"],
  openGraph: {
    title: "1UP Gaming Tower — Esports Hub Colombia",
    description: "Gaming Tower, Academia, torneos y 1UP Pass. El primer hub de esports profesional en Colombia.",
    url: "https://1upesports.org",
    type: "website",
    images: [{ url: "/1up.png", width: 512, height: 512, alt: "1UP Gaming Tower" }],
  },
  twitter: { card: "summary_large_image", title: "1UP Gaming Tower", description: "El primer hub de esports profesional en Colombia." },
  alternates: { canonical: "https://1upesports.org" },
};
import { BrandsBanner } from "@/components/home/BrandsBanner";
import { TalentPipeline } from "@/components/home/TalentPipeline";
import { AcademiaSection } from "@/components/home/AcademiaSection";
import { TorneosSection } from "@/components/home/TorneosSection";
import { MarketplaceSection } from "@/components/home/MarketplaceSection";
import { RecruitmentForm } from "@/components/home/RecruitmentForm";
import { PassSection } from "@/components/tower/PassSection";
import { CommunitySection } from "@/components/home/CommunitySection";

export default async function HomePage() {
  const [{ data: allCategories }, { data: allGames }, { data: benefits }, { data: brandLogos }] = await Promise.all([
    supabase.from("game_categories").select("*").order("sort_order"),
    supabase.from("games").select("*").order("sort_order"),
    supabase.from("pass_benefits").select("*").order("sort_order"),
    supabase.from("aliados").select("*").eq("is_active", true).eq("show_in_banner", true).order("sort_order"),
  ]);

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: "1UP Gaming Tower",
    description: "El primer hub de esports profesional en Colombia — Gaming Tower, Academia, torneos y 1UP Pass.",
    url: "https://1upesports.org",
    logo: "https://1upesports.org/1up.png",
    image: "https://1upesports.org/1up.png",
    address: { "@type": "PostalAddress", addressLocality: "Cali", addressCountry: "CO" },
    sameAs: ["https://www.instagram.com/1upgamingtower/"],
    priceRange: "$$",
  };

  return (
    <>
      {/* JSON-LD — static server-controlled object, no user input */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }} />
      <HeroHome />
      <BrandsBanner logos={brandLogos ?? []} />
      <PassSection benefits={benefits ?? []} />
      <AcademiaSection />
      <TorneosSection />
      <CommunitySection />
      <MarketplaceSection />
      <TalentPipeline />
      <RecruitmentForm categories={allCategories ?? []} games={allGames ?? []} />
    </>
  );
}
