// Renders lesson prose: paragraphs separated by a blank line, `code` in backticks.
// With a linker, the first use of each glossary term on the page links to its
// definition and shows it as a hover card. Works in server and client components.
import Link from "next/link";
import type { ReactNode } from "react";
import type { GlossaryTerm } from "@/content/schema";

export type GlossaryLinker = { terms: (GlossaryTerm & { re: RegExp })[]; used: Set<string> };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function makeLinker(terms: GlossaryTerm[]): GlossaryLinker {
  return {
    // Longest terms first so "Context window" wins over a shorter overlapping term.
    terms: [...terms].sort((a, b) => b.term.length - a.term.length)
      .map((t) => ({ ...t, re: new RegExp(`(?<![\\w-])${escapeRe(t.term)}(?![\\w-])`, "i") })),
    used: new Set(),
  };
}

function linkTerms(text: string, linker: GlossaryLinker | undefined, key: string): ReactNode[] {
  if (!linker) return [text];
  const out: ReactNode[] = [];
  let rest = text, n = 0;
  for (;;) {
    let best: { t: GlossaryLinker["terms"][number]; index: number; length: number } | null = null;
    for (const t of linker.terms) {
      if (linker.used.has(t.slug)) continue;
      const m = t.re.exec(rest);
      if (m && (!best || m.index < best.index)) best = { t, index: m.index, length: m[0].length };
    }
    if (!best) break;
    linker.used.add(best.t.slug);
    out.push(rest.slice(0, best.index));
    out.push(
      <Link key={`${key}-g${n++}`} className="gl" href={`/glossary/#${best.t.slug}`} data-def={best.t.definition}>
        {rest.slice(best.index, best.index + best.length)}
      </Link>,
    );
    rest = rest.slice(best.index + best.length);
  }
  out.push(rest);
  return out;
}

/** Inline text: `code` becomes <code>, **bold** becomes <b>, other text gets glossary links. */
export function Inline({ text, linker }: { text: string; linker?: GlossaryLinker }) {
  return (
    <>
      {text.split("`").map((part, i) =>
        i % 2 ? <code key={i}>{part}</code> : (
          <span key={i}>
            {part.split("**").map((seg, j) => (j % 2 ? <b key={j}>{linkTerms(seg, linker, `${i}-${j}`)}</b> : <span key={j}>{linkTerms(seg, linker, `${i}-${j}`)}</span>))}
          </span>
        ))}
    </>
  );
}

/** Block text: one <p> per paragraph. */
export function Prose({ text, linker, className }: { text: string; linker?: GlossaryLinker; className?: string }) {
  return (
    <>
      {text.split(/\n\s*\n/).map((para, i) => (
        <p key={i} className={className}><Inline text={para} linker={linker} /></p>
      ))}
    </>
  );
}
