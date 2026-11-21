import type { Metadata } from "next";
import Link from "next/link";
import { lessonHref, lessonIndex, loadContent, loadGlossary } from "@/content";
import { HashRedirect } from "@/components/HashRedirect";
import { SitePage } from "@/components/SiteChrome";
import { SamplePreview } from "@/components/landing/SamplePreview";
import { StackHero } from "@/components/landing/StackHero";
import { PRICING } from "@/config/pricing";
import { absUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Agent Atlas · See how AI agents work, one message at a time" },
  description: "Free interactive simulations of how AI agents work: LLM calls, tools, RAG, MCP, A2A, multi-agent systems and AI for security teams, with every message decoded.",
  alternates: { canonical: absUrl("/") },
};

const FAQ = [
  ["Is Agent Atlas free?", "Yes. During the launch every lesson, lab, quiz and the build guide are free, with no sign-up. Pro and Team plans with extras such as certificates and team dashboards are planned; free lessons will stay free."],
  ["Do I need to know how to code?", "No. Every lesson has a plain-English Beginner explanation and an interactive simulation. Developers can switch to Practitioner or Expert depth and run the Python and TypeScript labs."],
  ["Which AI providers does it cover?", "The concepts are provider-neutral. Where companies format messages differently, lessons compare Anthropic, OpenAI and Google formats side by side instead of presenting one as the standard."],
  ["How accurate and current is it?", "Every lesson lists its sources (official documentation, specifications and standards) and the date it was last verified. Our build warns us when a lesson has not been re-checked for 90 days."],
  ["Is the security content safe to use?", "Yes. Security lessons are defensive: detection, investigation and safe automation with human approval for disruptive actions. Examples use documentation-reserved IP addresses and domains."],
] as const;

