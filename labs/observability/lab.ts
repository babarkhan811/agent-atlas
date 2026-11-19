// A tiny tracer for agent runs, using OpenTelemetry GenAI-style names.
//
// Produces nested spans (invoke_agent -> chat / execute_tool), records usage and
// errors on the span where they happen, and leaves message content out unless
// capture is explicitly enabled. In production use the OpenTelemetry SDK and
// export over OTLP instead. Attribute names follow the OpenTelemetry GenAI
// semantic conventions, which are in Development status (checked 2026-11-19).
// Run with: node lab.ts

import { randomBytes } from "node:crypto";

export type Span = {
  name: string; traceId: string; spanId: string; parentId: string | null;
  start: number; end: number | null; status: "OK" | "ERROR";
  attributes: Record<string, unknown>; events: { name: string; message: string }[];
};

export class Tracer {
  captureContent: boolean;
  spans: Span[] = [];
  clock: () => number;
  private stack: Span[] = [];
  private traceId = randomBytes(16).toString("hex");

  constructor(captureContent = false, clock?: () => number) {
    this.captureContent = captureContent;
    let tick = 0;
    this.clock = clock ?? (() => tick++); // deterministic default for tests
  }

  /** Run `fn` inside a span; failures mark the span as an error and are re-thrown. */
  async span<T>(name: string, attributes: Record<string, unknown>, fn: (s: Span) => Promise<T> | T): Promise<T> {
    const parent = this.stack.at(-1);
    const s: Span = { name, traceId: this.traceId, spanId: randomBytes(8).toString("hex"), parentId: parent?.spanId ?? null,
      start: this.clock(), end: null, status: "OK", attributes: { ...attributes }, events: [] };
    this.spans.push(s);
    this.stack.push(s);
    try {
      return await fn(s);
    } catch (e) {
      s.status = "ERROR";
      s.attributes["error.type"] = (e as Error).name;
      s.events.push({ name: "exception", message: (e as Error).message });
      throw e;
    } finally {
      s.end = this.clock();
      this.stack.pop();
    }
  }

  /** Record message content only when capture is enabled; otherwise just its size. */
  content(span: Span, key: string, value: string): void {
    if (this.captureContent) span.attributes[key] = value;
    else span.attributes[`${key}.length`] = value.length;
  }
}

export type ToolCall = { id: string; name: string; input: Record<string, unknown> };
export type ModelTurn = {
  stop_reason: string; text: string; tool_call?: ToolCall;
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
};
export type Model = (messages: unknown[]) => Promise<ModelTurn> | ModelTurn;

/** A minimal agent loop instrumented with spans. */
export async function runAgent(tracer: Tracer, model: Model, tools: Record<string, (args: any) => unknown>,
  question: string, modelId = "example-model", maxRetries = 1): Promise<string> {
  return tracer.span("invoke_agent support-agent", { "gen_ai.operation.name": "invoke_agent" }, async (root) => {
    tracer.content(root, "gen_ai.input.messages", question);
    const messages: unknown[] = [{ role: "user", content: question }];
    for (;;) {
      const reply = await tracer.span(`chat ${modelId}`, { "gen_ai.operation.name": "chat", "gen_ai.provider.name": "anthropic",
        "gen_ai.request.model": modelId }, async (s) => {
        const r = await model(messages);
        const u = r.usage;
        // Convention: input_tokens includes cached tokens; Anthropic reports them separately, so sum.
        s.attributes["gen_ai.usage.input_tokens"] = u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
        s.attributes["gen_ai.usage.cache_read.input_tokens"] = u.cache_read_input_tokens ?? 0;
        s.attributes["gen_ai.usage.output_tokens"] = u.output_tokens;
        s.attributes["gen_ai.response.finish_reasons"] = [r.stop_reason];
        return r;
      });
      if (reply.stop_reason !== "tool_use" || !reply.tool_call) {
        tracer.content(root, "gen_ai.output.messages", reply.text);
        root.attributes["outcome"] = "answered";
        return reply.text;
      }
      const call = reply.tool_call;
      let result: unknown = null;
      for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
          result = await tracer.span(`execute_tool ${call.name}`, { "gen_ai.operation.name": "execute_tool",
            "gen_ai.tool.name": call.name, "gen_ai.tool.call.id": call.id, attempt }, () => {
            const tool = Object.hasOwn(tools, call.name) ? tools[call.name] : undefined;
            if (!tool) throw new Error(`unknown tool ${call.name}`);
            return tool(call.input);
          });
          break;
        } catch (e) {
          result = `ERROR: ${(e as Error).message}`; // reported to the model, not thrown
        }
      }
      messages.push({ role: "assistant", tool_call: call }, { role: "tool", id: call.id, content: result });
    }
  });
}

export function summarize(tracer: Tracer) {
  const op = (s: Span) => s.attributes["gen_ai.operation.name"];
  const chats = tracer.spans.filter((s) => op(s) === "chat");
  const root = tracer.spans.find((s) => s.parentId === null)!;
  const sum = (key: string) => chats.reduce((n, s) => n + (s.attributes[key] as number), 0);
  return {
    modelCalls: chats.length,
    toolCalls: tracer.spans.filter((s) => op(s) === "execute_tool").length,
    errors: tracer.spans.filter((s) => s.status === "ERROR").length,
    inputTokens: sum("gen_ai.usage.input_tokens"),
    outputTokens: sum("gen_ai.usage.output_tokens"),
    duration: (root.end ?? root.start) - root.start,
  };
}

if (import.meta.main) {
  const turns: ModelTurn[] = [
    { stop_reason: "tool_use", text: "", tool_call: { id: "toolu_1", name: "lookup_order", input: { order_id: "A-5521" } },
      usage: { input_tokens: 340, cache_read_input_tokens: 2900, output_tokens: 60 } },
    { stop_reason: "end_turn", text: "Your refund was issued on 3 Nov.", usage: { input_tokens: 120, output_tokens: 40 } },
  ];
  const tracer = new Tracer();
  await runAgent(tracer, () => turns.shift()!, { lookup_order: ({ order_id }) => `${order_id}: refunded` }, "Where is my refund?");
  for (const s of tracer.spans) console.log(`${s.parentId ? "  " : ""}${s.name} [${s.status}]`);
  console.log(summarize(tracer));
}
