import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { lessonIndex, loadContent, loadGlossary } from "@/content";
import { LessonSchema } from "@/content/schema";

describe("content", () => {
  const { paths, lessons } = loadContent();

  it("loads and validates every lesson", () => {
    expect(lessons.length).toBeGreaterThanOrEqual(21);
    expect(new Set(lessons.map((l) => l.id)).size).toBe(lessons.length);
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

  it("brings the three pilot lessons up to the full lesson anatomy", () => {
    for (const id of ["llm-call", "tool-use", "software-plus-ai-agents"]) {
      const l = lessons.find((x) => x.id === id)!;
      expect(l.article, id).toBeDefined();
      expect(l.quiz!.length).toBeGreaterThanOrEqual(3);
      expect(l.sources.length).toBeGreaterThanOrEqual(3);
      for (const s of l.steps) {
        expect(s.depth && s.walk, `${id}: ${s.title}`).toBeTruthy();
        for (const [k, , note] of s.payload) expect(note, `${id}: ${k}`).not.toBe("");
      }
    }
  });

  it("requires sources, a quiz and full annotations once a lesson has an article", () => {
    const l = structuredClone(lessons.find((x) => x.id === "tool-use")!);
    l.steps[0]!.payload[0]![2] = "";
    expect(LessonSchema.safeParse(l).success).toBe(false);
    const noQuiz = structuredClone(lessons.find((x) => x.id === "tool-use")!);
    delete noQuiz.quiz;
    expect(LessonSchema.safeParse(noQuiz).success).toBe(false);
  });

  it("points every lab at a folder with Python and TypeScript files and tests", () => {
    for (const l of lessons.filter((x) => x.article?.lab)) {
      for (const f of ["lab.py", "lab_test.py", "lab.ts", "lab.test.ts"]) {
        expect(fs.existsSync(path.join(l.article!.lab!.dir, f)), `${l.id}: ${f}`).toBe(true);
      }
    }
  });

  it("links prerequisites and related lessons to real lessons", () => {
    const ids = new Set(lessons.map((l) => l.id));
    for (const l of lessons) for (const id of [...(l.article?.prerequisites ?? []), ...(l.article?.related ?? [])]) expect(ids.has(id), `${l.id} -> ${id}`).toBe(true);
  });

  it("rejects a step that points at a missing node", () => {
    const bad = structuredClone(lessons[0]!);
    bad.steps[0]!.to = "nobody";
    expect(LessonSchema.safeParse(bad).success).toBe(false);
  });

  it("builds an index with one URL per lesson", () => {
    const hrefs = lessonIndex().map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs[0]).toBe("/learn/foundations/llm-call/");
  });

  it("has unique glossary slugs", () => {
    const g = loadGlossary();
    expect(g.length).toBeGreaterThanOrEqual(30);
    expect(new Set(g.map((t) => t.slug)).size).toBe(g.length);
  });
});
