// Isometric SVG icon kit. Each icon is drawn around (0,0) = ground centre;
// colours come from the CSS variable --c set on an ancestor.
import type { ReactElement } from "react";
import type { LessonNode } from "@/content/schema";
import { boxFaces, points, project, type P3 } from "./iso";

function Box({ x, y, z, w, d, h, core }: { x: number; y: number; z: number; w: number; d: number; h: number; core?: boolean }) {
  const f = boxFaces(x, y, z, w, d, h);
  const p = core ? "c" : "f";
  return (
    <>
      <polygon className={`${p}r`} points={f.right} />
      <polygon className={`${p}l`} points={f.left} />
      <polygon className={`${p}t`} points={f.top} />
    </>
  );
}

function Seg({ a, b, c = "ln" }: { a: P3; b: P3; c?: string }) {
  const [x1, y1] = project(a);
  const [x2, y2] = project(b);
  return <line className={c} x1={x1} y1={y1} x2={x2} y2={y2} />;
}

function Led({ p, r = 2.4 }: { p: P3; r?: number }) {
  const [cx, cy] = project(p);
  return <circle className="led" cx={cx} cy={cy} r={r} />;
}

const Shadow = ({ rx = 46 }: { rx?: number }) => <ellipse className="shadow" cx={0} cy={6} rx={rx} ry={rx * 0.46} />;

function Server() {
  return (
    <>
      <Shadow rx={40} />
      <Box x={-16} y={-16} z={0} w={32} d={32} h={64} />
      {[14, 27, 40, 53].map((z) => (
        <g key={z}>
          <Seg a={[-16, 16, z]} b={[16, 16, z]} c="ln thin" />
          <Seg a={[16, -16, z]} b={[16, 16, z]} c="ln thin" />
          <Led p={[16, -9, z + 5]} r={1.7} />
        </g>
      ))}
    </>
  );
}

function Laptop() {
  return (
    <>
      <Shadow />
      <Box x={-28} y={-18} z={0} w={56} d={36} h={4} />
      {[-11, -4, 3].map((y) => <Seg key={y} a={[-20, y, 4]} b={[20, y, 4]} c="ln thin" />)}
      <polygon className="fs" points={points([[-28, -18, 4], [28, -18, 4], [28, -27, 48], [-28, -27, 48]])} />
      {([[0.28, 14], [0.46, 4], [0.64, 16], [0.8, -2]] as const).map(([k, e]) => {
        const z = 4 + 44 * k, y = -18 - 9 * k;
        return <Seg key={k} a={[-20, y, z]} b={[e, y, z]} c="ln glow" />;
      })}
    </>
  );
}

function Chip() {
  const a: P3 = [-7, -6, 16], b: P3 = [7, -3, 16], c: P3 = [0, 8, 16];
  return (
    <>
      <Shadow rx={50} />
      <Box x={-26} y={-26} z={0} w={52} d={52} h={8} />
      {[-17, -6, 5, 16].map((i) => (
        <g key={i}>
          <Seg a={[i, 26, 3]} b={[i, 35, 1]} />
          <Seg a={[26, i, 3]} b={[35, i, 1]} />
        </g>
      ))}
      <Box x={-14} y={-14} z={8} w={28} d={28} h={8} core />
      <Seg a={a} b={b} c="ln glow" />
      <Seg a={b} b={c} c="ln glow" />
      <Seg a={c} b={a} c="ln glow" />
      <Led p={a} r={2.3} />
      <Led p={b} r={2.3} />
      <Led p={c} r={2.3} />
    </>
  );
}

function Robot() {
  return (
    <>
      <Shadow rx={42} />
      <Box x={-22} y={-22} z={0} w={44} d={44} h={36} />
      <Seg a={[-15, 22, 23]} b={[-5, 22, 23]} c="eye" />
      <Seg a={[5, 22, 23]} b={[15, 22, 23]} c="eye" />
      <Seg a={[-8, 22, 11]} b={[8, 22, 11]} />
      <Seg a={[22, -12, 28]} b={[22, 12, 28]} c="ln thin" />
      <Seg a={[22, -12, 8]} b={[22, 12, 8]} c="ln thin" />
      <Seg a={[0, 0, 36]} b={[0, 0, 52]} />
      <Led p={[0, 0, 54]} r={3.4} />
    </>
  );
}

function Tool() {
  const [gx, gy] = project([0, 0, 22]);
  return (
    <>
      <Shadow />
      <Box x={-24} y={-24} z={0} w={48} d={48} h={22} />
      <ellipse className="gear" cx={gx} cy={gy} rx={19} ry={9.5} />
      <ellipse className="ln" cx={gx} cy={gy} rx={7} ry={3.5} />
      <Seg a={[-24, 24, 9]} b={[24, 24, 9]} c="ln thin" />
      <Seg a={[24, -24, 9]} b={[24, 24, 9]} c="ln thin" />
    </>
  );
}

function Db() {
  return (
    <>
      <Shadow rx={40} />
      {[0, 1, 2].map((i) => {
        const b = -i * 19, h = 15;
        return (
          <g key={i}>
            <path className="fl" d={`M-28 ${b} A28 13 0 0 0 28 ${b} L28 ${b - h} A28 13 0 0 1 -28 ${b - h} Z`} />
            <ellipse className="ft" cx={0} cy={b - h} rx={28} ry={13} />
            <circle className="led" cx={17} cy={b - 1} r={1.8} />
          </g>
        );
      })}
    </>
  );
}

