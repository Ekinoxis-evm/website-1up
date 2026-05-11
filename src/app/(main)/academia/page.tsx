import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { HeroAcademia } from "@/components/academia/HeroAcademia";
import { CourseCatalog } from "@/components/academia/CourseCatalog";
import { LearningPath } from "@/components/academia/LearningPath";
import { PaymentFeedback } from "@/components/academia/PaymentFeedback";

export const metadata = { title: "Academia — 1UP Gaming Tower" };

export default async function AcademiaPage() {
  const [{ data: allCourses }, { data: siteImage }, { data: masters }] = await Promise.all([
    supabase.from("courses").select("*").eq("is_active", true).order("category").order("sort_order"),
    supabase.from("site_content").select("key, image_url, updated_at").eq("key", "learning_path").single(),
    supabase.from("masters").select("id, name, photo_url").eq("is_active", true).order("sort_order"),
  ]);

  return (
    <>
      <HeroAcademia />
      <CourseCatalog courses={allCourses ?? []} masters={masters ?? []} />
      <LearningPath imageUrl={siteImage?.image_url} updatedAt={siteImage?.updated_at} />
      <Suspense>
        <PaymentFeedback />
      </Suspense>
    </>
  );
}
