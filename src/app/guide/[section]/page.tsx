import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { lessonIndex } from "@/content";
import { PageShell } from "@/components/PageShell";
import { GUIDE_SECTIONS } from "@/components/guide/sections";
import { absUrl } from "@/lib/site";

type Params = { section: string };
export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return GUIDE_SECTIONS.map((s) => ({ section: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { section } = await params;
  const s = GUIDE_SECTIONS.find((x) => x.slug === section);
  if (!s) return {};
  return { title: `${s.title} · Build guide`, description: s.summary, alternates: { canonical: absUrl(`/guide/${s.slug}/`) } };
}

export default async function GuideSectionPage({ params }: { params: Promise<Params> }) {
  const { section } = await params;
  const i = GUIDE_SECTIONS.findIndex((x) => x.slug === section);
  if (i < 0) notFound();
  const s = GUIDE_SECTIONS[i]!, prev = GUIDE_SECTIONS[i - 1], next = GUIDE_SECTIONS[i + 1];
  return (
    <PageShell index={lessonIndex()}>
      <div className="crumbs"><Link href="/learn/">Learn</Link> / <Link href="/guide/">Build guide</Link> / {s.title}</div>
      <div className="guide">
        <nav className="toc" aria-label="Build guide parts">
          {GUIDE_SECTIONS.map((x, k) => (
            <Link key={x.slug} href={`/guide/${x.slug}/`} aria-current={k === i ? "page" : undefined}>{k + 1}. {x.title}</Link>
          ))}
        </nav>
        <article className="guide-body">
          <section id={s.slug}>
            <p className="eyebrow">Build guide · part {i + 1} of {GUIDE_SECTIONS.length}</p>
            <h1 className="guide-h1">{s.title}</h1>
            <p className="guide-summary">{s.summary}</p>
            {s.body()}
          </section>
          <nav className="pager" aria-label="Previous and next part">
            {prev ? <Link href={`/guide/${prev.slug}/`}>‹ {prev.title}</Link> : <Link href="/guide/">‹ Guide overview</Link>}
            {next ? <Link href={`/guide/${next.slug}/`}>{next.title} ›</Link> : <Link href="/learn/security/">Security path ›</Link>}
          </nav>
        </article>
      </div>
    </PageShell>
  );
}
