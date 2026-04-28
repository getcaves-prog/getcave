import type { MetadataRoute } from "next";

const BASE = "https://www.getcaves.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE}/auth/login`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE}/auth/signup`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE}/terms`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE}/organizer`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE}/content-policy`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
