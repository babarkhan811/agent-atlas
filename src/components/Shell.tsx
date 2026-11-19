"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LessonIndexItem } from "@/content";
import { BASE_PATH } from "@/lib/site";
import { searchLessons, searchTerms, type LessonHit, type SearchIndex } from "@/lib/search";
import { ThemeToggle } from "./ThemeToggle";

// [category, short tab name, stack-layer name]
export const CATS = [
  ["Foundations", "Basics", "Model"],
  ["Knowledge", "Knowledge", "Context"],
  ["Protocols", "Protocols", "Protocols"],
  ["Agents", "Agents", "Agents"],
  ["Automation", "Automation", "Automation"],
  ["Cybersecurity automation", "Security", "Security"],
  ["Safety", "Safety", "Safety"],
  ["Production", "Ops", "Ops"],
] as const;
export const catInfo = (c: string) => CATS.find((x) => x[0] === c) ?? CATS[0];

type Props = {
  index: LessonIndexItem[];
  active?: { id: string; category: string; stepTitles: string[] };
  step?: number;
  onStep?: (i: number) => void;
  pageMode?: boolean;
  children: ReactNode;
};

function useSearchIndex(enabled: boolean) {
  const [idx, setIdx] = useState<SearchIndex | null>(null);
  useEffect(() => {
    if (!enabled || idx) return;
    let live = true;
    fetch(`${BASE_PATH}/search-index.json`).then((r) => r.json()).then((d) => live && setIdx(d)).catch(() => {});
    return () => { live = false; };
  }, [enabled, idx]);
  return idx;
}

