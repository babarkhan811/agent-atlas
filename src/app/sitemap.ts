import type { MetadataRoute } from "next";
import { lessonHref, loadContent, loadGlossary } from "@/content";
import { GUIDE_SECTIONS } from "@/components/guide/sections";
import { absUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absUrl("/"), priority: 1 },
    { url: absUrl("/learn/"), priority: 0.9 },
    ...loadContent().paths.map((p) => ({ url: absUrl(`/learn/${p.id}/`), priority: 0.8 })),
    ...loadContent().lessons.map((l) => ({
      url: absUrl(lessonHref(l)),
      priority: l.tier === "free" ? 0.9 : 0.7,
      ...(l.lastVerified && { lastModified: l.lastVerified }),
    })),
    // Only written-up glossary terms are indexable.
    ...loadGlossary().filter((t) => t.body).map((t) => ({ url: absUrl(`/glossary/${t.slug}/`), priority: 0.5 })),
    { url: absUrl("/about/"), priority: 0.4 },
    { url: absUrl("/guide/"), priority: 0.8 },
    ...GUIDE_SECTIONS.map((s) => ({ url: absUrl(`/guide/${s.slug}/`), priority: 0.7 })),
    { url: absUrl("/glossary/"), priority: 0.6 },
  ];
}
