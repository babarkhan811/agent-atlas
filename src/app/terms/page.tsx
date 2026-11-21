import type { Metadata } from "next";
import Link from "next/link";
import { SitePage } from "@/components/SiteChrome";
import { absUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms for using Agent Atlas lessons, simulations and labs.",
  alternates: { canonical: absUrl("/terms/") },
};

export default function Terms() {
  return (
    <SitePage>
      <article className="legal">
        <h1>Terms of Use</h1>
        <p className="muted">Last updated: 21 November 2026</p>

        <h2>Using Agent Atlas</h2>
        <p>Agent Atlas provides educational lessons, interactive simulations, quizzes and code labs about AI agents and security automation. You may use the site for personal learning and for teaching others, free of charge, during the current launch period.</p>

        <h2>Educational content, not professional advice</h2>
        <p>Lessons explain concepts and common practice. They are not legal, security, compliance or professional advice for your specific situation. Simulated messages, timings, prices and sizes are illustrative. Technology changes quickly: check the sources and &quot;last verified&quot; date on each lesson, and test anything in your own environment before relying on it.</p>

        <h2>Lab code</h2>
        <p>Lab code is provided as learning material, as is, without warranty of any kind. You are responsible for reviewing and testing any code before using it, and for complying with the terms of any AI provider or service you connect it to.</p>

        <h2>Security content</h2>
        <p>Security lessons are for defending systems you own or are authorised to protect. Do not use the material to access, test or disrupt systems without permission.</p>

        <h2>Acceptable use</h2>
        <p>Do not attempt to disrupt the site, scrape it in a way that degrades service for others, or misrepresent the content as your own.</p>

        <h2>Content ownership</h2>
        <p>Lesson text, simulations and design are owned by the creator of Agent Atlas. You may quote short excerpts with a link back to the lesson.</p>

        <h2>Liability</h2>
        <p>To the extent permitted by law, Agent Atlas is provided without warranties, and we are not liable for losses arising from use of the site or its content.</p>

        <h2>Paid plans</h2>
        <p>Paid plans are not available yet. Separate terms, including refunds and cancellation, will be published before anything can be purchased.</p>

        <h2>Changes and contact</h2>
        <p>We may update these terms and will change the date above when we do. Questions: see the <Link href="/contact/">contact page</Link>.</p>
      </article>
    </SitePage>
  );
}
