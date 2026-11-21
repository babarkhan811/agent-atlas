import type { Metadata } from "next";
import Link from "next/link";
import { SitePage } from "@/components/SiteChrome";
import { absUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to report an error, suggest a lesson or get in touch with Agent Atlas.",
  alternates: { canonical: absUrl("/contact/") },
};

const REPO = "https://github.com/babarkhan811/agent-atlas";

export default function Contact() {
  return (
    <SitePage>
      <article className="legal">
        <h1>Contact</h1>
        <div className="art-cols">
          <section className="card-3d">
            <h2>Report an error</h2>
            <p>Found something wrong or out of date? Open an issue with the lesson name and step number. Corrections are made in public.</p>
            <a className="ctl primary" href={`${REPO}/issues/new?title=${encodeURIComponent("Error report: ")}`} rel="noopener noreferrer" target="_blank">Report on GitHub</a>
          </section>
          <section className="card-3d">
            <h2>Suggest a lesson</h2>
            <p>Want a topic covered, such as a protocol, a security workflow or a provider feature? Suggestions help decide what to build next.</p>
            <a className="ctl" href={`${REPO}/issues/new?title=${encodeURIComponent("Lesson idea: ")}`} rel="noopener noreferrer" target="_blank">Suggest on GitHub</a>
          </section>
        </div>
        <p className="muted">GitHub issues are public, so please don&apos;t include personal or confidential information. See how we make lessons on the <Link href="/about/">About page</Link>.</p>
      </article>
    </SitePage>
  );
}
