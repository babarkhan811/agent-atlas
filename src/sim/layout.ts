import type { Kind, Lesson, LessonNode, Step } from "@/content/schema";

export const KIND_INFO: Record<Kind, { name: string; tag: string }> = {
  user: { name: "Person", tag: "HUMAN" },
  app: { name: "Agent / app", tag: "AGENT" },
  model: { name: "AI model", tag: "LLM" },
  tool: { name: "Tool", tag: "TOOL" },
  data: { name: "Data", tag: "DATA" },
  external: { name: "External", tag: "API" },
  guard: { name: "Guardrail", tag: "POLICY" },
};

// Illustrative per-hop latency by receiving component. Not measured telemetry.
const LATENCY_MS: Record<Kind, number> = { model: 840, tool: 140, external: 210, data: 35, app: 6, guard: 12, user: 0 };

export type Stage = { w: number; h: number; portrait: boolean };
export const LANDSCAPE: Stage = { w: 1000, h: 600, portrait: false };
export const PORTRAIT: Stage = { w: 600, h: 1000, portrait: true };

/** Node position in stage units. Portrait stages swap axes so diagrams run top to bottom. */
export function nodePos(n: Pick<LessonNode, "x" | "y">, s: Stage): { x: number; y: number } {
  return s.portrait
    ? { x: 80 + (n.y / 100) * 440, y: 110 + (n.x / 100) * 790 }
    : { x: 70 + (n.x / 100) * 860, y: 100 + (n.y / 100) * 405 };
}

export const pairKey = (s: Pick<Step, "from" | "to">) => [s.from, s.to].sort().join("|");

export type Edge = { key: string; a: string; b: string; d: string };

/** One gently curved edge per pair of nodes that exchange messages. */
export function edges(l: Pick<Lesson, "nodes" | "steps">, s: Stage): Edge[] {
  const seen = new Map<string, Edge>();
  for (const st of l.steps) {
    if (st.from === st.to) continue;
    const key = pairKey(st);
    if (seen.has(key)) continue;
    const [a, b] = key.split("|") as [string, string];
    const A = nodePos(l.nodes.find((n) => n.id === a)!, s);
    const B = nodePos(l.nodes.find((n) => n.id === b)!, s);
    const x1 = A.x, y1 = A.y - 26, x2 = B.x, y2 = B.y - 26;
    const cx = (x1 + x2) / 2 - (y2 - y1) * 0.1;
    const cy = (y1 + y2) / 2 + (x2 - x1) * 0.1;
    seen.set(key, { key, a, b, d: `M${x1} ${y1} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2} ${y2}` });
  }
  return [...seen.values()];
}

/** Cumulative illustrative timestamps (ms) for each step. */
export function stepTimes(l: Pick<Lesson, "nodes" | "steps">): number[] {
  let t = 0;
  return l.steps.map((s) => (t += LATENCY_MS[l.nodes.find((n) => n.id === s.to)!.kind] + 4));
}

export const fmtSeconds = (ms: number) => (ms / 1000).toFixed(3) + "s";

/** Approximate serialized size of the decoded fields, for the trace table. */
export const approxBytes = (s: Pick<Step, "payload">) => JSON.stringify(s.payload.map(([k, v]) => [k, v])).length;
