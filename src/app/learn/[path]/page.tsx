import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { lessonHref, lessonIndex, loadContent } from "@/content";
import { PageShell } from "@/components/PageShell";
import { Inline, Prose } from "@/components/Prose";
import { absUrl } from "@/lib/site";

type Params = { path: string };
export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return loadContent().paths.map((p) => ({ path: p.id }));
}

const find = (id: string) => loadContent().paths.find((p) => p.id === id);

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = find((await params).path);
  if (!p) return {};
  return { title: `${p.title} learning path`, description: p.description, alternates: { canonical: absUrl(`/learn/${p.id}/`) } };
}

export default async function PathPage({ params }: { params: Promise<Params> }) {
  const p = find((await params).path);
  if (!p) notFound();
  const lessons = loadContent().lessons.filter((l) => l.path === p.id);
  const minutes = lessons.reduce((n, l) => n + (l.article?.minutes ?? 10), 0);
  return (
    <PageShell index={lessonIndex()}>
      <div className="crumbs"><Link href="/learn/">Learn</Link> / {p.title}</div>
      <div className="lesson-head">
        <p className="eyebrow">Path {p.order} · {p.tier === "free" ? "Free" : "Pro"} · {lessons.length} lessons · ~{minutes} min</p>
        <h1>{p.title}</h1>
        <p><Inline text={p.description} /></p>
      </div>

      {(p.outcome || p.audience || p.build || p.prerequisites) && (
        <div className="art-grid path-facts">
          {p.outcome && <section className="card-3d"><h2>What you&apos;ll be able to do</h2><Prose text={p.outcome} /></section>}
          {p.audience && <section className="card-3d"><h2>Who it&apos;s for</h2><Prose text={p.audience} /></section>}
          {p.build && <section className="card-3d"><h2>What you&apos;ll build</h2><Prose text={p.build} /></section>}
          {p.prerequisites && <section className="card-3d"><h2>Before you start</h2><Prose text={p.prerequisites} /></section>}
        </div>
      )}
      {p.body && <section className="path-body"><Prose text={p.body} /></section>}

      <section aria-labelledby="lessons-h">
        <h2 id="lessons-h">Lessons in this path</h2>
        <ol className="path-lessons">
          {lessons.map((l) => (
            <li key={l.id}>
              <Link href={lessonHref(l)} className="card-3d path-lesson tilt">
                <span className="pl-n">{l.order}</span>
                <span className="pl-body">
                  <b>{l.title}</b>
                  <span>{l.article?.promise ?? l.summary}</span>
                  <em>{l.article ? `~${l.article.minutes} min · ${l.steps.length} steps · quiz${l.article.lab ? " · lab" : ""}` : `${l.steps.length} steps`}</em>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </PageShell>
  );
}
