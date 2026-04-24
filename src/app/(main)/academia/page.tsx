import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { HeroAcademia } from "@/components/academia/HeroAcademia";
import { CourseCatalog } from "@/components/academia/CourseCatalog";
import { LearningPath } from "@/components/academia/LearningPath";
import { PaymentFeedback } from "@/components/academia/PaymentFeedback";

export const metadata = { title: "Academia — 1UP Gaming Tower" };

export default async function AcademiaPage() {
  const [{ data: allCourses }, { data: siteImage }] = await Promise.all([
    supabase.from("courses").select("*").eq("is_active", true).order("category").order("sort_order"),
    supabase.from("site_content").select("key, image_url").eq("key", "learning_path").single(),
  ]);

  return (
    <>
      <HeroAcademia />
      <CourseCatalog courses={allCourses ?? []} />
      <LearningPath imageUrl={siteImage?.image_url} />
      <Suspense>
        <PaymentFeedback />
      </Suspense>
    </>
  );
}
