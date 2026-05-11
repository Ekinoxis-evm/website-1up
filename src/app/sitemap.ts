import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://1upesports.org";
  const now = new Date();

  return [
    { url: base,                          lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/gaming-tower`,        lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/academia`,            lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${base}/torneos`,             lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${base}/recreativo`,          lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/marketplace`,         lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacidad`,          lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];
}
