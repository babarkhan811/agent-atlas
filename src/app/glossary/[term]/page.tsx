import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { lessonHref, lessonIndex, loadContent, loadGlossary } from "@/content";
import { PageShell } from "@/components/PageShell";
import { Inline, Prose } from "@/components/Prose";
import { absUrl } from "@/lib/site";

type Params = { term: string };
export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return loadGlossary().map((t) => ({ term: t.slug }));
}

const find = (slug: string) => loadGlossary().find((t) => t.slug === slug);

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const t = find((await params).term);
  if (!t) return {};
  return {
    title: `${t.term}: meaning in AI agents and security`,
    description: t.definition.slice(0, 160),
    alternates: { canonical: absUrl(`/glossary/${t.slug}/`) },
    // Short definition-only pages stay out of search results until they are written up.
    ...(!t.body && { robots: { index: false, follow: true } }),
  };
}

export default async function TermPage({ params }: { params: Promise<Params> }) {
  const t = find((await params).term);
  if (!t) notFound();
  const lesson = t.seeIn && loadContent().lessons.find((l) => l.id === t.seeIn!.lesson);
  const terms = loadGlossary();
  const i = terms.findIndex((x) => x.slug === t.slug);
  const prev = terms[i - 1], next = terms[i + 1];
  const ld = JSON.stringify({
    "@context": "https://schema.org", "@type": "DefinedTerm", name: t.term, description: t.definition,
    url: absUrl(`/glossary/${t.slug}/`), inDefinedTermSet: absUrl("/glossary/"),
  }).replace(/</g, "\\u003c");

  return (
    <PageShell index={lessonIndex()}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
      <div className="crumbs"><Link href="/learn/">Learn</Link> / <Link href="/glossary/">Glossary</Link> / {t.term}</div>
      <article className="term">
        <div className="lesson-head">
          <h1>{t.term}</h1>
          <p className="term-def"><Inline text={t.definition} /></p>
        </div>
        {t.body && <section className="card-3d"><h2>In more detail</h2><Prose text={t.body} /></section>}
        {t.example && <section className="card-3d"><h2>Example</h2><Prose text={t.example} /></section>}
        {lesson && t.seeIn && (
          <section className="card-3d see-in">
            <h2>See it in action</h2>
            <p>Step {t.seeIn.step} of <b>{lesson.title}</b>: {lesson.steps[t.seeIn.step - 1]?.title}</p>
            <Link className="cta-link" href={`${lessonHref(lesson)}?step=${t.seeIn.step}`}>Open the simulation at this step →</Link>
          </section>
        )}
        <nav className="pager term-pager" aria-label="Glossary">
          {prev ? <Link href={`/glossary/${prev.slug}/`}>‹ {prev.term}</Link> : <span />}
          {next ? <Link href={`/glossary/${next.slug}/`}>{next.term} ›</Link> : <span />}
        </nav>
      </article>
    </PageShell>
  );
}
