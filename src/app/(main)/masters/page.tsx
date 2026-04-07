import { supabase } from "@/lib/supabase";
import { HeroMasters } from "@/components/masters/HeroMasters";
import { MasterGrid } from "@/components/masters/MasterGrid";

export const metadata = { title: "Masters — 1UP Gaming Tower" };

export default async function MastersPage() {
  const [{ data: masters }, { data: courses }] = await Promise.all([
    supabase.from("masters").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("courses").select("id, name, category, master_id").eq("is_active", true),
  ]);

  // Group courses by master_id
  const coursesByMaster: Record<number, { id: number; name: string; category: string }[]> = {};
  for (const c of courses ?? []) {
    if (c.master_id) {
      if (!coursesByMaster[c.master_id]) coursesByMaster[c.master_id] = [];
      coursesByMaster[c.master_id].push({ id: c.id, name: c.name, category: c.category });
    }
  }

  return (
    <>
      <HeroMasters />
      <MasterGrid masters={masters ?? []} coursesByMaster={coursesByMaster} />
    </>
  );
}
