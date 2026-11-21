import { describe, expect, it } from "vitest";
import { loadContent } from "@/content";
import { ICONS, iconFor } from "@/sim/icons";
import { boxFaces, project } from "@/sim/iso";
import { LANDSCAPE, PORTRAIT, edges, nodePos, pairKey, stepTimes } from "@/sim/layout";

const { lessons } = loadContent();

describe("isometric projection", () => {
  it("maps the ground origin to (0,0) and z straight up", () => {
    expect(project([0, 0, 0])).toEqual([0, 0]);
    expect(project([0, 0, 10])).toEqual([0, -10]);
  });
  it("sends +x right-down and +y left-down", () => {
    const [x1, y1] = project([10, 0]);
    const [x2, y2] = project([0, 10]);
    expect(x1).toBeGreaterThan(0);
    expect(x2).toBeLessThan(0);
    expect(y1).toBe(5);
    expect(y2).toBe(5);
  });
  it("produces three four-point faces per box", () => {
    const f = boxFaces(0, 0, 0, 10, 10, 10);
    for (const face of [f.top, f.left, f.right]) expect(face.split(" ")).toHaveLength(4);
  });
});

describe("icon selection", () => {
  it("resolves every node in every lesson to a real icon", () => {
    for (const l of lessons) for (const n of l.nodes) expect(ICONS).toHaveProperty(iconFor(n));
  });
  it("uses label keywords before the kind default", () => {
    expect(iconFor({ kind: "tool", label: "Laptop agent" })).toBe("laptop");
    expect(iconFor({ kind: "data", label: "Vector database" })).toBe("db");
    expect(iconFor({ kind: "tool", label: "MCP server" })).toBe("tool");
    expect(iconFor({ kind: "guard", label: "Detection rules" })).toBe("shield");
    expect(iconFor({ kind: "guard", label: "Authorization server" })).toBe("key");
    expect(iconFor({ kind: "tool", label: "Identity provider" })).toBe("key");
    expect(iconFor({ kind: "data", label: "Usage meter" })).toBe("gauge");
  });
});

describe("layout", () => {
  it("keeps every node inside the stage in both orientations", () => {
    for (const stage of [LANDSCAPE, PORTRAIT])
      for (const l of lessons)
        for (const n of l.nodes) {
          const p = nodePos(n, stage);
          expect(p.x).toBeGreaterThan(40);
          expect(p.x).toBeLessThan(stage.w - 40);
          expect(p.y).toBeGreaterThan(80);
          expect(p.y + 70).toBeLessThan(stage.h);
        }
  });
  it("draws one edge per communicating pair", () => {
    for (const l of lessons) {
      const pairs = new Set(l.steps.filter((s) => s.from !== s.to).map(pairKey));
      expect(edges(l, LANDSCAPE)).toHaveLength(pairs.size);
    }
  });
  it("produces strictly increasing illustrative timestamps", () => {
    for (const l of lessons) {
      const t = stepTimes(l);
      t.forEach((v, i) => i && expect(v).toBeGreaterThan(t[i - 1]!));
    }
  });
});
