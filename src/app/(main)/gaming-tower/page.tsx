import { supabase } from "@/lib/supabase";
import { HeroTower } from "@/components/tower/HeroTower";
import { EquipmentHighlight } from "@/components/tower/EquipmentHighlight";
import { FloorBreakdown } from "@/components/tower/FloorBreakdown";
import { LocationMap } from "@/components/tower/LocationMap";

export const metadata = {
  title: "Gaming Tower — Instalaciones Profesionales de Esports en Cali, Colombia",
  description:
    "6 plantas de infraestructura de élite: PCs de alto rendimiento, zona VR, sala de streaming y cafetería. El primer Gaming Tower profesional de Colombia en Cali.",
  keywords: ["gaming tower Cali", "instalaciones esports Colombia", "PC gaming Cali", "sala gaming profesional Colombia"],
  openGraph: {
    title: "Gaming Tower 1UP — Esports en Cali",
    description: "6 plantas con PCs pro, VR, streaming y cafetería. El primer gaming tower de Colombia.",
    url: "https://1upesports.org/gaming-tower",
    type: "website",
    images: [{ url: "/1up.png", width: 512, height: 512, alt: "1UP Gaming Tower Cali" }],
  },
  twitter: { card: "summary_large_image", title: "Gaming Tower 1UP Cali", description: "El primer gaming tower profesional de Colombia." },
  alternates: { canonical: "https://1upesports.org/gaming-tower" },
};

export default async function GamingTowerPage() {
  const [{ data: floors }, { data: siteImages }] = await Promise.all([
    supabase.from("floor_info").select("*").order("sort_order"),
    supabase.from("site_content").select("key, image_url, updated_at").eq("key", "equipment_highlight").single(),
  ]);

  return (
    <>
      <HeroTower />
      <EquipmentHighlight imageUrl={siteImages?.image_url} updatedAt={siteImages?.updated_at} />
      <FloorBreakdown floors={floors ?? []} />
      <LocationMap />
    </>
  );
}
