"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LessonIndexItem } from "@/content";
import type { Lesson } from "@/content/schema";
import { Diagram } from "@/sim/Diagram";
import { Sequence } from "@/sim/Sequence";
import { KIND_INFO, approxBytes, fmtSeconds, stepTimes } from "@/sim/layout";
import { CATS, Shell, catInfo } from "./Shell";

type View = "diagram" | "sequence";
type Props = { lesson: Lesson; index: LessonIndexItem[] };

const TRACE_TYPES = ["LLM", "TOOL", "DATA", "API", "AGENT", "POLICY", "HUMAN"] as const;
const kindOfTag = (t: string) => (Object.keys(KIND_INFO) as (keyof typeof KIND_INFO)[]).find((k) => KIND_INFO[k].tag === t)!;
const looksLikeJson = (v: string) => /^[\[{"\d]/.test(v);
// Autoplay holds each step this long at 1x: the packet flight (1.3 s) plus time to read the caption.
export const STEP_HOLD_MS = 2400;
// Elements that own the Space key; global shortcuts must leave them alone (bug 1).
const OWNS_SPACE = "button, a, summary, input, select, textarea, [role=button], [role=tab], [contenteditable]";
const OWNS_ARROWS = "input, select, textarea, [role=tab]";

export function Workspace({ lesson, index }: Props) {
  const n = lesson.steps.length;
  const [step, setStepRaw] = useState(0);
  const [view, setView] = useState<View>("diagram");
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const ready = useRef(false);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const traceScroll = useRef<HTMLDivElement>(null);

  const setStep = useCallback((i: number) => setStepRaw(Math.max(0, Math.min(n - 1, i))), [n]);
  const go = useCallback((i: number) => { setPlaying(false); setStep(i); }, [setStep]);

  // Read ?step= and ?view= once on mount; keep them in sync afterwards.
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const s = parseInt(p.get("step") ?? "", 10);
    if (s > 0) setStep(s - 1);
    if (p.get("view") === "sequence") setView("sequence");
    ready.current = true;
  }, [setStep]);
  useEffect(() => {
    if (!ready.current) return;
    const u = new URL(location.href);
    u.searchParams.set("step", String(step + 1));
    if (view === "sequence") u.searchParams.set("view", "sequence"); else u.searchParams.delete("view");
    history.replaceState(history.state, "", u);
  }, [step, view]);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => (step < n - 1 ? setStep(step + 1) : setPlaying(false)), STEP_HOLD_MS / speed);
    return () => clearTimeout(t);
  }, [playing, step, speed, n, setStep]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && !t.closest(OWNS_ARROWS)) go(step + (e.key === "ArrowRight" ? 1 : -1));
      else if (e.key === " " && !t.closest(OWNS_SPACE)) { e.preventDefault(); setPlaying((p) => !p); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go, step]);

  useEffect(() => {
    const row = rowRefs.current[step], sc = traceScroll.current;
    if (!row || !sc) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    sc.scrollTo({ top: Math.max(0, row.offsetTop - sc.clientHeight / 2), behavior: reduce ? "auto" : "smooth" });
  }, [step]);

  const play = () => { if (!playing && step >= n - 1) setStep(0); setPlaying((p) => !p); };

  const s = lesson.steps[step]!;
  const node = (id: string) => lesson.nodes.find((x) => x.id === id)!;
  const A = node(s.from), B = node(s.to);
  const T = stepTimes(lesson);
  const pos = index.findIndex((l) => l.id === lesson.id);
  const prev = index[pos - 1], next = index[pos + 1];
  const layer = CATS.findIndex((c) => c[0] === lesson.category) + 1;
  const pad = (k: number) => String(k).padStart(2, "0");
  const nextStepFor = (id: string) => {
    for (let k = 1; k <= n; k++) {
      const j = (step + k) % n, x = lesson.steps[j]!;
      if (x.from === id || x.to === id) return j;
    }
    return step;
  };
  const views: [View, string][] = [["diagram", "◆ NETWORK"], ["sequence", "≡ SEQUENCE"]];
  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = view === "diagram" ? "sequence" : "diagram";
    setView(next);
    document.getElementById(`tab-${next}`)?.focus();
  };
  const raw = s.payload.map(([k, v]) => [k, looksLikeJson(v) ? v : JSON.stringify(v)] as const);

  return (
    <Shell index={index} active={{ id: lesson.id, category: lesson.category, stepTitles: lesson.steps.map((x) => x.title) }} step={step} onStep={go}>
      <section className="stage panel" id="main" tabIndex={-1} aria-label="Simulation">
        <div className="stage-bar">
          <div className="stage-head">
            <div className="eyebrow">{catInfo(lesson.category)[1]} · LESSON {pad(pos + 1)}</div>
            <h1>{lesson.title}</h1>
          </div>
          <div className="seg-toggle" role="tablist" aria-label="View">
            {views.map(([v, label]) => (
              <button key={v} type="button" role="tab" id={`tab-${v}`} aria-selected={view === v} aria-controls="stage-view"
                tabIndex={view === v ? 0 : -1} className={view === v ? "on" : ""} onClick={() => setView(v)} onKeyDown={onTabKey}>{label}</button>
            ))}
          </div>
        </div>
        <div className={`stage-body ${view}`} id="stage-view" role="tabpanel" aria-labelledby={`tab-${view}`}>
          {view === "diagram"
            ? <Diagram lesson={lesson} step={step} speed={speed} describedBy="decoded-msg" onNode={(id) => go(nextStepFor(id))} />
            : <Sequence lesson={lesson} step={step} onStep={go} />}
        </div>
        <div className="timeline">
          <label className="sr-only" htmlFor="scrubber">Timeline</label>
          <input id="scrubber" type="range" min={1} max={n} step={1} value={step + 1}
            aria-valuetext={`Step ${step + 1} of ${n}: ${s.title}`} onChange={(e) => go(+e.target.value - 1)}
            style={{ ["--p" as string]: `${n > 1 ? (step / (n - 1)) * 100 : 100}%` }} />
          <div className="ticks" aria-hidden="true">
            {lesson.steps.map((x, k) => <i key={k} className={k <= step ? "on" : ""} style={{ ["--c" as string]: `var(--k-${node(x.to).kind})` }} />)}
          </div>
        </div>
        <div className="caption" aria-live="polite" aria-atomic="true">
          <span className="cap-n"><span className="sr-only">Step </span>{pad(step + 1)}</span>
          <span className="cap-t">
            <b>{s.title}</b>
            <small>{A.label} → {B.label} · <code>{s.label}</code></small>
          </span>
        </div>
      </section>

      <aside className="inspector panel" aria-label="Lesson details">
        <h2 className="panel-title">LESSON OVERVIEW</h2>
        <div className="ov">
          <div className="ov-top"><h2>{lesson.title}</h2><span className="badge sim" title="An illustrative simulation, not live traffic">SIMULATION</span></div>
          <p className="ov-sum">{lesson.summary}</p>
          <div className="stats">
            <div><small>LAYER</small><b>{layer}</b><span>{catInfo(lesson.category)[2]}</span></div>
            <div><small>MESSAGES</small><b>{n}</b><span>hops</span></div>
            <div><small>SIM TIME</small><b>~{(T[n - 1]! / 1000).toFixed(1)}</b><span>s, illustrative</span></div>
          </div>
          <div className="comps">
            {lesson.nodes.map((x) => <span key={x.id} className="chip" style={{ ["--c" as string]: `var(--k-${x.kind})` }}>{x.label}</span>)}
          </div>
        </div>
        <h2 className="panel-title sub">DECODED MESSAGE</h2>
        <div className="msg" id="decoded-msg">
          <div className="msg-no">MSG {pad(step + 1)} / {pad(n)}
            <span className="type" style={{ ["--c" as string]: `var(--k-${B.kind})` }}>{KIND_INFO[B.kind].tag}</span>
          </div>
          <div className="route">
            <span className="chip" style={{ ["--c" as string]: `var(--k-${A.kind})` }}>{A.label}</span>
            <span className="arrow">→</span>
            <span className="chip" style={{ ["--c" as string]: `var(--k-${B.kind})` }}>{B.label}</span>
          </div>
          <h3>{s.title}</h3>
          {s.text && <p>{s.text}</p>}
          <div className="fields">
            <div className="fields-h">{s.label}</div>
            {s.payload.map(([k, v, note]) => (
              <div className="f" key={k}>
                <div className="fk">{k}</div>
                <div className="fv">{v}</div>
                {note && <div className="fn">{note}</div>}
              </div>
            ))}
          </div>
          <details className="raw">
            <summary>Raw payload</summary>
            <pre>{"{\n"}{raw.map(([k, v], j) => (
              <span key={k}>  <span className="jk">&quot;{k}&quot;</span>: <span className="jv">{v}</span>{j < raw.length - 1 ? ",\n" : "\n"}</span>
            ))}{"}"}</pre>
          </details>
        </div>
        <div className="pager">
          {prev ? <Link href={prev.href}>‹ {prev.title}</Link> : <span />}
          {next ? <Link href={next.href}>{next.title} ›</Link> : <Link href="/guide/">Build guide ›</Link>}
        </div>
      </aside>

      <section className="trace panel" aria-label="Message trace">
        <div className="trace-bar">
          <h2 className="panel-title">MESSAGE TRACE</h2>
          <div className="legend small">
            {TRACE_TYPES.map((t) => <span key={t}><i style={{ background: `var(--k-${kindOfTag(t)})` }} />{t}</span>)}
          </div>
          <div className="controls">
            <select aria-label="Playback speed" value={speed} onChange={(e) => setSpeed(+e.target.value)}>
              {[0.5, 1, 1.5, 2].map((v) => <option key={v} value={v}>{v}×</option>)}
            </select>
            <button type="button" className="ctl" aria-label="Previous step" disabled={step === 0} onClick={() => go(step - 1)}>‹</button>
            <button type="button" className={`ctl primary${playing ? " playing" : ""}`} onClick={play}>{playing ? "❚❚ PAUSE" : "▶ PLAY"}</button>
            <button type="button" className="ctl" disabled={step === n - 1} onClick={() => go(step + 1)}>STEP ›</button>
            <button type="button" className="ctl" onClick={() => go(0)}>↺ RESET</button>
          </div>
        </div>
        <div className="table-scroll" ref={traceScroll}>
          <table className="tt">
            <caption className="sr-only">Every message in this lesson. Times and sizes are illustrative estimates.</caption>
            <thead><tr><th scope="col">NO.</th><th scope="col">TIME (EST.)</th><th scope="col">SOURCE</th><th scope="col">DESTINATION</th><th scope="col">TYPE</th><th scope="col">INFO</th><th scope="col">SIZE (EST.)</th></tr></thead>
            <tbody>
              {lesson.steps.map((x, k) => {
                const to = node(x.to);
                return (
                  <tr key={k} ref={(el) => { rowRefs.current[k] = el; }} className={k < step ? "past" : k === step ? "now" : "future"}
                    aria-current={k === step ? "step" : undefined} style={{ ["--c" as string]: `var(--k-${to.kind})` }} onClick={() => go(k)}>
                    <td><button type="button" className="no" aria-label={`Go to step ${k + 1}`} onClick={(e) => { e.stopPropagation(); go(k); }}>{k + 1}</button></td>
                    <td>{fmtSeconds(T[k]!)}</td>
                    <td>{node(x.from).label}</td>
                    <td>{to.label}</td>
                    <td><span className="type">{KIND_INFO[to.kind].tag}</span></td>
                    <td className="info"><b>{x.label}</b> · {x.title}</td>
                    <td>~{approxBytes(x)} B</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}
