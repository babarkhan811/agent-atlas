// A safe tool-calling loop, provider-neutral.
//
// The model only *requests* tools. This loop validates each request against a
// registry and schema, runs it, returns errors as data instead of crashing,
// returns parallel results together, and stops after a fixed number of rounds.
// Plug in any LLM client by implementing `Model.respond`. Run with: node lab.ts

type ParamType = "string" | "number" | "boolean";

export type Tool = {
  fn: (args: Record<string, unknown>) => unknown | Promise<unknown>;
  description: string;
  params: Record<string, ParamType>; // required argument names and types
};
export type ToolCall = { id: string; name: string; input: Record<string, unknown> };
export type Turn = { text: string; toolCalls: ToolCall[] };
export type Message = { role: "user" | "assistant"; content: unknown };
export interface Model {
  respond(messages: Message[], tools: Record<string, Tool>): Promise<Turn>;
}
export type ToolResult = { type: "tool_result"; tool_use_id: string; content: string; is_error: boolean };

export class RoundLimitReached extends Error {}

/** Run one call. Resolves to [content, isError]; never throws. */
export async function execute(call: ToolCall, tools: Record<string, Tool>): Promise<[string, boolean]> {
  const tool = tools[call.name];
  if (!Object.hasOwn(tools, call.name) || !tool) {
    return [`unknown tool '${call.name}'. Available: ${Object.keys(tools).sort().join(", ")}`, true];
  }
  const missing = Object.keys(tool.params).filter((p) => !(p in call.input));
  const extra = Object.keys(call.input).filter((a) => !(a in tool.params));
  const wrong = Object.entries(tool.params).filter(([p, t]) => p in call.input && typeof call.input[p] !== t).map(([p]) => p);
  if (missing.length || extra.length || wrong.length) {
    return [`invalid arguments: missing=${JSON.stringify(missing)} unexpected=${JSON.stringify(extra)} wrong_type=${JSON.stringify(wrong)}`, true];
  }
  try {
    return [String(await tool.fn(call.input)), false];
  } catch (e) {
    // A failing tool is reported to the model, not thrown.
    return [`${call.name} failed: ${(e as Error).message}`, true];
  }
}

export async function run(model: Model, tools: Record<string, Tool>, question: string, maxRounds = 5) {
  const messages: Message[] = [{ role: "user", content: question }];
  const trace: { tool: string; input: Record<string, unknown>; isError: boolean }[] = [];
  for (let round = 0; round < maxRounds; round++) {
    const turn = await model.respond(messages, tools);
    messages.push({ role: "assistant", content: { text: turn.text, toolCalls: turn.toolCalls } });
    if (turn.toolCalls.length === 0) return { answer: turn.text, trace };
    const results: ToolResult[] = [];
    for (const call of turn.toolCalls) {
      const [content, isError] = await execute(call, tools);
      trace.push({ tool: call.name, input: call.input, isError });
      results.push({ type: "tool_result", tool_use_id: call.id, content, is_error: isError });
    }
    messages.push({ role: "user", content: results }); // all results in ONE turn
  }
  throw new RoundLimitReached(`no final answer after ${maxRounds} rounds`);
}

if (import.meta.main) {
  const tools: Record<string, Tool> = {
    get_weather: { fn: ({ city }) => `${city}: 31C, 5% rain`, description: "Current weather for a city.", params: { city: "string" } },
  };
  const demo: Model = {
    async respond(messages) {
      if (messages.length === 1) return { text: "", toolCalls: [{ id: "t1", name: "get_weather", input: { city: "Lahore" } }] };
      const results = messages.at(-1)!.content as ToolResult[];
      return { text: `Weather report: ${results[0]!.content}`, toolCalls: [] };
    },
  };
  console.log((await run(demo, tools, "Do I need an umbrella in Lahore?")).answer);
}
