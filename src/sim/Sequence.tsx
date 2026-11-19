"use client";
import { useEffect, useRef } from "react";
import type { Lesson } from "@/content/schema";
import { NodeIcon } from "./icons";

const COL = 150, ROW = 56;

export function Sequence({ lesson, step, onStep }: { lesson: Lesson; step: number; onStep: (i: number) => void }) {
  const n = lesson.nodes.length;
  const W = Math.max(640, 40 + n * COL), H = lesson.steps.length * ROW + 24;
  const cx = (k: number) => (W - n * COL) / 2 + COL * (k + 0.5);
  const col = (id: string) => lesson.nodes.findIndex((x) => x.id === id);
  const current = useRef<SVGGElement>(null);

  useEffect(() => {
    const el = current.current, body = el?.closest(".stage-body");
    if (!el || !body) return;
    const y = el.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    body.scrollTo({ top: Math.max(0, y - body.clientHeight / 2), behavior: reduce ? "auto" : "smooth" });
  }, [step]);

  return (
    <>
      <div className="seq-top">
        <svg className="seq" viewBox={`0 0 ${W} 104`} role="presentation">
          {lesson.nodes.map((nd, k) => (
            <g key={nd.id}>
              <g className="node seq-head" style={{ ["--c" as string]: `var(--k-${nd.kind})` }} transform={`translate(${cx(k)},56)`}>
                <g transform="scale(.5)"><NodeIcon node={nd} /></g>
                <text className="nl" y="26" textAnchor="middle">{nd.label}</text>
              </g>
              <line className="life" x1={cx(k)} y1="90" x2={cx(k)} y2="104" style={{ stroke: `var(--k-${nd.kind})` }} />
            </g>
          ))}
        </svg>
      </div>
      <svg className="seq" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Sequence diagram: ${lesson.title}`}>
        {lesson.nodes.map((nd, k) => (
          <line key={nd.id} className="life" x1={cx(k)} y1="0" x2={cx(k)} y2={H} style={{ stroke: `var(--k-${nd.kind})` }} />
        ))}
        {lesson.steps.map((st, k) => {
          const a = cx(col(st.from)), b = cx(col(st.to)), y = k * ROW + 38, dir = b > a ? 1 : -1;
          const kind = lesson.nodes[col(st.to)]!.kind;
          const state = k < step ? "past" : k === step ? "now" : "future";
          return (
            <g key={k} ref={k === step ? current : undefined} className={`sq-msg ${state}`} style={{ ["--c" as string]: `var(--k-${kind})` }} onClick={() => onStep(k)}>
              <rect className="sq-hit" x="0" y={y - 30} width={W} height={ROW} />
              <circle className="sq-n" cx="22" cy={y - 6} r="11" />
              <text className="sq-nt" x="22" y={y - 2} textAnchor="middle">{k + 1}</text>
              <line className="sq-line" x1={a} y1={y} x2={b - dir * 8} y2={y} />
              <polygon className="sq-head" points={`${b},${y} ${b - dir * 11},${y - 5.5} ${b - dir * 11},${y + 5.5}`} />
              <text className="sq-label" x={(a + b) / 2} y={y - 9} textAnchor="middle">{st.label}</text>
            </g>
          );
        })}
      </svg>
    </>
  );
}
