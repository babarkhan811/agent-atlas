// Header and footer for pages outside the lesson workspace (landing, legal, contact).
import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";

const REPO = "https://github.com/babarkhan811/agent-atlas";
export const CYBERSOLUTION_URL = "https://cybersolution-sand.vercel.app";

export function SiteHeader() {
  return (
    <header className="site-top">
      <Link className="brand" href="/">
        <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
          <path d="M24 3l18 10.5v21L24 45 6 34.5v-21z" fill="none" stroke="var(--accent)" strokeWidth="2" />
          <path d="M24 3v21m0 0l18-10.5M24 24L6 13.5M24 24v21" stroke="var(--line-2)" strokeWidth="1.4" />
          <circle cx="24" cy="24" r="5" fill="var(--accent-2)" />
        </svg>
        <span className="brand-text"><b>AGENT ATLAS</b><small>SEE HOW AI AGENTS WORK</small></span>
      </Link>
      <nav className="site-nav" aria-label="Main">
        <Link href="/learn/">Curriculum</Link>
        <Link href="/guide/">Build guide</Link>
        <Link href="/glossary/">Glossary</Link>
        <Link href="/about/">About</Link>
      </nav>
      <div className="site-actions">
        <ThemeToggle />
        <Link className="ctl primary" href="/learn/foundations/llm-call/">Start free</Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <div>
        <b>Agent Atlas</b>
        <p>Interactive simulations of how AI agents work, message by message.</p>
        <p className="sister">From the same team: <a href={CYBERSOLUTION_URL} rel="noopener" target="_blank">Cybersolution</a>, cybersecurity services and training.</p>
      </div>
      <nav aria-label="Footer">
        <Link href="/learn/">Curriculum</Link>
        <Link href="/guide/">Build guide</Link>
        <Link href="/glossary/">Glossary</Link>
        <Link href="/about/">About &amp; accuracy</Link>
        <Link href="/contact/">Contact</Link>
        <Link href="/privacy/">Privacy</Link>
        <Link href="/terms/">Terms</Link>
        <a href={REPO} rel="noopener noreferrer" target="_blank">GitHub</a>
      </nav>
    </footer>
  );
}

export function SitePage({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="site-main">{children}</main>
      <SiteFooter />
    </>
  );
}
