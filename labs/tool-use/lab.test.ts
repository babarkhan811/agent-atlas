import assert from "node:assert/strict";
import { test } from "node:test";
import { RoundLimitReached, run, type Message, type Model, type Tool, type ToolResult, type Turn } from "./lab.ts";

function scripted(turns: Turn[]) {
  const seen: Message[][] = [];
  const model: Model = { async respond(messages) { seen.push([...messages]); return turns.shift()!; } };
  return { model, seen, lastResults: () => seen.at(-1)!.at(-1)!.content as ToolResult[] };
}

const TOOLS: Record<string, Tool> = {
  get_weather: {
    fn: ({ city }) => { if (city === "Atlantis") throw new Error("city not found"); return `${city}: 31C, 5% rain`; },
    description: "Current weather for a city.",
    params: { city: "string" },
  },
};
const call = (id: string, name: string, input: Record<string, unknown>) => ({ id, name, input });

test("round trip", async () => {
  const s = scripted([{ text: "", toolCalls: [call("t1", "get_weather", { city: "Lahore" })] }, { text: "No umbrella needed.", toolCalls: [] }]);
  const { answer, trace } = await run(s.model, TOOLS, "Umbrella?");
  assert.equal(answer, "No umbrella needed.");
  assert.deepEqual(s.lastResults()[0], { type: "tool_result", tool_use_id: "t1", content: "Lahore: 31C, 5% rain", is_error: false });
  assert.deepEqual(trace, [{ tool: "get_weather", input: { city: "Lahore" }, isError: false }]);
});

test("unknown tool becomes an error result", async () => {
  const s = scripted([{ text: "", toolCalls: [call("t1", "send_email", {})] }, { text: "Sorry.", toolCalls: [] }]);
  await run(s.model, TOOLS, "Umbrella?");
  assert.equal(s.lastResults()[0]!.is_error, true);
  assert.match(s.lastResults()[0]!.content, /unknown tool 'send_email'/);
});

test("prototype keys are not treated as tools", async () => {
  const s = scripted([{ text: "", toolCalls: [call("t1", "toString", {})] }, { text: "Sorry.", toolCalls: [] }]);
  await run(s.model, TOOLS, "Umbrella?");
  assert.match(s.lastResults()[0]!.content, /unknown tool 'toString'/);
});

test("invalid arguments are rejected", async () => {
  const s = scripted([{ text: "", toolCalls: [call("t1", "get_weather", { city: 42, units: "F" })] }, { text: "Sorry.", toolCalls: [] }]);
  await run(s.model, TOOLS, "Umbrella?");
  assert.match(s.lastResults()[0]!.content, /unexpected=\["units"\]/);
  assert.match(s.lastResults()[0]!.content, /wrong_type=\["city"\]/);
});

test("a tool exception is reported, not thrown", async () => {
  const s = scripted([{ text: "", toolCalls: [call("t1", "get_weather", { city: "Atlantis" })] }, { text: "Unknown city.", toolCalls: [] }]);
  const { answer, trace } = await run(s.model, TOOLS, "Atlantis?");
  assert.equal(answer, "Unknown city.");
  assert.equal(trace[0]!.isError, true);
});

test("parallel calls return in one turn", async () => {
  const s = scripted([
    { text: "", toolCalls: [call("a", "get_weather", { city: "Lahore" }), call("b", "get_weather", { city: "Karachi" })] },
    { text: "Both dry.", toolCalls: [] },
  ]);
  await run(s.model, TOOLS, "Lahore and Karachi?");
  assert.deepEqual(s.lastResults().map((r) => r.tool_use_id), ["a", "b"]);
});

test("round limit", async () => {
  const loop = [0, 1, 2].map((i) => ({ text: "", toolCalls: [call(String(i), "get_weather", { city: "Lahore" })] }));
  await assert.rejects(run(scripted(loop).model, TOOLS, "Umbrella?", 3), RoundLimitReached);
});
