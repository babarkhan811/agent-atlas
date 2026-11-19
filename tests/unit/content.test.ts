import { describe, expect, it } from "vitest";
import { lessonIndex, loadContent, loadGlossary } from "@/content";
import { LessonSchema } from "@/content/schema";

describe("content", () => {
  const { paths, lessons } = loadContent();

  it("loads and validates every lesson", () => {
    expect(lessons).toHaveLength(21);
    expect(lessons.reduce((n, l) => n + l.steps.length, 0)).toBe(131);
  });

  it("gives every path at least one lesson, with unique order numbers", () => {
    for (const p of paths) {
      const orders = lessons.filter((l) => l.path === p.id).map((l) => l.order);
      expect(orders.length).toBeGreaterThan(0);
      expect(new Set(orders).size).toBe(orders.length);
    }
  });

  it("keeps Path 1 free and everything else Pro", () => {
    for (const l of lessons) expect(l.tier).toBe(l.path === "foundations" ? "free" : "pro");
  });

  it("orders lessons by path, then by order", () => {
    expect(lessons.slice(0, 4).map((l) => l.id)).toEqual(["llm-call", "tool-use", "agent-loop", "prompt-injection"]);
  });

  it("rejects a step that points at a missing node", () => {
    const bad = structuredClone(lessons[0]!);
    bad.steps[0]!.to = "nobody";
    expect(LessonSchema.safeParse(bad).success).toBe(false);
  });

  it("builds an index with one URL per lesson", () => {
    const hrefs = lessonIndex().map((l) => l.href);
    expect(new Set(hrefs).size).toBe(21);
    expect(hrefs[0]).toBe("/learn/foundations/llm-call/");
  });

  it("has unique glossary slugs", () => {
    const g = loadGlossary();
    expect(g).toHaveLength(30);
    expect(new Set(g.map((t) => t.slug)).size).toBe(g.length);
  });
});
