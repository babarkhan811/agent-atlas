import type { Metadata } from "next";
import Link from "next/link";
import { lessonIndex, loadGlossary } from "@/content";
import { PageShell } from "@/components/PageShell";
import { absUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Glossary",
  alternates: { canonical: absUrl("/glossary/") },
  description: "Plain-English definitions of AI agent, automation and security terms: tokens, tool calling, RAG, MCP, SIEM, SOAR and more.",
};

export default function GlossaryPage() {
  return (
    <PageShell index={lessonIndex()}>
      <div className="crumbs"><Link href="/">Lessons</Link> / Glossary</div>
      <div className="lesson-head"><h1>Glossary</h1><p>The words you&apos;ll hit most often, in plain English.</p></div>
      <div className="gloss">
        {loadGlossary().map((t) => (
          <div key={t.slug} id={t.slug}><b>{t.term}</b><span>{t.definition}</span></div>
        ))}
      </div>
    </PageShell>
  );
}
