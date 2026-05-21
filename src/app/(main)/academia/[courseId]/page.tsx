import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { CoursePreview } from "@/components/academia/CoursePreview";

interface Props {
  params: Promise<{ courseId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseId } = await params;
  const id = Number(courseId);
  if (!id || isNaN(id)) return { title: "Curso no encontrado — 1UP Academia" };

  const { data: course } = await supabase
    .from("courses")
    .select("name, description, image_url, category")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (!course) return { title: "Curso no encontrado — 1UP Academia" };

  const title = `${course.name} — Academia 1UP`;
  const description =
    course.description ??
    `Curso de ${course.category} en 1UP Gaming Tower. Aprende con masters profesionales de esports en Colombia.`;
  const ogImage = course.image_url ?? "/1up.png";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://1upesports.org/academia/${id}`,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: course.name }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
    alternates: { canonical: `https://1upesports.org/academia/${id}` },
  };
}

export default async function CoursePreviewPage({ params }: Props) {
  const { courseId } = await params;
  const id = Number(courseId);
  if (!id || isNaN(id)) notFound();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (!course) notFound();

  const { data: modules } = await supabase
    .from("course_modules")
    .select("id, title, description, sort_order")
    .eq("course_id", id)
    .eq("is_published", true)
    .order("sort_order");

  const moduleIds = (modules ?? []).map((m) => m.id);
  let sessions: { id: number; module_id: number; title: string; duration_minutes: number | null; sort_order: number }[] = [];
  if (moduleIds.length > 0) {
    const { data } = await supabase
      .from("course_sessions")
      .select("id, module_id, title, duration_minutes, sort_order")
      .in("module_id", moduleIds)
      .eq("is_published", true)
      .order("sort_order");
    sessions = data ?? [];
  }

  let masterName: string | null = null;
  let masterPhoto: string | null = null;
  if (course.master_id) {
    const { data: master } = await supabase
      .from("masters")
      .select("name, photo_url")
      .eq("id", course.master_id)
      .single();
    masterName = master?.name ?? null;
    masterPhoto = master?.photo_url ?? null;
  }

  return (
    <CoursePreview
      course={course}
      modules={modules ?? []}
      sessions={sessions}
      masterName={masterName}
      masterPhoto={masterPhoto}
    />
  );
}
