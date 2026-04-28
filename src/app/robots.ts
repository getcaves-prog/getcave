import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/terms", "/organizer", "/content-policy"],
        disallow: ["/admin/", "/api/", "/auth/callback", "/auth/confirm"],
      },
    ],
    sitemap: "https://www.getcaves.com/sitemap.xml",
  };
}
