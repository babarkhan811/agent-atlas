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

export const StepSchema = z.object({
  from: slug,
  to: slug,
  label: z.string().min(1),
  title: z.string().min(1),
  text: z.string(),
  payload: z.array(PayloadRowSchema).min(1),
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
  })
  .superRefine((l, ctx) => {
    const ids = new Set<string>();
    for (const n of l.nodes) {
      if (ids.has(n.id)) ctx.addIssue({ code: "custom", message: `duplicate node id "${n.id}"` });
      ids.add(n.id);
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
