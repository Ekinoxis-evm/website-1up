import { db } from "@/db";
import { courses } from "@/db/schema";
import { AdminCoursesClient } from "@/components/admin/AdminCoursesClient";

export default async function AdminCoursesPage() {
  const allCourses = await db.select().from(courses).orderBy(courses.category, courses.sortOrder);
  return <AdminCoursesClient courses={allCourses} />;
}
