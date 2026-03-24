import { db } from "@/db";
import { floorInfo, passBenefits } from "@/db/schema";
import { HeroTower } from "@/components/tower/HeroTower";
import { EquipmentHighlight } from "@/components/tower/EquipmentHighlight";
import { FloorBreakdown } from "@/components/tower/FloorBreakdown";
import { PassSection } from "@/components/tower/PassSection";
import { LocationMap } from "@/components/tower/LocationMap";

export const metadata = { title: "Gaming Tower — 1UP" };

export default async function GamingTowerPage() {
  const [floors, benefits] = await Promise.all([
    db.select().from(floorInfo).orderBy(floorInfo.sortOrder),
    db.select().from(passBenefits).orderBy(passBenefits.sortOrder),
  ]).catch(() => [[], []]);

  return (
    <>
      <HeroTower />
      <EquipmentHighlight />
      <FloorBreakdown floors={floors} />
      <PassSection benefits={benefits} />
      <LocationMap />
    </>
  );
}
