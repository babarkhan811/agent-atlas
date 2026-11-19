import { z } from "zod";

export const KINDS = ["user", "app", "model", "tool", "data", "external", "guard"] as const;
export const PATH_IDS = ["foundations", "knowledge-protocols", "reliable-agents", "security"] as const;

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be kebab-case");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

export const NodeSchema = z.object({
  id: slug,
  label: z.string().min(1),
  kind: z.enum(KINDS),
  // Position on the stage, in percent of width/height.
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  icon: z.string().optional(),
});

// [field, value, plain-English note]
export const PayloadRowSchema = z.tuple([z.string().min(1), z.string(), z.string()]);

// Prose fields use a tiny markup: paragraphs separated by a blank line, `code` in backticks.
const prose = z.string().min(1);

/** Narration of one step at each depth level shown by the Depth switch. */
export const DepthSchema = z.object({ beginner: prose, practitioner: prose, expert: prose });

/** The step's section in the walkthrough article below the simulation. */
export const WalkSchema = z.object({ why: prose, wrong: prose, example: prose });

/** How other providers express the same message (shown at Expert depth). */
export const ProviderNotesSchema = z.object({ anthropic: prose.optional(), openai: prose.optional(), gemini: prose.optional() });

export const StepSchema = z.object({
  from: slug,
  to: slug,
  label: z.string().min(1),
  title: z.string().min(1),
  text: z.string(),
  payload: z.array(PayloadRowSchema).min(1),
  depth: DepthSchema.optional(),
  walk: WalkSchema.optional(),
  providers: ProviderNotesSchema.optional(),
  /** Optional "predict, then reveal" pause shown before this step plays. */
  predict: z.object({ question: prose, reveal: prose }).optional(),
});

export const QuizQuestionSchema = z.object({
  q: prose,
  options: z.array(z.string().min(1)).min(2).max(5),
  answer: z.number().int().min(0),
  explain: prose,
});

export const ArticleSchema = z.object({
  promise: prose,
  thirtySeconds: z.array(prose).length(3),
  whyItMatters: prose,
  analogy: prose,
  audience: prose,
  minutes: z.number().int().positive(),
  prerequisites: z.array(z.string()).default([]), // lesson ids
  deepDives: z.array(z.object({ title: z.string().min(1), body: prose })).min(2).max(4),
  production: z.array(z.object({ title: z.string().min(1), body: prose })).min(3),
  lab: z.object({
    title: z.string().min(1),
    intro: prose,
    dir: z.string().regex(/^labs\/[a-z0-9-]+$/), // folder with lab.py and lab.ts
  }).optional(),
  takeaways: z.array(prose).length(5),
  faq: z.array(z.object({ q: z.string().min(1), a: prose })).min(3).max(5),
  related: z.array(z.string()).default([]), // lesson ids
});

export const SourceSchema = z.object({ title: z.string().min(1), url: z.url() });

export const LessonSchema = z
  .object({
    id: slug,
    path: z.enum(PATH_IDS),
    order: z.number().int().positive(),
    tier: z.enum(["free", "pro"]),
    category: z.string().min(1),
    title: z.string().min(1),
    summary: z.string().min(1),
    seoTitle: z.string().optional(),
    seoDescription: z.string().max(170).optional(),
    objectives: z.array(z.string()).default([]),
    lastVerified: isoDate.optional(),
    sources: z.array(SourceSchema).default([]),
    nodes: z.array(NodeSchema).min(2),
    steps: z.array(StepSchema).min(1),
    article: ArticleSchema.optional(),
    quiz: z.array(QuizQuestionSchema).min(3).max(5).optional(),
  })
  .superRefine((l, ctx) => {
    const ids = new Set<string>();
    for (const n of l.nodes) {
      if (ids.has(n.id)) ctx.addIssue({ code: "custom", message: `duplicate node id "${n.id}"` });
      ids.add(n.id);
    }
    l.quiz?.forEach((q, i) => {
      if (q.answer >= q.options.length) ctx.addIssue({ code: "custom", message: `quiz ${i + 1}: answer index out of range` });
    });
    if (l.article) {
      if (!l.quiz) ctx.addIssue({ code: "custom", message: "a lesson with an article also needs a quiz" });
      if (!l.lastVerified || l.sources.length === 0) ctx.addIssue({ code: "custom", message: "a lesson with an article needs lastVerified and sources" });
      if (l.objectives.length !== 3) ctx.addIssue({ code: "custom", message: "a lesson with an article needs exactly 3 objectives" });
      l.steps.forEach((s, i) => {
        if (!s.depth || !s.walk) ctx.addIssue({ code: "custom", message: `step ${i + 1}: rewritten lessons need depth and walk on every step` });
        s.payload.forEach(([k, , note]) => {
          if (!note) ctx.addIssue({ code: "custom", message: `step ${i + 1}: field "${k}" needs a note (annotation standard)` });
        });
      });
    }
    l.steps.forEach((s, i) => {
      for (const end of [s.from, s.to] as const) {
        if (!ids.has(end)) ctx.addIssue({ code: "custom", message: `step ${i + 1} references unknown node "${end}"` });
      }
    });
  });

export const PathSchema = z.object({
  id: z.enum(PATH_IDS),
  order: z.number().int().positive(),
  title: z.string().min(1),
  tier: z.enum(["free", "pro"]),
  description: z.string().min(1),
});

export const GlossaryTermSchema = z.object({ slug, term: z.string().min(1), definition: z.string().min(1) });

export type Kind = (typeof KINDS)[number];
export type PathId = (typeof PATH_IDS)[number];
export type LessonNode = z.infer<typeof NodeSchema>;
export type Step = z.infer<typeof StepSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type LearningPath = z.infer<typeof PathSchema>;
export type GlossaryTerm = z.infer<typeof GlossaryTermSchema>;
export type Article = z.infer<typeof ArticleSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
