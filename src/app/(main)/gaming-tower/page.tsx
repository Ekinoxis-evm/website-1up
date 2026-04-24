import { supabase } from "@/lib/supabase";
import { HeroTower } from "@/components/tower/HeroTower";
import { EquipmentHighlight } from "@/components/tower/EquipmentHighlight";
import { FloorBreakdown } from "@/components/tower/FloorBreakdown";
import { PassSection } from "@/components/tower/PassSection";
import { LocationMap } from "@/components/tower/LocationMap";

export const metadata = { title: "Gaming Tower — 1UP" };

export default async function GamingTowerPage() {
  const [{ data: floors }, { data: benefits }, { data: siteImages }] = await Promise.all([
    supabase.from("floor_info").select("*").order("sort_order"),
    supabase.from("pass_benefits").select("*").order("sort_order"),
    supabase.from("site_content").select("key, image_url").eq("key", "equipment_highlight").single(),
  ]);

  return (
    <>
      <HeroTower />
      <EquipmentHighlight imageUrl={siteImages?.image_url} />
      <FloorBreakdown floors={floors ?? []} />
      <PassSection benefits={benefits ?? []} />
      <LocationMap />
    </>
  );
}
