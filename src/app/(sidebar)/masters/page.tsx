import { supabase } from "@/lib/supabase";
import { HeroMasters } from "@/components/masters/HeroMasters";
import { MasterGrid } from "@/components/masters/MasterGrid";

export const metadata = { title: "Masters — 1UP Gaming Tower" };

export default async function MastersPage() {
  const { data } = await supabase
    .from("masters")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  return (
    <>
      <HeroMasters />
      <MasterGrid masters={data ?? []} />
    </>
  );
}