export function Shell({ index, active, step = 0, onStep, pageMode = false, children }: Props) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [drawer, setDrawer] = useState(false);
  const [mac, setMac] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const activeLink = useRef<HTMLAnchorElement>(null);
  const needle = q.trim();
  const idx = useSearchIndex(needle.length > 0);

  useEffect(() => { setMac(/Mac|iPhone|iPad/.test(navigator.platform)); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setDrawer(true);
        search.current?.focus();
      } else if (e.key === "Escape") setDrawer(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  // Scroll only the lesson list (never the page) so the active lesson is visible.
  useEffect(() => {
    const link = activeLink.current, list = link?.closest(".list");
    if (!link || !list) return;
    const top = link.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
    if (top < list.scrollTop || top + link.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = Math.max(0, top - list.clientHeight / 3);
  }, [active?.id, filter]);

  // Until the full-text index arrives, fall back to titles and summaries.
  const hits = new Map<string, LessonHit>(
    !needle ? index.map((l) => [l.id, { id: l.id, step: null }])
      : idx ? searchLessons(idx, needle).map((h) => [h.id, h])
      : index.filter((l) => `${l.title} ${l.summary} ${l.category}`.toLowerCase().includes(needle.toLowerCase()))
          .map((l) => [l.id, { id: l.id, step: null }]),
  );
  const terms = needle && idx ? searchTerms(idx, needle) : [];
  const items = index.filter((l) => hits.has(l.id) && (filter === "All" || l.category === filter));
  const ordered = CATS.flatMap(([c]) => items.filter((l) => l.category === c));
  const tabs: [string, string, number][] = [
    ["All", "All", index.length],
    ...CATS.map(([c, short]) => [c, short, index.filter((l) => l.category === c).length] as [string, string, number]),
  ];

  let lastCat = "";
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <div className={`shell${pageMode ? " pagemode" : ""}${drawer ? " drawer" : ""}`}>
        <header className="top">
          <button className="icon-btn menu" type="button" aria-label="Lesson list" aria-expanded={drawer} aria-controls="lesson-list"
            onClick={() => setDrawer((d) => !d)}>☰</button>
          <Link className="brand" href="/">
            <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
              <path d="M24 3l18 10.5v21L24 45 6 34.5v-21z" fill="none" stroke="var(--accent)" strokeWidth="2" />
              <path d="M24 3v21m0 0l18-10.5M24 24L6 13.5M24 24v21" stroke="var(--line-2)" strokeWidth="1.4" />
              <circle cx="24" cy="24" r="5" fill="var(--accent-2)" />
              <circle cx="24" cy="24" r="9" fill="none" stroke="var(--accent-2)" strokeOpacity=".45" />
            </svg>
            <span className="brand-text"><b>AGENT ATLAS</b><small>SEE HOW AI AGENTS WORK</small></span>
          </Link>
          <nav className="stack" aria-label="Agent stack layers">
            <span className="stack-label" aria-hidden="true">AGENT STACK</span>
            <div className="stack-row">
              {CATS.map(([c, , name], k) => {
                const on = !pageMode && active?.category === c;
                return (
                  <button key={c} type="button" title={`Layer ${k + 1}: ${name}`} aria-current={on ? "true" : undefined}
                    className={`layer${on ? " on" : ""}`} onClick={() => { setFilter(c); setDrawer(true); }}>
                    <span className="sr-only">Layer </span><b>{k + 1}</b> <span className="layer-name">{name}</span>
                  </button>
                );
              })}
            </div>
          </nav>
          <div className="top-right">
            <div className="search" role="search">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
              <input ref={search} type="search" placeholder="Search lessons" aria-label="Search lessons and glossary" autoComplete="off"
                value={q} onChange={(e) => setQ(e.target.value)} />
              <kbd aria-hidden="true">{mac ? "⌘K" : "Ctrl K"}</kbd>
            </div>
            <Link className="toplink" href="/guide/">Build guide</Link>
            <Link className="toplink" href="/glossary/">Glossary</Link>
            <ThemeToggle />
          </div>
        </header>

        <aside className="side panel" id="lesson-list" aria-label="Lessons">
          <h2 className="panel-title">LESSONS <span aria-label={`${ordered.length} shown`}>{ordered.length}</span></h2>
          <div className="tabs" role="group" aria-label="Filter by layer">
            {tabs.map(([c, short, n]) => (
              <button key={c} type="button" aria-pressed={filter === c} className={`tab${filter === c ? " on" : ""}`} onClick={() => setFilter(c)}>
                {short} <i aria-hidden="true">{n}</i><span className="sr-only"> ({n} lessons)</span>
              </button>
            ))}
          </div>
          <nav className="list" aria-label="Lesson list">
            {needle && <p className="sr-only" role="status">{ordered.length} lessons and {terms.length} glossary terms match</p>}
            {ordered.length === 0 && terms.length === 0 && <p className="empty">Nothing matches “{q}”.</p>}
            {ordered.map((l) => {
              const on = !pageMode && active?.id === l.id;
              const hitStep = hits.get(l.id)?.step;
              const href = needle && hitStep != null ? `${l.href}?step=${hitStep + 1}` : l.href;
              const header = filter === "All" && l.category !== lastCat
                ? <h3 className="group">{catInfo(l.category)[1]}</h3> : null;
              lastCat = l.category;
              return (
                <div key={l.id}>
                  {header}
                  <Link ref={on ? activeLink : undefined} className={`li${on ? " on" : ""}`} href={href}
                    aria-current={on ? "page" : undefined} onClick={() => setDrawer(false)}>
                    <span className="li-dot" aria-hidden="true" />
                    <span className="li-body">
                      <span className="li-t">{l.title}</span>
                      <span className="li-s">{needle && hitStep != null ? `Match in step ${hitStep + 1}` : l.summary}</span>
                      <span className="li-k">
                        {l.kinds.map((k) => <i key={k} aria-hidden="true" style={{ background: `var(--k-${k})` }} />)}
                        <em>{l.stepCount} msgs</em>
                      </span>
                    </span>
                    <span className="chev" aria-hidden="true">›</span>
                  </Link>
                  {on && active && !needle && (
                    <ol className="li-steps" aria-label="Steps in this lesson">
                      {active.stepTitles.map((t, k) => (
                        <li key={k}>
                          <button type="button" aria-current={k === step ? "step" : undefined} className={k === step ? "on" : ""}
                            onClick={() => { onStep?.(k); setDrawer(false); }}>
                            <b aria-hidden="true">{k + 1}</b><span><span className="sr-only">Step {k + 1}: </span>{t}</span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              );
            })}
            {terms.length > 0 && (
              <>
                <h3 className="group">Glossary</h3>
                {terms.map((t) => (
                  <Link key={t.slug} className="li term" href={`/glossary/#${t.slug}`} onClick={() => setDrawer(false)}>
                    <span className="li-dot" aria-hidden="true" />
                    <span className="li-body"><span className="li-t">{t.term}</span><span className="li-s">{t.definition}</span></span>
                  </Link>
                ))}
              </>
            )}
          </nav>
        </aside>

        {children}
      </div>
      <div className="scrim" aria-hidden="true" onClick={() => setDrawer(false)} />
    </>
  );
}
