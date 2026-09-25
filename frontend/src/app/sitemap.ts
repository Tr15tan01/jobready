import type { MetadataRoute } from "next";
import { GUIDES, GUIDES_UPDATED } from "@/lib/tips-content";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/tips", "/about", "/help/video-privacy", "/help/permissions", "/privacy", "/terms", "/cookies"];
  return [
    ...pages.map((p) => ({
      url: `${SITE_URL}${p}`,
      changeFrequency: "monthly" as const,
      priority: p === "" ? 1 : p === "/tips" ? 0.9 : 0.5,
    })),
    ...GUIDES.map((g) => ({
      url: `${SITE_URL}/tips/${g.slug}`,
      lastModified: GUIDES_UPDATED,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
