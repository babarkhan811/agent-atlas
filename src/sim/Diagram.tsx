"use client";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { Lesson } from "@/content/schema";
import { C30 } from "./iso";
import { NodeIcon } from "./icons";
import { KIND_INFO, LANDSCAPE, PORTRAIT, edges, nodePos, pairKey } from "./layout";

function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => { const m = matchMedia(query); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => matchMedia(query).matches,
    () => false,
  );
}

type Props = { lesson: Lesson; step: number; speed: number; idPrefix?: string };

export function Diagram({ lesson, step, speed, idPrefix = "e" }: Props) {
  const portrait = useMedia("(max-width: 700px)");
  const reduce = useMedia("(prefers-reduced-motion: reduce)");
  const stage = portrait ? PORTRAIT : LANDSCAPE;
  const es = useMemo(() => edges(lesson, stage), [lesson, stage]);
  const pathRefs = useRef(new Map<string, SVGPathElement>());
  const nodeRefs = useRef(new Map<string, SVGGElement>());
  const pkt = useRef<SVGGElement>(null);
  const cap = useRef<SVGGElement>(null);
  const trails = useRef<(SVGCircleElement | null)[]>([]);

  const s = lesson.steps[step]!;
  const to = lesson.nodes.find((n) => n.id === s.to)!;
  const activeKey = pairKey(s);
  const capW = Math.max(64, s.label.length * 7.6 + 30);

  useEffect(() => {
    const edge = pathRefs.current.get(activeKey);
    if (!edge || !pkt.current || !cap.current) return;
    const len = edge.getTotalLength();
    const rev = edge.dataset.a !== s.from;
    const at = (p: number) => edge.getPointAtLength(len * (rev ? 1 - p : p));
    const place = (p: number) => {
      const P = at(p);
      cap.current!.setAttribute("transform", `translate(${P.x},${P.y - 30})`);
      trails.current.forEach((t, k) => {
        const Q = at(Math.max(0, p - (5 - k) * 0.035));
        t?.setAttribute("cx", String(Q.x));
        t?.setAttribute("cy", String(Q.y));
      });
    };
    const arrive = () => {
      const target = nodeRefs.current.get(s.to);
      if (!target) return;
      target.classList.remove("hit");
      void target.getBBox(); // restart the CSS animation
      target.classList.add("hit");
    };
    pkt.current.setAttribute("opacity", "1");
    if (reduce) { place(1); arrive(); return; }
    let raf = 0;
    const t0 = performance.now(), dur = 1300 / speed;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      place(p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
      if (p < 1) raf = requestAnimationFrame(tick);
      else arrive();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [activeKey, s.from, s.to, step, speed, reduce, stage]);

  const tw = (40 * C30).toFixed(2), th = (20 * C30).toFixed(2);
  return (
    <svg className="diagram" viewBox={`0 0 ${stage.w} ${stage.h}`} preserveAspectRatio="xMidYMid meet" role="img"
      aria-label={`Animated diagram: ${lesson.title}. Step ${step + 1}: ${s.title}`}>
      <defs>
        <pattern id={`${idPrefix}-iso`} width={tw} height="23.09" patternUnits="userSpaceOnUse" patternTransform="scale(1.3)">
          <path d={`M0 11.55 L${th} 0 L${tw} 11.55 L${th} 23.09 Z`} className="gridline" />
        </pattern>
        <radialGradient id={`${idPrefix}-fade`} cx="50%" cy="50%" r="60%">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id={`${idPrefix}-vign`}><rect width={stage.w} height={stage.h} fill={`url(#${idPrefix}-fade)`} /></mask>
      </defs>
      <rect width={stage.w} height={stage.h} fill={`url(#${idPrefix}-iso)`} mask={`url(#${idPrefix}-vign)`} />
      <g className="edges">
        {es.map((e, k) => {
          const on = e.key === activeKey;
          return (
            <path key={e.key} id={`${idPrefix}-${k}`} ref={(el) => { if (el) pathRefs.current.set(e.key, el); else pathRefs.current.delete(e.key); }}
              className={`edge${on ? " on" : ""}${on && e.a !== s.from ? " rev" : ""}`} data-a={e.a} d={e.d}
              style={{ ["--c" as string]: `var(--k-${to.kind})` }} />
          );
        })}
      </g>
      {!reduce && (
        <g className="ambient">
          {es.map((e, k) => (
            <circle key={e.key} className="amb" r="2">
              <animateMotion dur={`${(3.2 + (k % 3) * 0.7).toFixed(1)}s`} begin={`${(k * 0.45).toFixed(2)}s`} repeatCount="indefinite">
                <mpath href={`#${idPrefix}-${k}`} />
              </animateMotion>
            </circle>
          ))}
        </g>
      )}
      <g className="nodes">
        {lesson.nodes.map((n, j) => {
          const p = nodePos(n, stage);
          const on = n.id === s.from || n.id === s.to;
          return (
            <g key={n.id} ref={(el) => { if (el) nodeRefs.current.set(n.id, el); else nodeRefs.current.delete(n.id); }}
              className={`node${on ? " on" : ""}`} transform={`translate(${p.x},${p.y})`} style={{ ["--c" as string]: `var(--k-${n.kind})` }}>
              <ellipse className="ring" cx="0" cy="6" rx="58" ry="26" />
              <g className="float" style={{ animationDelay: `${(-j * 0.7).toFixed(1)}s` }}>
                <g transform="scale(1.15)"><NodeIcon node={n} /></g>
              </g>
              <text className="nl" y="48" textAnchor="middle">{n.label}</text>
              <text className="nt" y="65" textAnchor="middle">{KIND_INFO[n.kind].tag}</text>
            </g>
          );
        })}
      </g>
      <g ref={pkt} className="pkt" opacity="0" style={{ ["--c" as string]: `var(--k-${to.kind})` }}>
        {[5, 4, 3, 2, 1].map((k, idx) => (
          <circle key={k} ref={(el) => { trails.current[idx] = el; }} className="trail" r={(6 - k) * 0.9} opacity={(0.12 * (6 - k)).toFixed(2)} />
        ))}
        <g ref={cap} className="cap">
          <rect x={-capW / 2} y={-14} width={capW} height={28} rx={14} />
          <circle className="cap-dot" cx={-capW / 2 + 14} cy={0} r={4} />
          <text x={7} y={4.5} textAnchor="middle">{s.label}</text>
        </g>
      </g>
    </svg>
  );
}
