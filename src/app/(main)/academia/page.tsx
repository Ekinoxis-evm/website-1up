import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { HeroAcademia } from "@/components/academia/HeroAcademia";
import { CourseCatalog } from "@/components/academia/CourseCatalog";
import { LearningPath } from "@/components/academia/LearningPath";
import { PaymentFeedback } from "@/components/academia/PaymentFeedback";
import { MasterGrid } from "@/components/masters/MasterGrid";
import type { Metadata } from "next";
import type { Master } from "@/types/database.types";

export const metadata: Metadata = {
  title: "Academia 1UP — Cursos de Esports y Gaming en Colombia",
  description:
    "Aprende con los mejores coaches y masters de esports en Colombia. Cursos de estrategia, mecánicas, coaching y desarrollo profesional. Paga con $1UP tokens o MercadoPago.",
  keywords: ["academia esports Colombia", "cursos gaming Colombia", "coaching esports", "aprender esports", "1UP academia"],
  openGraph: {
    title: "Academia 1UP — Cursos de Esports en Colombia",
    description: "Cursos con masters profesionales. Estrategia, mecánicas y coaching. Paga con $1UP o MercadoPago.",
    url: "https://1upesports.org/academia",
    type: "website",
    images: [{ url: "/1up.png", width: 512, height: 512, alt: "Academia 1UP Gaming Tower" }],
  },
  twitter: { card: "summary_large_image", title: "Academia 1UP Esports", description: "Cursos de esports con los mejores coaches de Colombia." },
  alternates: { canonical: "https://1upesports.org/academia" },
};

export default async function AcademiaPage() {
  const [{ data: allCourses }, { data: siteImage }, { data: masters }, { data: masterCourses }] = await Promise.all([
    supabase.from("courses").select("*").eq("is_active", true).order("category").order("sort_order"),
    supabase.from("site_content").select("key, image_url, updated_at").eq("key", "learning_path").single(),
    supabase.from("masters").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("courses").select("id, name, category, master_id").eq("is_active", true),
  ]);

  const masterList = (masters ?? []) as Master[];
  const masterMinis = masterList.map((m) => ({ id: m.id, name: m.name, photo_url: m.photo_url }));

  const coursesByMaster: Record<number, { id: number; name: string; category: string }[]> = {};
  for (const c of masterCourses ?? []) {
    if (c.master_id) {
      if (!coursesByMaster[c.master_id]) coursesByMaster[c.master_id] = [];
      coursesByMaster[c.master_id].push({ id: c.id, name: c.name, category: c.category });
    }
  }

  return (
    <>
      <HeroAcademia />
      <CourseCatalog courses={allCourses ?? []} masters={masterMinis} />
      <LearningPath imageUrl={siteImage?.image_url} updatedAt={siteImage?.updated_at} />

      {/* Masters heading */}
      <section className="px-8 md:px-16 pt-20 pb-10 bg-background">
        <div className="inline-block bg-primary-container px-4 py-1 mb-4 skew-fix">
          <span className="text-white font-black italic skew-content block text-sm tracking-widest font-headline">
            NUESTROS MASTERS
          </span>
        </div>
        <h2 className="font-headline font-black text-4xl md:text-5xl uppercase tracking-tighter leading-none mb-2">
          LOS EXPERTOS DE <span className="text-primary-container">LA ACADEMIA</span>
        </h2>
        <div className="h-1 w-20 bg-primary-container" />
      </section>
      <MasterGrid masters={masterList} coursesByMaster={coursesByMaster} />

      <Suspense>
        <PaymentFeedback />
      </Suspense>
    </>
  );
}
