// Validate structured model output and retry once with the exact error.
//
// Provider-neutral: implement `Model.respond` with any LLM client that supports
// structured outputs. The schema check is deliberately repeated in code even
// when the provider enforces it, and business rules use TRUSTED data (the real
// order), never values the model claims. Run with: node lab.ts

export const CATEGORIES = ["billing", "technical", "delivery", "account", "other"];
export const PRIORITIES = ["low", "normal", "high", "urgent"];

type FieldRule = { type: "string" | "boolean" | "number"; enum?: string[] };
type Schema = { required: string[]; additionalProperties: false; properties: Record<string, FieldRule> };

// A small subset of JSON Schema: types, required fields, enums, no extra keys.
export const TICKET_SCHEMA: Schema = {
  additionalProperties: false,
  required: ["category", "priority", "refund_requested", "refund_amount_gbp", "summary"],
  properties: {
    category: { type: "string", enum: CATEGORIES },
    priority: { type: "string", enum: PRIORITIES },
    refund_requested: { type: "boolean" },
    refund_amount_gbp: { type: "number" },
    summary: { type: "string" },
  },
};

export type Ticket = { category: string; priority: string; refund_requested: boolean; refund_amount_gbp: number; summary: string };

export function schemaErrors(obj: unknown, schema: Schema = TICKET_SCHEMA): string[] {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return ["answer is not a JSON object"];
  const o = obj as Record<string, unknown>;
  const errors = schema.required.filter((k) => !(k in o)).map((k) => `missing field '${k}'`);
  errors.push(...Object.keys(o).filter((k) => !Object.hasOwn(schema.properties, k)).map((k) => `unexpected field '${k}'`));
  for (const [key, rule] of Object.entries(schema.properties)) {
    if (!(key in o)) continue;
    const value = o[key];
    if (typeof value !== rule.type || (rule.type === "number" && !Number.isFinite(value))) errors.push(`'${key}' must be ${rule.type}`);
    else if (rule.enum && !rule.enum.includes(value as string)) errors.push(`'${key}' must be one of ${JSON.stringify(rule.enum)}`);
  }
  return errors;
}

export function ruleErrors(t: Ticket, orderTotalGbp: number): string[] {
  const errors: string[] = [];
  if (t.refund_amount_gbp < 0) errors.push("refund_amount_gbp must not be negative");
  if (t.refund_amount_gbp > orderTotalGbp) errors.push(`refund_amount_gbp must not exceed order total ${orderTotalGbp}`);
  if (!t.refund_requested && t.refund_amount_gbp !== 0) errors.push("refund_amount_gbp must be 0 when no refund is requested");
  return errors;
}

export type Reply = { text: string; stopReason?: "end_turn" | "max_tokens" | "refusal" };
export type Message = { role: "user" | "assistant"; content: string };
export interface Model {
  respond(messages: Message[]): Promise<Reply>;
}
export type Outcome = { status: "ok" | "needs_human"; ticket: Ticket | null; attempts: number; errors: string[] };

export async function extractTicket(model: Model, email: string, orderTotalGbp: number, maxAttempts = 2): Promise<Outcome> {
  const messages: Message[] = [{ role: "user", content: email }];
  let errors: string[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const reply = await model.respond(messages);
    const stop = reply.stopReason ?? "end_turn";
    if (stop === "refusal") return { status: "needs_human", ticket: null, attempts: attempt, errors: ["model refused"] };
    if (stop === "max_tokens") {
      errors = ["answer was cut off at the output limit"];
    } else {
      let parsed: unknown;
      try {
        parsed = JSON.parse(reply.text);
        errors = schemaErrors(parsed);
        if (!errors.length) errors = ruleErrors(parsed as Ticket, orderTotalGbp);
      } catch {
        errors = ["answer is not valid JSON"];
      }
      if (!errors.length) return { status: "ok", ticket: parsed as Ticket, attempts: attempt, errors: [] };
    }
    messages.push({ role: "assistant", content: reply.text }, { role: "user", content: "Fix these problems and answer again: " + errors.join("; ") });
  }
  return { status: "needs_human", ticket: null, attempts: maxAttempts, errors };
}

if (import.meta.main) {
  const answers = [
    '{"category":"billing","priority":"high","refund_requested":true,"refund_amount_gbp":178,"summary":"Charged twice"}',
    '{"category":"billing","priority":"high","refund_requested":true,"refund_amount_gbp":89,"summary":"Charged twice"}',
  ];
  const demo: Model = { async respond() { return { text: answers.shift()! }; } };
  console.log(await extractTicket(demo, "Charged twice for order A-5521", 89));
}
