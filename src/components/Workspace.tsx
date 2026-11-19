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
    const t = setTimeout(() => (step < n - 1 ? setStep(step + 1) : setPlaying(false)), 3600 / speed);
    return () => clearTimeout(t);
  }, [playing, step, speed, n, setStep]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, select, textarea")) return;
      if (e.key === "ArrowRight") go(step + 1);
      else if (e.key === "ArrowLeft") go(step - 1);
      else if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
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
  const raw = s.payload.map(([k, v]) => [k, looksLikeJson(v) ? v : JSON.stringify(v)] as const);

  return (
    <Shell index={index} active={{ id: lesson.id, category: lesson.category, stepTitles: lesson.steps.map((x) => x.title) }} step={step} onStep={go}>
      <section className="stage panel">
        <div className="stage-bar">
          <div className="stage-head">
            <div className="eyebrow">{catInfo(lesson.category)[1]} · LESSON {pad(pos + 1)}</div>
            <h1>{lesson.title}</h1>
          </div>
          <div className="seg-toggle" role="tablist">
            <button type="button" className={view === "diagram" ? "on" : ""} onClick={() => setView("diagram")}>◆ NETWORK</button>
            <button type="button" className={view === "sequence" ? "on" : ""} onClick={() => setView("sequence")}>≡ SEQUENCE</button>
          </div>
        </div>
        <div className={`stage-body ${view}`}>
          {view === "diagram"
            ? <Diagram lesson={lesson} step={step} speed={speed} />
            : <Sequence lesson={lesson} step={step} onStep={go} />}
        </div>
        <div className="caption" aria-live="polite">
          <span className="cap-n">{pad(step + 1)}</span>
          <span className="cap-t">
            <b>{s.title}</b>
            <small>{A.label} → {B.label} · <code>{s.label}</code></small>
          </span>
        </div>
      </section>

      <aside className="inspector panel">
        <div className="panel-title">LESSON OVERVIEW</div>
        <div className="ov">
          <div className="ov-top"><h2>{lesson.title}</h2><span className="badge"><i />LIVE</span></div>
          <p className="ov-sum">{lesson.summary}</p>
          <div className="stats">
            <div><small>LAYER</small><b>{layer}</b><span>{catInfo(lesson.category)[2]}</span></div>
            <div><small>MESSAGES</small><b>{n}</b><span>hops</span></div>
            <div><small>RUN TIME</small><b>{(T[n - 1]! / 1000).toFixed(2)}</b><span>seconds</span></div>
          </div>
          <div className="comps">
            {lesson.nodes.map((x) => <span key={x.id} className="chip" style={{ ["--c" as string]: `var(--k-${x.kind})` }}>{x.label}</span>)}
          </div>
        </div>
        <div className="panel-title sub">DECODED MESSAGE</div>
        <div className="msg">
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

      <section className="trace panel">
        <div className="trace-bar">
          <div className="panel-title">MESSAGE TRACE</div>
          <div className="legend small">
            {TRACE_TYPES.map((t) => <span key={t}><i style={{ background: `var(--k-${kindOfTag(t)})` }} />{t}</span>)}
            <em>timings illustrative</em>
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
            <thead><tr><th>NO.</th><th>TIME</th><th>SOURCE</th><th>DESTINATION</th><th>TYPE</th><th>INFO</th><th>SIZE</th></tr></thead>
            <tbody>
              {lesson.steps.map((x, k) => {
                const to = node(x.to);
                return (
                  <tr key={k} ref={(el) => { rowRefs.current[k] = el; }} className={k < step ? "past" : k === step ? "now" : "future"}
                    style={{ ["--c" as string]: `var(--k-${to.kind})` }} onClick={() => go(k)}>
                    <td><span className="no">{k + 1}</span></td>
                    <td>{fmtSeconds(T[k]!)}</td>
                    <td>{node(x.from).label}</td>
                    <td>{to.label}</td>
                    <td><span className="type">{KIND_INFO[to.kind].tag}</span></td>
                    <td className="info"><b>{x.label}</b> · {x.title}</td>
                    <td>{approxBytes(x)} B</td>
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
