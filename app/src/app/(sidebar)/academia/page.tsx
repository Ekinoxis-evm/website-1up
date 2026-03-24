import { db } from "@/db";
import { courses } from "@/db/schema";
import { HeroAcademia } from "@/components/academia/HeroAcademia";
import { CourseCatalog } from "@/components/academia/CourseCatalog";
import { LearningPath } from "@/components/academia/LearningPath";

export const metadata = { title: "Academia — 1UP Gaming Tower" };

export default async function AcademiaPage() {
  const allCourses = await db.select().from(courses)
    .orderBy(courses.category, courses.sortOrder)
    .catch(() => []);

  return (
    <>
      <HeroAcademia />
      <CourseCatalog courses={allCourses} />
      <LearningPath />
    </>
  );
}
