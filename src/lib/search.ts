import type { GlossaryTerm, Lesson } from "@/content/schema";

export type SearchIndex = {
  lessons: { id: string; all: string; steps: string[] }[];
  terms: GlossaryTerm[];
};

const norm = (s: string) => s.toLowerCase();
export const queryWords = (q: string) => norm(q).split(/\s+/).filter(Boolean);

// M5 note: once Pro content is gated, Pro lessons must contribute only title,
// summary and step titles here, never step bodies or payloads.
export function buildSearchIndex(lessons: Lesson[], terms: GlossaryTerm[]): SearchIndex {
  return {
    lessons: lessons.map((l) => {
      const steps = l.steps.map((s) => norm([s.title, s.label, s.text, ...s.payload.flat()].join(" ")));
      return { id: l.id, all: norm(`${l.title} ${l.summary} ${l.category} `) + steps.join(" "), steps };
    }),
    terms,
  };
}

export type LessonHit = { id: string; step: number | null };

/** Lessons containing every query word, with the first step that contains them all (if any). */
export function searchLessons(index: SearchIndex, q: string): LessonHit[] {
  const words = queryWords(q);
  if (!words.length) return [];
  return index.lessons
    .filter((l) => words.every((w) => l.all.includes(w)))
    .map((l) => {
      const i = l.steps.findIndex((s) => words.every((w) => s.includes(w)));
      return { id: l.id, step: i >= 0 ? i : null };
    });
}

export function searchTerms(index: SearchIndex, q: string): GlossaryTerm[] {
  const words = queryWords(q);
  if (!words.length) return [];
  return index.terms.filter((t) => words.every((w) => norm(`${t.term} ${t.definition}`).includes(w)));
}
