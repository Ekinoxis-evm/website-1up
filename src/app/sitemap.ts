import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://1upesports.org";
  const now = new Date();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, created_at")
    .eq("is_active", true);

  const courseEntries: MetadataRoute.Sitemap = (courses ?? []).map((c) => ({
    url: `${base}/academia/${c.id}`,
    lastModified: c.created_at ? new Date(c.created_at) : now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    { url: base,                          lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/gaming-tower`,        lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/academia`,            lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${base}/torneos`,             lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${base}/recreativo`,          lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/marketplace`,         lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacidad`,          lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    ...courseEntries,
  ];
}
