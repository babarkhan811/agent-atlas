// Build-time content loader. Server-only: reads and validates JSON from /content.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { GlossaryTermSchema, LessonSchema, PathSchema, type Lesson, type LearningPath } from "./schema";

const ROOT = path.join(process.cwd(), "content");

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
}

let cache: { paths: LearningPath[]; lessons: Lesson[] } | null = null;

export function loadContent() {
  if (cache) return cache;
  const paths = z.array(PathSchema).parse(readJson("paths.json")).sort((a, b) => a.order - b.order);
  const lessons = fs
    .readdirSync(path.join(ROOT, "lessons"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const parsed = LessonSchema.safeParse(readJson(`lessons/${f}`));
      if (!parsed.success) throw new Error(`content/lessons/${f}: ${z.prettifyError(parsed.error)}`);
      if (`${parsed.data.id}.json` !== f) throw new Error(`content/lessons/${f}: id "${parsed.data.id}" must match file name`);
      return parsed.data;
    });
  const pathOrder = new Map(paths.map((p) => [p.id, p.order]));
  lessons.sort((a, b) => pathOrder.get(a.path)! - pathOrder.get(b.path)! || a.order - b.order);
  cache = { paths, lessons };
  return cache;
}

export function loadGlossary() {
  return z.array(GlossaryTermSchema).parse(readJson("glossary.json"));
}

export const lessonHref = (l: Pick<Lesson, "path" | "id">) => `/learn/${l.path}/${l.id}/`;

/** Lightweight lesson list for navigation (no step bodies). */
export function lessonIndex() {
  return loadContent().lessons.map((l) => ({
    id: l.id,
    path: l.path,
    category: l.category,
    title: l.title,
    summary: l.summary,
    tier: l.tier,
    kinds: [...new Set(l.nodes.map((n) => n.kind))],
    stepCount: l.steps.length,
    href: lessonHref(l),
  }));
}
export type LessonIndexItem = ReturnType<typeof lessonIndex>[number];