function Docs() {
  return (
    <>
      <Shadow rx={44} />
      {[0, 1, 2].map((i) => <Box key={i} x={-20 + i * 3} y={-26 - i * 3} z={i * 6} w={40} d={52} h={4} />)}
      {[-24, -14, -4, 6].map((y) => <Seg key={y} a={[-8, y, 16]} b={[y === 6 ? 8 : 20, y, 16]} c="ln thin" />)}
    </>
  );
}

function Mail() {
  return (
    <>
      <Shadow />
      <Box x={-28} y={-18} z={0} w={56} d={36} h={12} />
      <polyline className="ln glow" fill="none" points={points([[-28, -18, 12], [0, 2, 12], [28, -18, 12]])} />
    </>
  );
}

function Browser() {
  return (
    <>
      <Shadow rx={44} />
      <Box x={-30} y={-4} z={0} w={60} d={8} h={4} />
      <polygon className="fs" points={points([[-30, 0, 4], [30, 0, 4], [30, 0, 60], [-30, 0, 60]])} />
      <Seg a={[-30, 0, 51]} b={[30, 0, 51]} c="ln thin" />
      {[-25, -20, -15].map((x) => <Led key={x} p={[x, 0, 55.5]} r={1.6} />)}
      {([[40, 18], [31, 4], [22, 22], [13, -6]] as const).map(([z, e]) => <Seg key={z} a={[-22, 0, z]} b={[e, 0, z]} c="ln glow" />)}
    </>
  );
}

function Shield() {
  return (
    <>
      <Shadow rx={38} />
      <path className="fl" d="M0 -84 L31 -72 L31 -43 C31 -21 15 -8 0 -2 C-15 -8 -31 -21 -31 -43 L-31 -72 Z" />
      <path className="ft" d="M0 -75 L22 -67 L22 -44 C22 -28 11 -17 0 -12 C-11 -17 -22 -28 -22 -44 L-22 -67 Z" />
      <path className="check" d="M-10 -45 L-2 -36 L12 -55" />
    </>
  );
}

function Cloud() {
  return (
    <>
      <Shadow rx={48} />
      <path className="fl" d="M-36 -8 C-52 -8 -52 -34 -34 -36 C-34 -56 -10 -62 0 -48 C8 -66 38 -60 34 -38 C52 -38 52 -8 34 -8 Z" />
      <circle className="ft" cx={0} cy={-28} r={13} />
      <ellipse className="ln" cx={0} cy={-28} rx={5.5} ry={13} />
      <line className="ln" x1={-13} y1={-28} x2={13} y2={-28} />
    </>
  );
}

function Person() {
  return (
    <>
      <Shadow rx={34} />
      <path className="fl" d="M-24 0 C-24 -31 24 -31 24 0 Z" />
      <circle className="ft" cx={0} cy={-41} r={13} />
    </>
  );
}

function Chat() {
  return (
    <>
      <Shadow rx={44} />
      <path className="fl" d="M-34 -70 h44 a6 6 0 0 1 6 6 v18 a6 6 0 0 1 -6 6 h-30 l-10 9 v-9 h-4 a6 6 0 0 1 -6 -6 v-18 a6 6 0 0 1 6 -6 Z" />
      <path className="ft" d="M-4 -46 h34 a6 6 0 0 1 6 6 v16 a6 6 0 0 1 -6 6 h-4 v8 l-9 -8 h-21 a6 6 0 0 1 -6 -6 v-16 a6 6 0 0 1 6 -6 Z" />
      {[5, 13, 21].map((cx) => <circle key={cx} className="led" cx={cx} cy={-32} r={2} />)}
    </>
  );
}

export const ICONS = {
  server: Server, laptop: Laptop, chip: Chip, robot: Robot, tool: Tool, db: Db, docs: Docs,
  mail: Mail, browser: Browser, shield: Shield, cloud: Cloud, person: Person, chat: Chat,
} satisfies Record<string, () => ReactElement>;
export type IconName = keyof typeof ICONS;

const BY_KIND: Record<LessonNode["kind"], IconName> = {
  user: "person", app: "robot", model: "chip", tool: "tool", data: "db", external: "cloud", guard: "shield",
};

/** Pick an icon from an explicit override, the node kind, or keywords in its label. */
export function iconFor(n: Pick<LessonNode, "icon" | "kind" | "label">): IconName {
  if (n.icon && n.icon in ICONS) return n.icon as IconName;
  if (n.kind === "guard") return "shield";
  if (n.kind === "user") return "person";
  const s = n.label.toLowerCase();
  if (/laptop/.test(s)) return "laptop";
  if (/server/.test(s) && !/mcp/.test(s)) return /mail/.test(s) ? "mail" : "server";
  if (/inbox|mail/.test(s)) return "mail";
  if (/browser|web page|portal/.test(s)) return "browser";
  if (/chat|ticket/.test(s)) return "chat";
  if (/docs|file|repo|test case|evidence/.test(s)) return "docs";
  if (/siem|log|database|store|vector|context|crm|hr system|results/.test(s)) return "db";
  return BY_KIND[n.kind];
}

export function NodeIcon({ node }: { node: Pick<LessonNode, "icon" | "kind" | "label"> }) {
  const Icon = ICONS[iconFor(node)];
  return <Icon />;
}
