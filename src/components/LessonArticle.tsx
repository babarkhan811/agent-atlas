// The written lesson below the simulation. Server-rendered so every word is indexable.
import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import type { LessonIndexItem } from "@/content";
import type { GlossaryTerm, Lesson } from "@/content/schema";
import { KIND_INFO } from "@/sim/layout";
import { CodeTabs, Quiz, StepJump } from "./ArticleWidgets";
import { Inline, Prose, makeLinker } from "./Prose";

type Props = { lesson: Lesson; index: LessonIndexItem[]; glossary: GlossaryTerm[] };

function readLab(dir: string) {
  const read = (f: string) => fs.readFileSync(path.join(process.cwd(), dir, f), "utf8").trim();
  return [
    { label: "Python", name: `${dir}/lab.py`, code: read("lab.py"), run: "python lab.py · python -m unittest lab_test" },
    { label: "TypeScript", name: `${dir}/lab.ts`, code: read("lab.ts"), run: "node lab.ts · node --test lab.test.ts" },
  ];
}

const SECTIONS = [
  ["overview", "Overview"], ["walkthrough", "Step by step"], ["concepts", "Key concepts"], ["production", "What breaks in production"],
  ["try-it", "Try it"], ["quiz", "Check your understanding"], ["takeaways", "Key takeaways"], ["faq", "FAQ"], ["sources", "Sources"],
] as const;

