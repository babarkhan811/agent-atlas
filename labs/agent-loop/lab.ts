// An agent loop with budgets and loop detection, provider-neutral.
//
// The runtime drives a model through tool calls and stops for one of four
// reasons: the model finished, the turn budget ran out, the token budget ran
// out, or the agent kept repeating the same call. Plug in any LLM client by
// implementing `Model.respond`. Run with: node lab.ts

export type ToolCall = { id: string; name: string; input: Record<string, unknown> };
export type Turn = { text: string; toolCalls: ToolCall[]; tokens: number };
export interface Model {
  respond(messages: unknown[]): Promise<Turn>;
}
export type Budget = { maxTurns: number; maxTokens: number; maxRepeats: number };
export type Stop = "done" | "max_turns" | "max_tokens" | "loop_detected";
export type RunResult = { stop: Stop; answer: string; turns: number; tokens: number; calls: string[] };

export const DEFAULT_BUDGET: Budget = { maxTurns: 10, maxTokens: 50_000, maxRepeats: 3 };

/** Tool name plus canonical JSON input, so argument order doesn't matter. */
export function callKey(call: ToolCall): string {
  const sorted = Object.fromEntries(Object.entries(call.input).sort(([a], [b]) => a.localeCompare(b)));
  return `${call.name}:${JSON.stringify(sorted)}`;
}

export async function run(
  model: Model, tools: Record<string, (input: Record<string, unknown>) => unknown>, goal: string, budget: Budget = DEFAULT_BUDGET,
): Promise<RunResult> {
  const messages: unknown[] = [{ role: "user", content: goal }];
  const seen = new Map<string, number>();
  const calls: string[] = [];
  let tokens = 0;
  for (let turnNo = 1; turnNo <= budget.maxTurns; turnNo++) {
    const turn = await model.respond(messages);
    tokens += turn.tokens;
    if (tokens > budget.maxTokens) return { stop: "max_tokens", answer: "", turns: turnNo, tokens, calls };
    if (turn.toolCalls.length === 0) return { stop: "done", answer: turn.text, turns: turnNo, tokens, calls };
    const results = [];
    for (const call of turn.toolCalls) {
      const key = callKey(call);
      seen.set(key, (seen.get(key) ?? 0) + 1);
      if (seen.get(key)! > budget.maxRepeats) return { stop: "loop_detected", answer: "", turns: turnNo, tokens, calls };
      calls.push(call.name);
      const fn = Object.hasOwn(tools, call.name) ? tools[call.name] : undefined;
      let content: string, isError: boolean;
      try {
        [content, isError] = fn ? [String(await fn(call.input)), false] : [`unknown tool '${call.name}'`, true];
      } catch (e) {
        [content, isError] = [`${call.name} failed: ${(e as Error).message}`, true];
      }
      results.push({ tool_use_id: call.id, content, is_error: isError });
    }
    messages.push({ role: "assistant", toolCalls: turn.toolCalls });
    messages.push({ role: "user", content: results });
  }
  return { stop: "max_turns", answer: "", turns: budget.maxTurns, tokens, calls };
}

if (import.meta.main) {
  const demo: Model = {
    async respond(messages) {
      if (messages.length === 1) return { text: "", toolCalls: [{ id: "t1", name: "list_issues", input: { state: "open" } }], tokens: 1200 };
      return { text: "Report: 12 open bugs", toolCalls: [], tokens: 2600 };
    },
  };
  const r = await run(demo, { list_issues: () => "12 open bugs" }, "Summarise open bugs");
  console.log(r.stop, "|", r.answer, "|", r.turns, "turns,", r.tokens, "tokens");
}