export default function Home() {
  const { paths, lessons } = loadContent();
  const index = lessonIndex();
  const legacy = Object.fromEntries(index.map((l) => [l.id, l.href]));
  const sample = lessons.find((l) => l.id === "tool-use")!;
  const hours = Math.round(lessons.reduce((n, l) => n + (l.article?.minutes ?? 10), 0) / 60);
  const labs = lessons.filter((l) => l.article?.lab).length;
  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: "Agent Atlas", url: absUrl("/") },
      {
        "@type": "Course", name: "Agent Atlas: how AI agents work", url: absUrl("/learn/"),
        description: "Interactive lessons on LLM calls, tool use, agents, protocols, reliability and AI for security teams.",
        provider: { "@type": "Organization", name: "Agent Atlas", sameAs: "https://github.com/babarkhan811/agent-atlas" },
        isAccessibleForFree: true, inLanguage: "en",
        hasCourseInstance: { "@type": "CourseInstance", courseMode: "online", courseWorkload: `PT${hours}H` },
      },
      { "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
    ],
  }).replace(/</g, "\\u003c");

  return (
    <SitePage>
      <HashRedirect routes={legacy} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Interactive · Free · No sign-up</p>
          <h1>See how AI agents really work, one message at a time.</h1>
          <p className="hero-sub">
            Watch requests, tool calls and protocol messages move between models, apps and tools in live simulations.
            Every message is decoded field by field, in plain English first and technical detail when you want it.
          </p>
          <div className="hero-ctas">
            <Link className="ctl primary big" href={lessonHref(lessons.find((l) => l.id === "llm-call")!)}>Start the free lesson →</Link>
            <Link className="ctl big" href="/learn/">Browse the curriculum</Link>
          </div>
          <ul className="hero-facts">
            <li><b>{lessons.length}</b> interactive lessons</li>
            <li><b>{labs}</b> runnable labs</li>
            <li><b>{loadGlossary().length}</b> glossary terms</li>
            <li><b>~{hours} h</b> of learning</li>
          </ul>
        </div>
        <StackHero />
      </section>

      <section className="land-section" aria-labelledby="preview-h">
        <h2 id="preview-h">This is what a lesson looks like</h2>
        <p className="land-lede">A real simulation from the course, playing on its own. Hover to pause, or open it to step through, switch depth and read the full guide.</p>
        <SamplePreview lesson={sample} href={lessonHref(sample)} />
      </section>

      <section className="land-section" aria-labelledby="how-h">
        <h2 id="how-h">How it works</h2>
        <ol className="how">
          <li className="card-3d"><span className="how-n">1</span><h3>Watch the messages</h3><p>Each lesson animates the real conversation between parts of a system: your app, the model, tools, protocols and people.</p></li>
          <li className="card-3d"><span className="how-n">2</span><h3>Read it at your depth</h3><p>Beginner narration in plain English, Practitioner detail with every field annotated, and Expert notes on edge cases and provider differences.</p></li>
          <li className="card-3d"><span className="how-n">3</span><h3>Try it yourself</h3><p>Predict what happens next, take the quiz, and run small labs in Python or TypeScript that work offline, without an API key.</p></li>
        </ol>
      </section>

      <section className="land-section" aria-labelledby="paths-h">
        <h2 id="paths-h">Four learning paths</h2>
        <div className="path-cards">
          {paths.map((p) => {
            const items = lessons.filter((l) => l.path === p.id);
            return (
              <Link key={p.id} href={`/learn/${p.id}/`} className="card-3d path-card tilt">
                <span className="tier free">Free during launch</span>
                <b>{p.order}. {p.title}</b>
                <span>{p.description}</span>
                <em>{items.length} lessons · ~{items.reduce((n, l) => n + (l.article?.minutes ?? 10), 0)} min</em>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="land-section" aria-labelledby="who-h">
        <h2 id="who-h">Who it&apos;s for</h2>
        <div className="art-cols">
          <div className="card-3d"><h3>Builders</h3><p>Developers and tech leads adding AI features or agents, who need to know what is on the wire, what it costs and where it breaks.</p></div>
          <div className="card-3d"><h3>Security teams</h3><p>SOC analysts and security engineers automating triage, phishing, response and remediation with AI agents, safely.</p></div>
          <div className="card-3d"><h3>Product &amp; risk owners</h3><p>People who decide what an AI system may do, and need to reason about permissions, approvals, cost and failure modes.</p></div>
        </div>
      </section>

      <section className="land-section" aria-labelledby="pricing-h">
        <h2 id="pricing-h">Pricing</h2>
        <p className="land-lede">Everything is free while we launch. Paid plans are planned for extras; nothing can be bought yet.</p>
        <div className="plans">
          <div className="card-3d plan on">
            <h3>{PRICING.free.name}</h3>
            <p className="price">$0</p>
            <p>Every lesson, lab, quiz and the build guide during launch. Foundations stays free for good.</p>
            <Link className="ctl primary" href="/learn/foundations/llm-call/">Start learning</Link>
          </div>
          <div className="card-3d plan">
            <h3>{PRICING.pro.name} <span className="soon">Coming soon</span></h3>
            <p className="price">${PRICING.pro.monthly}<small>/month</small> <span className="muted">or ${PRICING.pro.yearly}/year</span></p>
            <p>All paths, certificates of completion, progress sync and downloadable lab repositories.</p>
          </div>
          <div className="card-3d plan">
            <h3>{PRICING.team.name} <span className="soon">Coming soon</span></h3>
            <p className="price">${PRICING.team.perSeatMonthly}<small>/seat/month</small></p>
            <p>For security and engineering teams: {PRICING.team.minSeats}-seat minimum, team progress dashboard and invoicing.</p>
          </div>
        </div>
        <p className="muted small">Planned prices, in US dollars, may change before launch.</p>
      </section>

      <section className="land-section" aria-labelledby="faq-h">
        <h2 id="faq-h">Frequently asked questions</h2>
        {FAQ.map(([q, a]) => (
          <details key={q} className="faq"><summary>{q}</summary><p>{a}</p></details>
        ))}
      </section>

      <section className="land-section land-final">
        <h2>Start with one message</h2>
        <p className="land-lede">The first lesson takes about 12 minutes and needs no account.</p>
        <Link className="ctl primary big" href="/learn/foundations/llm-call/">Start the free lesson →</Link>
      </section>
    </SitePage>
  );
}
