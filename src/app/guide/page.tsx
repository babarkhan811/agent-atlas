import type { Metadata } from "next";
import Link from "next/link";
import { lessonIndex } from "@/content";
import { PageShell } from "@/components/PageShell";
import { GUIDE_SECTIONS } from "@/components/guide/sections";
import { absUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Build guide: automate cybersecurity with software agents and AI",
  description: "A practical guide to automating security operations with software agents and AI agents: automation ladder, architecture, tools, tested reference code and safeguards.",
  alternates: { canonical: absUrl("/guide/") },
};

export default function GuidePage() {
  return (
    <PageShell index={lessonIndex()}>
      <div className="crumbs"><Link href="/learn/">Learn</Link> / Build guide</div>
      <div className="lesson-head">
        <h1>How to automate cybersecurity with software agents and AI</h1>
        <p>A practical guide in {GUIDE_SECTIONS.length} parts: what to build, which tools to use, and how to keep it safe. It is the capstone of the AI for Security Teams path.</p>
      </div>
      <ol className="guide-index">
        {GUIDE_SECTIONS.map((s, i) => (
          <li key={s.slug}>
            <Link className="card-3d guide-card" href={`/guide/${s.slug}/`}>
              <span className="pl-n">{i + 1}</span>
              <span className="pl-body"><b>{s.title}</b><span>{s.summary}</span></span>
            </Link>
          </li>
        ))}
      </ol>
    </PageShell>
  );
}
