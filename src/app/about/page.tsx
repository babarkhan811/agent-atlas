import type { Metadata } from "next";
import Link from "next/link";
import { lessonIndex } from "@/content";
import { PageShell } from "@/components/PageShell";
import { absUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "About, how we make lessons, and our accuracy policy",
  description: "Who makes Agent Atlas, how each lesson is researched and checked against official sources, and how to report an error.",
  alternates: { canonical: absUrl("/about/") },
};

const REPO = "https://github.com/babarkhan811/agent-atlas";

export default function About() {
  return (
    <PageShell index={lessonIndex()}>
      <div className="crumbs"><Link href="/">Home</Link> / About</div>
      <article className="prose-page">
        <div className="lesson-head">
          <h1>About Agent Atlas</h1>
          <p>Interactive, message-by-message simulations of how AI agents work, written for people who build, buy or secure them.</p>
        </div>

        <section id="who">
          <h2>Who makes it</h2>
          <p>Agent Atlas is created by Babar Yousaf. The source code and every lesson file are public on <a href={REPO} rel="noopener noreferrer" target="_blank">GitHub</a>, so you can see exactly what changed and when.</p>
        </section>

        <section id="how">
          <h2>How we make lessons</h2>
          <ol>
            <li><b>Start from the wire.</b> Each lesson follows real messages between real components: requests, tool calls, protocol frames, alerts. Field names come from official documentation or specifications.</li>
            <li><b>Explain at three depths.</b> Beginner narration in plain English, Practitioner detail with every field annotated, and Expert notes on edge cases and provider differences.</li>
            <li><b>Verify, then write.</b> Every technical claim is checked against official sources, which are listed at the bottom of each lesson with the date they were last verified.</li>
            <li><b>Make it runnable.</b> Labs are small, dependency-free Python and TypeScript programs with tests that run in our CI on every change.</li>
            <li><b>Test the page.</b> Automated accessibility checks, browser tests and layout checks at laptop and phone sizes run before anything is published.</li>
          </ol>
          <p>Lessons are drafted with AI assistance and then checked against the sources listed on each page. If a claim cannot be verified, it is left out or clearly labelled.</p>
        </section>

        <section id="accuracy">
          <h2>Accuracy and editorial policy</h2>
          <ul>
            <li><b>Sources first.</b> We prefer specifications, official API documentation and standards bodies (for example NIST, MITRE, IETF) over blogs.</li>
            <li><b>Dates matter.</b> AI APIs and protocols change quickly. Every lesson shows a &quot;last verified&quot; date, and our build warns us when a lesson has not been re-checked for 90 days.</li>
            <li><b>Simulations are illustrative.</b> Timings, token counts, sizes and example data in the simulations are realistic examples, not measurements of live systems, and are labelled as such.</li>
            <li><b>Provider-neutral.</b> When companies format the same idea differently, we show the differences instead of presenting one vendor&apos;s format as the standard.</li>
            <li><b>No paid placement.</b> No company pays to be mentioned in a lesson. If that ever changes, it will be clearly labelled.</li>
            <li><b>Security content is defensive.</b> Security lessons teach detection, investigation and safe automation, using documentation-reserved IP addresses and example domains.</li>
          </ul>
        </section>

        <section id="cybersolution">
          <h2>Cybersecurity services: Cybersolution</h2>
          <p>Agent Atlas is made by the team behind <a href="https://cybersolution-sand.vercel.app" rel="noopener" target="_blank">Cybersolution</a>, which offers cybersecurity services, a threat dashboard and security training. The AI for Security Teams path here teaches the same kind of automation that Cybersolution applies in practice.</p>
        </section>

        <section id="corrections">
          <h2>Report an error</h2>
          <p>Found something wrong or out of date? <a href={`${REPO}/issues/new`} rel="noopener noreferrer" target="_blank">Open an issue on GitHub</a> with the lesson name and step number. Corrections are made in public, and the full change history is in the <a href={`${REPO}/commits/main`} rel="noopener noreferrer" target="_blank">update log</a>.</p>
        </section>
      </article>
    </PageShell>
  );
}
