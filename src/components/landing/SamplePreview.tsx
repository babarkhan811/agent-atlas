"use client";
// A live, auto-playing preview of a real lesson simulation on the landing page.
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Lesson } from "@/content/schema";
import { Diagram } from "@/sim/Diagram";

export function SamplePreview({ lesson, href }: { lesson: Lesson; href: string }) {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % lesson.steps.length), 2800);
    return () => clearTimeout(t);
  }, [step, paused, lesson.steps.length]);
  const s = lesson.steps[step]!;
  return (
    <div className="sample panel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="sample-bar">
        <span className="eyebrow">Live preview · {lesson.title}</span>
        <button type="button" className="ctl" onClick={() => setPaused((p) => !p)} aria-pressed={paused}>{paused ? "▶ Play" : "❚❚ Pause"}</button>
      </div>
      <div className="sample-stage">
        <Diagram lesson={lesson} step={step} speed={1} idPrefix="hero" />
      </div>
      <div className="caption sample-cap" aria-live="polite">
        <span className="cap-n">{String(step + 1).padStart(2, "0")}</span>
        <span className="cap-t"><b>{s.title}</b><small>{s.depth?.beginner.split(". ")[0] ?? s.text}.</small></span>
      </div>
      <Link className="ctl primary sample-cta" href={href}>Open the full lesson →</Link>
    </div>
  );
}
