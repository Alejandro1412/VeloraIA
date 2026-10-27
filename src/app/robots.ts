import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/app", "/admin", "/api", "/cita", "/opinion", "/pagar"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