export function LessonArticle({ lesson, index, glossary }: Props) {
  const a = lesson.article;
  if (!a) return null;
  const linker = makeLinker(glossary);
  const byId = new Map(index.map((l) => [l.id, l]));
  const lessonLinks = (ids: string[]) => ids.map((id) => byId.get(id)).filter((l): l is LessonIndexItem => !!l);
  const node = (id: string) => lesson.nodes.find((n) => n.id === id)!;

  return (
    <article className="article" aria-labelledby="article-title">
      <header className="art-hero" id="overview">
        <p className="eyebrow">Lesson guide · {a.minutes} min read · Last verified {lesson.lastVerified}</p>
        <h2 id="article-title">{lesson.title}</h2>
        <p className="art-promise"><Inline text={a.promise} /></p>
        <nav className="art-toc" aria-label="On this page">
          {SECTIONS.filter(([id]) => id !== "try-it" || a.lab).map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </nav>

        <div className="art-grid">
          <section className="card-3d tldr" aria-labelledby="tldr">
            <h3 id="tldr">The 30-second version</h3>
            <ul>{a.thirtySeconds.map((t, i) => <li key={i}><Inline text={t} linker={linker} /></li>)}</ul>
          </section>
          <section className="card-3d" aria-labelledby="why">
            <h3 id="why">Why it matters</h3>
            <Prose text={a.whyItMatters} linker={linker} />
          </section>
          <section className="card-3d" aria-labelledby="analogy">
            <h3 id="analogy">An everyday analogy</h3>
            <Prose text={a.analogy} linker={linker} />
          </section>
          <section className="card-3d" aria-labelledby="objectives">
            <h3 id="objectives">You will be able to</h3>
            <ol>{lesson.objectives.map((o, i) => <li key={i}><Inline text={o} linker={linker} /></li>)}</ol>
          </section>
        </div>

        <dl className="art-facts">
          <div><dt>Who it&apos;s for</dt><dd><Inline text={a.audience} /></dd></div>
          <div><dt>Time</dt><dd>About {a.minutes} minutes</dd></div>
          <div><dt>Before this</dt><dd>
            {a.prerequisites.length === 0 ? "No prerequisites"
              : lessonLinks(a.prerequisites).map((l, i) => <span key={l.id}>{i > 0 && " · "}<Link href={l.href}>{l.title}</Link></span>)}
          </dd></div>
          <div><dt>Access</dt><dd>{lesson.tier === "free" ? "Free lesson" : "Pro lesson"}</dd></div>
        </dl>
      </header>

      <section id="walkthrough" aria-labelledby="walkthrough-h">
        <h2 id="walkthrough-h">Step by step</h2>
        <p className="art-lede">Each step below matches one message in the simulation. Use the button to replay it above.</p>
        {lesson.steps.map((s, i) => (
          <section key={i} className="walk" id={`step-${i + 1}`} aria-labelledby={`step-${i + 1}-h`}>
            <div className="walk-head">
              <span className="walk-n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 id={`step-${i + 1}-h`}><span className="sr-only">Step {i + 1}: </span>{s.title}</h3>
                <p className="walk-route">
                  <span style={{ color: `var(--k-${node(s.from).kind})` }}>{node(s.from).label}</span> → <span style={{ color: `var(--k-${node(s.to).kind})` }}>{node(s.to).label}</span>
                  {" · "}<code>{s.label}</code> · {KIND_INFO[node(s.to).kind].tag}
                </p>
              </div>
            </div>
            {s.depth && s.walk ? (
              <div className="walk-body">
                <h4>What happens</h4>
                <Prose text={s.depth.practitioner} linker={linker} />
                <div className="walk-cols">
                  <div><h4>Why it works this way</h4><Prose text={s.walk.why} linker={linker} /></div>
                  <div><h4>What can go wrong</h4><Prose text={s.walk.wrong} linker={linker} /></div>
                  <div><h4>Real-world example</h4><Prose text={s.walk.example} linker={linker} /></div>
                </div>
              </div>
            ) : <Prose text={s.text} linker={linker} />}
            <StepJump step={i} />
          </section>
        ))}
      </section>

      <section id="concepts" aria-labelledby="concepts-h">
        <h2 id="concepts-h">Key concepts</h2>
        <div className="art-cols">
          {a.deepDives.map((d) => (
            <section key={d.title} className="card-3d"><h3>{d.title}</h3><Prose text={d.body} linker={linker} /></section>
          ))}
        </div>
      </section>

      <section id="production" aria-labelledby="production-h">
        <h2 id="production-h">What breaks in production</h2>
        <div className="art-cols">
          {a.production.map((p) => (
            <section key={p.title} className="card-3d warn"><h3>{p.title}</h3><Prose text={p.body} linker={linker} /></section>
          ))}
        </div>
      </section>

      {a.lab && (
        <section id="try-it" aria-labelledby="try-h">
          <h2 id="try-h">Try it: {a.lab.title}</h2>
          <Prose text={a.lab.intro} linker={linker} />
          <CodeTabs files={readLab(a.lab.dir)} />
        </section>
      )}

      {lesson.quiz && (
        <section id="quiz" aria-labelledby="quiz-h">
          <h2 id="quiz-h">Check your understanding</h2>
          <Quiz questions={lesson.quiz} />
        </section>
      )}

      <section id="takeaways" aria-labelledby="takeaways-h">
        <h2 id="takeaways-h">Key takeaways</h2>
        <ul className="takeaways">{a.takeaways.map((t, i) => <li key={i}><Inline text={t} /></li>)}</ul>
      </section>

      <section id="faq" aria-labelledby="faq-h">
        <h2 id="faq-h">FAQ</h2>
        {a.faq.map((f) => (
          <details key={f.q} className="faq">
            <summary>{f.q}</summary>
            <Prose text={f.a} />
          </details>
        ))}
      </section>

      {a.related.length > 0 && (
        <section id="related" aria-labelledby="related-h">
          <h2 id="related-h">Related lessons</h2>
          <div className="related">
            {lessonLinks(a.related).map((l) => (
              <Link key={l.id} className="card-3d related-card" href={l.href}><b>{l.title}</b><span>{l.summary}</span></Link>
            ))}
          </div>
        </section>
      )}

      <section id="sources" aria-labelledby="sources-h">
        <h2 id="sources-h">Sources</h2>
        <ul className="sources">
          {lesson.sources.map((s) => <li key={s.url}><a href={s.url} rel="noopener noreferrer" target="_blank">{s.title}</a></li>)}
        </ul>
        <p className="art-meta">
          Last verified against these sources on <time dateTime={lesson.lastVerified}>{lesson.lastVerified}</time>.
          Timings and sizes in the simulation are illustrative. Spotted an error?{" "}
          <a href={`https://github.com/babarkhan811/agent-atlas/issues/new?title=${encodeURIComponent(`Error in lesson: ${lesson.title}`)}`} rel="noopener noreferrer" target="_blank">Report it on GitHub</a>.
        </p>
      </section>
    </article>
  );
}
