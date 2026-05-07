import { supabase } from "@/lib/supabase";
import { HeroTower } from "@/components/tower/HeroTower";
import { EquipmentHighlight } from "@/components/tower/EquipmentHighlight";
import { FloorBreakdown } from "@/components/tower/FloorBreakdown";
import { LocationMap } from "@/components/tower/LocationMap";

export const metadata = { title: "Gaming Tower — 1UP" };

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
