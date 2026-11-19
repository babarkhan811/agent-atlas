"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LessonIndexItem } from "@/content";
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

export function Shell({ index, active, step = 0, onStep, pageMode = false, children }: Props) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [drawer, setDrawer] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const activeLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setDrawer(true);
        search.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { activeLink.current?.scrollIntoView({ block: "nearest" }); }, [active?.id, filter]);

  const needle = q.trim().toLowerCase();
  const items = index.filter(
    (l) => (filter === "All" || l.category === filter) &&
      (!needle || `${l.title} ${l.summary} ${l.category}`.toLowerCase().includes(needle)),
  );
  // Sidebar order follows the categories, as in the prototype.
  const ordered = CATS.flatMap(([c]) => items.filter((l) => l.category === c));
  const tabs: [string, string, number][] = [
    ["All", "All", index.length],
    ...CATS.map(([c, short]) => [c, short, index.filter((l) => l.category === c).length] as [string, string, number]),
  ];

  let lastCat = "";
  return (
    <>
      <div className={`shell${pageMode ? " pagemode" : ""}${drawer ? " drawer" : ""}`}>
        <header className="top">
          <button className="icon-btn menu" type="button" aria-label="Open lesson list" onClick={() => setDrawer((d) => !d)}>☰</button>
          <Link className="brand" href="/" aria-label="Agent Atlas home">
            <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
              <path d="M24 3l18 10.5v21L24 45 6 34.5v-21z" fill="none" stroke="var(--accent)" strokeWidth="2" />
              <path d="M24 3v21m0 0l18-10.5M24 24L6 13.5M24 24v21" stroke="var(--line-2)" strokeWidth="1.4" />
              <circle cx="24" cy="24" r="5" fill="var(--accent-2)" />
              <circle cx="24" cy="24" r="9" fill="none" stroke="var(--accent-2)" strokeOpacity=".45" />
            </svg>
            <span className="brand-text"><b>AGENT ATLAS</b><small>SEE HOW AI AGENTS WORK</small></span>
          </Link>
          <div className="stack" aria-label="Agent stack layers">
            <span className="stack-label">AGENT STACK</span>
            <div className="stack-row">
              {CATS.map(([c, , name], k) => (
                <button key={c} type="button" title={name}
                  className={`layer${!pageMode && active?.category === c ? " on" : ""}`}
                  onClick={() => { setFilter(c); setDrawer(true); }}>
                  <b>{k + 1}</b><span>{name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="top-right">
            <label className="search">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
              <input ref={search} type="search" placeholder="Search lessons" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
              <kbd>Ctrl K</kbd>
            </label>
            <Link className="toplink" href="/guide/">Build guide</Link>
            <Link className="toplink" href="/glossary/">Glossary</Link>
            <ThemeToggle />
          </div>
        </header>

        <aside className="side panel">
          <div className="panel-title">LESSONS <span>{ordered.length}</span></div>
          <div className="tabs">
            {tabs.map(([c, short, n]) => (
              <button key={c} type="button" className={`tab${filter === c ? " on" : ""}`} onClick={() => setFilter(c)}>
                {short} <i>{n}</i>
              </button>
            ))}
          </div>
          <nav className="list">
            {ordered.length === 0 && <p className="empty">No lessons match “{q}”.</p>}
            {ordered.map((l) => {
              const on = !pageMode && active?.id === l.id;
              const header = filter === "All" && l.category !== lastCat
                ? <div className="group">{catInfo(l.category)[1]}</div> : null;
              lastCat = l.category;
              return (
                <div key={l.id}>
                  {header}
                  <Link ref={on ? activeLink : undefined} className={`li${on ? " on" : ""}`} href={l.href} onClick={() => setDrawer(false)}>
                    <span className="li-dot" />
                    <span className="li-body">
                      <span className="li-t">{l.title}</span>
                      <span className="li-s">{l.summary}</span>
                      <span className="li-k">
                        {l.kinds.map((k) => <i key={k} style={{ background: `var(--k-${k})` }} />)}
                        <em>{l.stepCount} msgs</em>
                      </span>
                    </span>
                    <span className="chev">›</span>
                  </Link>
                  {on && active && (
                    <ol className="li-steps">
                      {active.stepTitles.map((t, k) => (
                        <li key={k}>
                          <button type="button" className={k === step ? "on" : ""} onClick={() => { onStep?.(k); setDrawer(false); }}>
                            <b>{k + 1}</b><span>{t}</span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {children}
      </div>
      <div className="scrim" onClick={() => setDrawer(false)} />
    </>
  );
}
