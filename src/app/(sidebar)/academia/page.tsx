import { supabase } from "@/lib/supabase";
import { HeroAcademia } from "@/components/academia/HeroAcademia";
import { CourseCatalog } from "@/components/academia/CourseCatalog";
import { LearningPath } from "@/components/academia/LearningPath";

export const metadata = { title: "Academia — 1UP Gaming Tower" };

export default async function AcademiaPage() {
  const { data: allCourses } = await supabase
    .from("courses")
    .select("*")
    .order("category")
    .order("sort_order");

  return (
    <>
      <HeroAcademia />
      <CourseCatalog courses={allCourses ?? []} />
      <LearningPath />
    </>
  );
}
