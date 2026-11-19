import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lessonHref, lessonIndex, loadContent, loadGlossary } from "@/content";
import type { Lesson } from "@/content/schema";
import { LessonArticle } from "@/components/LessonArticle";
import { Workspace } from "@/components/Workspace";
import { absUrl } from "@/lib/site";

type Params = { path: string; lesson: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return loadContent().lessons.map((l) => ({ path: l.path, lesson: l.id }));
}

function find({ path, lesson }: Params) {
  return loadContent().lessons.find((l) => l.id === lesson && l.path === path);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const l = find(await params);
  if (!l) return {};
  return { title: l.seoTitle ?? l.title, description: l.seoDescription ?? l.summary, alternates: { canonical: absUrl(lessonHref(l)) } };
}

/** schema.org structured data: the lesson, its breadcrumb trail and (when written) its FAQ. */
function jsonLd(l: Lesson) {
  const { paths } = loadContent();
  const pathTitle = paths.find((p) => p.id === l.path)?.title ?? l.path;
  const url = absUrl(lessonHref(l));
  const graph: object[] = [
    {
      "@type": "LearningResource",
      name: l.title,
      description: l.seoDescription ?? l.summary,
      url,
      learningResourceType: "Interactive simulation and lesson",
      educationalLevel: l.path === "foundations" ? "Beginner" : "Intermediate",
      isAccessibleForFree: l.tier === "free",
      inLanguage: "en",
      ...(l.lastVerified && { dateModified: l.lastVerified }),
      ...(l.article && { timeRequired: `PT${l.article.minutes}M`, teaches: l.objectives }),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Agent Atlas", item: absUrl("/") },
        { "@type": "ListItem", position: 2, name: pathTitle },
        { "@type": "ListItem", position: 3, name: l.title, item: url },
      ],
    },
  ];
  if (l.article) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: l.article.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a.replace(/`/g, "") } })),
    });
  }
  // Escape "<" so content can never close the script tag.
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}

export default async function LessonPage({ params }: { params: Promise<Params> }) {
  const l = find(await params);
  if (!l) notFound();
  const index = lessonIndex();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(l) }} />
      <Workspace lesson={l} index={index} />
      <LessonArticle lesson={l} index={index} glossary={loadGlossary()} />
    </>
  );
}
