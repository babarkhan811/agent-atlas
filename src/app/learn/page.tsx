import type { Metadata } from "next";
import Link from "next/link";
import { lessonHref, lessonIndex, loadContent } from "@/content";
import { PageShell } from "@/components/PageShell";
import { CATS } from "@/lib/cats";
import { ALL_LESSONS_FREE } from "@/config/pricing";
import { absUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Learn: the curriculum map",
  description: "Four learning paths from your first LLM call to AI-driven security operations, with interactive simulations, labs and quizzes.",
  alternates: { canonical: absUrl("/learn/") },
};

export default function LearnHub() {
  const { paths, lessons } = loadContent();
  const total = lessons.reduce((n, l) => n + (l.article?.minutes ?? 10), 0);
  return (
    <PageShell index={lessonIndex()}>
      <div className="crumbs"><Link href="/">Home</Link> / Learn</div>
      <div className="lesson-head">
        <h1>The curriculum map</h1>
        <p>{lessons.length} interactive lessons in {paths.length} paths, about {Math.round(total / 60)} hours in total. Start with Foundations; it is free.</p>
      </div>

      <section aria-labelledby="stack-h" className="stack-map">
        <h2 id="stack-h">The agent stack</h2>
        <p className="muted">Every lesson sits on one layer of the stack. Lower layers are building blocks for the ones above.</p>
        <ol className="stack-slabs">
          {[...CATS].reverse().map(([cat, , layer]) => {
            const items = lessons.filter((l) => l.category === cat);
            const k = CATS.findIndex((c) => c[0] === cat) + 1;
            return (
              <li key={cat} className="slab">
                <span className="slab-n">{k}</span>
                <span className="slab-name">{layer}</span>
                <span className="slab-lessons">
                  {items.map((l) => <Link key={l.id} href={lessonHref(l)}>{l.title}</Link>)}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="paths-h">
        <h2 id="paths-h">Learning paths</h2>
        <div className="path-cards">
          {paths.map((p) => {
            const items = lessons.filter((l) => l.path === p.id);
            const minutes = items.reduce((n, l) => n + (l.article?.minutes ?? 10), 0);
            return (
              <Link key={p.id} href={`/learn/${p.id}/`} className="card-3d path-card tilt">
                <span className={`tier ${p.tier === "free" || ALL_LESSONS_FREE ? "free" : "pro"}`}>{p.tier === "free" ? "Free" : ALL_LESSONS_FREE ? "Free during launch" : "Pro"}</span>
                <b>{p.order}. {p.title}</b>
                <span>{p.description}</span>
                <em>{items.length} lessons · ~{minutes} min</em>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="start-h">
        <h2 id="start-h">Where to start</h2>
        <ul className="starts">
          <li><b>New to AI agents:</b> <Link href={lessonHref(lessons.find((l) => l.id === "llm-call")!)}>What happens when you prompt an LLM</Link></li>
          <li><b>Building an agent:</b> <Link href={lessonHref(lessons.find((l) => l.id === "agent-loop")!)}>The agent loop</Link></li>
          <li><b>On a security team:</b> <Link href={lessonHref(lessons.find((l) => l.id === "software-plus-ai-agents")!)}>Software agents + AI agents working together</Link></li>
        </ul>
      </section>
    </PageShell>
  );
}
