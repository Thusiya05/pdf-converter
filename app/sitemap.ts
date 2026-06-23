import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Without this, Next.js prerenders this route once at build time (using
// whatever NEXT_PUBLIC_SITE_URL was set during the Docker build, which is
// not the same as the runtime env var set on the host), baking in a stale
// URL forever. Force it to run on every request instead.
export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/docx-to-pdf", "/pdf-to-docx"];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1 : 0.8,
  }));
}
