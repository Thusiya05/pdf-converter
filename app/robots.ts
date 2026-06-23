import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// See app/sitemap.ts for why this needs to be forced dynamic.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
