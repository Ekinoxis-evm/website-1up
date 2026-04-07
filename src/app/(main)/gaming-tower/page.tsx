import { supabase } from "@/lib/supabase";
import { HeroTower } from "@/components/tower/HeroTower";
import { EquipmentHighlight } from "@/components/tower/EquipmentHighlight";
import { FloorBreakdown } from "@/components/tower/FloorBreakdown";
import { PassSection } from "@/components/tower/PassSection";
import { LocationMap } from "@/components/tower/LocationMap";

export const metadata = { title: "Gaming Tower — 1UP" };

export default async function GamingTowerPage() {
  const [{ data: floors }, { data: benefits }] = await Promise.all([
    supabase.from("floor_info").select("*").order("sort_order"),
    supabase.from("pass_benefits").select("*").order("sort_order"),
  ]);

  return (
    <>
      <HeroTower />
      <EquipmentHighlight />
      <FloorBreakdown floors={floors ?? []} />
      <PassSection benefits={benefits ?? []} />
      <LocationMap />
    </>
  );
}
