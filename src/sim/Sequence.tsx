"use client";
import { useEffect, useRef, useSyncExternalStore, type KeyboardEvent } from "react";
import type { Lesson } from "@/content/schema";
import { NodeIcon } from "./icons";
import { KIND_INFO } from "./layout";

const COL = 150, ROW = 56;
type Props = { lesson: Lesson; step: number; onStep: (i: number) => void };

function useNarrow() {
  const q = "(max-width: 700px)";
  return useSyncExternalStore(
    (cb) => { const m = matchMedia(q); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => matchMedia(q).matches,
    () => false,
  );
}

function useScrollCurrentIntoView(el: React.RefObject<Element | null>, step: number) {
  useEffect(() => {
    const cur = el.current, body = cur?.closest(".stage-body");
    if (!cur || !body) return;
    const y = cur.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    body.scrollTo({ top: Math.max(0, y - body.clientHeight / 2), behavior: reduce ? "auto" : "smooth" });
  }, [el, step]);
}

const activateOnKey = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
};

export function Sequence(props: Props) {
  return useNarrow() ? <SequenceList {...props} /> : <SequenceDiagram {...props} />;
}

/** Phones: a vertical timeline instead of a wide diagram (bug 5). */
function SequenceList({ lesson, step, onStep }: Props) {
  const current = useRef<HTMLLIElement>(null);
  useScrollCurrentIntoView(current, step);
  const node = (id: string) => lesson.nodes.find((n) => n.id === id)!;
  return (
    <ol className="seq-list" aria-label={`Sequence of messages: ${lesson.title}`}>
      {lesson.steps.map((st, k) => {
        const from = node(st.from), to = node(st.to);
        const state = k < step ? "past" : k === step ? "now" : "future";
        return (
          <li key={k} ref={k === step ? current : undefined} className={state} style={{ ["--c" as string]: `var(--k-${to.kind})` }}>
            <button type="button" aria-current={k === step ? "step" : undefined} onClick={() => onStep(k)}>
              <span className="sl-n" aria-hidden="true">{k + 1}</span>
              <span className="sl-body">
                <span className="sl-route">
                  <span style={{ color: `var(--k-${from.kind})` }}>{from.label}</span> → <span style={{ color: `var(--k-${to.kind})` }}>{to.label}</span>
                </span>
                <code className="sl-label">{st.label}</code>
                <span className="sl-title"><span className="sr-only">Step {k + 1}: </span>{st.title}</span>
              </span>
              <span className="sl-type" aria-hidden="true">{KIND_INFO[to.kind].tag}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function SequenceDiagram({ lesson, step, onStep }: Props) {
  const n = lesson.nodes.length;
  const W = Math.max(640, 40 + n * COL), H = lesson.steps.length * ROW + 24;
  const cx = (k: number) => (W - n * COL) / 2 + COL * (k + 0.5);
  const col = (id: string) => lesson.nodes.findIndex((x) => x.id === id);
  const current = useRef<SVGGElement>(null);
  useScrollCurrentIntoView(current, step);

  return (
    <>
      <div className="seq-top" aria-hidden="true">
        <svg className="seq" viewBox={`0 0 ${W} 104`}>
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
      <svg className="seq" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`Sequence diagram: ${lesson.title}`}>
        {lesson.nodes.map((nd, k) => (
          <line key={nd.id} className="life" x1={cx(k)} y1="0" x2={cx(k)} y2={H} style={{ stroke: `var(--k-${nd.kind})` }} aria-hidden="true" />
        ))}
        {lesson.steps.map((st, k) => {
          const a = cx(col(st.from)), b = cx(col(st.to)), y = k * ROW + 38, dir = b > a ? 1 : -1;
          const from = lesson.nodes[col(st.from)]!, to = lesson.nodes[col(st.to)]!;
          const state = k < step ? "past" : k === step ? "now" : "future";
          return (
            <g key={k} ref={k === step ? current : undefined} className={`sq-msg ${state}`} style={{ ["--c" as string]: `var(--k-${to.kind})` }}
              role="button" tabIndex={0} aria-current={k === step ? "step" : undefined}
              aria-labelledby={`sq-${k}-name`} aria-describedby={`sq-${k}-d`}
              onClick={() => onStep(k)} onKeyDown={activateOnKey(() => onStep(k))}>
              <rect className="sq-hit" x="0" y={y - 30} width={W} height={ROW} />
              <circle className="sq-n" cx="22" cy={y - 6} r="11" />
              <text id={`sq-${k}-name`} textAnchor="middle">
                <tspan className="sq-nt" x="22" y={y - 2}>{k + 1}</tspan>{" "}<tspan className="sq-label" x={(a + b) / 2} y={y - 9}>{st.label}</tspan>
              </text>
              <line className="sq-line" x1={a} y1={y} x2={b - dir * 8} y2={y} />
              <polygon className="sq-head" points={`${b},${y} ${b - dir * 11},${y - 5.5} ${b - dir * 11},${y + 5.5}`} />
            </g>
          );
        })}
      </svg>
      <div className="sr-only">
        {lesson.steps.map((st, k) => (
          <span key={k} id={`sq-${k}-d`}>{`Step ${k + 1}: ${lesson.nodes[col(st.from)]!.label} to ${lesson.nodes[col(st.to)]!.label}. ${st.title}`}</span>
        ))}
      </div>
    </>
  );
}
