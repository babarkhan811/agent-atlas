import type { MetadataRoute } from "next";
import { lessonHref, loadContent } from "@/content";
import { absUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absUrl("/"), priority: 1 },
    ...loadContent().lessons.map((l) => ({ url: absUrl(lessonHref(l)), priority: l.tier === "free" ? 0.9 : 0.7 })),
    { url: absUrl("/guide/"), priority: 0.8 },
    { url: absUrl("/glossary/"), priority: 0.6 },
  ];
}
