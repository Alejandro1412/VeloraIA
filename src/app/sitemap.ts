import type { MetadataRoute } from "next";
import { VERTICAL_PAGES } from "@/lib/landing-verticals";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    ...VERTICAL_PAGES.map((v) => ({ url: `${base}/para/${v.slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${base}/registro`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${base}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
