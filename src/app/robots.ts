import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/app/", "/api/"],
      },
    ],
    sitemap: "https://1upesports.org/sitemap.xml",
  };
}
