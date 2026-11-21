import type { Metadata } from "next";
import Link from "next/link";
import { SitePage } from "@/components/SiteChrome";
import { absUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What data Agent Atlas collects (very little), why, and your choices.",
  alternates: { canonical: absUrl("/privacy/") },
};

export default function Privacy() {
  return (
    <SitePage>
      <article className="legal">
        <h1>Privacy Policy</h1>
        <p className="muted">Last updated: 21 November 2026</p>

        <h2>The short version</h2>
        <p>Agent Atlas has no accounts, no advertising, no analytics and no tracking cookies. You can use every lesson without telling us who you are.</p>

        <h2>What is stored on your device</h2>
        <p>Your browser&apos;s local storage remembers your light or dark theme choice. It never leaves your device, and you can clear it at any time in your browser settings. We do not set cookies.</p>

        <h2>What our hosting providers see</h2>
        <p>Like every website, our pages are delivered by hosting providers: <a href="https://vercel.com/legal/privacy-policy" rel="noopener noreferrer" target="_blank">Vercel</a> and <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" rel="noopener noreferrer" target="_blank">GitHub Pages</a>. When you load a page, they receive technical information such as your IP address, browser type and the page requested, which they may keep in server logs for security and reliability under their own privacy policies. We do not use these logs to identify or profile visitors.</p>

        <h2>Fonts and third parties</h2>
        <p>Fonts are served from our own site, so loading a page does not contact Google Fonts or other third-party services. Links to external documentation open those sites, which have their own policies.</p>

        <h2>If you contact us or report an error</h2>
        <p>Error reports are made through GitHub issues, which are public and governed by GitHub&apos;s privacy statement. Do not include personal or confidential information in an issue.</p>

        <h2>Changes</h2>
        <p>When we add features such as accounts, payments, analytics or a newsletter, we will update this policy before they go live and describe exactly what is collected, why, and how long it is kept.</p>

        <h2>Contact</h2>
        <p>Questions about privacy: see the <Link href="/contact/">contact page</Link>.</p>
      </article>
    </SitePage>
  );
}
