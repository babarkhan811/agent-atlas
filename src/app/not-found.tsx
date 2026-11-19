import type { Metadata } from "next";
import Link from "next/link";
import { lessonIndex } from "@/content";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

export default function NotFound() {
  return (
    <PageShell index={lessonIndex()}>
      <div className="crumbs"><Link href="/">Lessons</Link> / Not found</div>
      <div className="lesson-head">
        <h1>Page not found</h1>
        <p>That lesson or page doesn&apos;t exist. It may have moved when lessons were grouped into learning paths.</p>
      </div>
      <p><Link className="cta-link" href="/">Go to the first lesson →</Link></p>
    </PageShell>
  );
}
