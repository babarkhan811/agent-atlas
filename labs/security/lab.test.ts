import assert from "node:assert/strict";
import { test } from "node:test";
import { RateLimiter, triage, type LLM, type Message, type Reply, type Tool, type ToolCall } from "./lab.ts";

function scripted(replies: Reply[]) {
  const seen: Message[][] = [];
  const llm: LLM = { async chat(_s, messages) { seen.push(messages.map((m) => ({ ...m }))); return replies.shift()!; } };
  return { llm, seen, toolResults: () => seen.at(-1)!.filter((m) => m.role === "tool").map((m) => m.content) };
}

function makeTools(calls: string[][]): Record<string, Tool> {
  return {
    lookup_ip: { fn: ({ ip }) => { calls.push(["lookup_ip", String(ip)]); return "on 2 blocklists"; }, risk: "read", params: { ip: "string" } },
    isolate_host: { fn: ({ host }) => { calls.push(["isolate", String(host)]); return "isolated"; }, risk: "disruptive", params: { host: "string" } },
  };
}

async function run(replies: Reply[], approve = true, limits: Record<string, number> = { read: 100, disruptive: 5 }, maxSteps = 10) {
  const calls: string[][] = [], log: unknown[][] = [];
  const s = scripted(replies);
  const verdict = await triage({ id: "A1", host: "HR-PC-07" }, s.llm, makeTools(calls), async () => approve,
    (...entry) => log.push(entry), new RateLimiter(limits), maxSteps);
  return { verdict, calls, log, s };
}
const call = (id: string, name: string, args: Record<string, unknown>): ToolCall => ({ id, name, args });

test("happy path", async () => {
  const r = await run([{ text: "", toolCalls: [call("1", "lookup_ip", { ip: "203.0.113.5" })] }, { text: "malicious, confidence 0.9", toolCalls: [] }]);
  assert.equal(r.verdict, "malicious, confidence 0.9");
  assert.deepEqual(r.calls, [["lookup_ip", "203.0.113.5"]]);
  assert.equal(r.log.length, 1);
});

test("unknown tool is reported, not thrown", async () => {
  const r = await run([{ text: "", toolCalls: [call("1", "delete_everything", {})] }, { text: "unsure", toolCalls: [] }]);
  assert.deepEqual(r.calls, []);
  assert.match(r.s.toolResults()[0]!, /unknown tool 'delete_everything'/);
});

test("invalid arguments are rejected", async () => {
  const r = await run([{ text: "", toolCalls: [call("1", "lookup_ip", { ip: 42, x: 1 })] }, { text: "unsure", toolCalls: [] }]);
  assert.deepEqual(r.calls, []);
  assert.match(r.s.toolResults()[0]!, /unexpected \["x"\]/);
  assert.match(r.s.toolResults()[0]!, /wrong type for \["ip"\]/);
});

test("disruptive action needs approval", async () => {
  const r = await run([{ text: "", toolCalls: [call("1", "isolate_host", { host: "HR-PC-07" })] }, { text: "done", toolCalls: [] }], false);
  assert.deepEqual(r.calls, []);
  assert.deepEqual(r.s.toolResults(), ["DENIED: analyst did not approve"]);
});

test("hourly limit blocks extra actions", async () => {
  const isolate = (i: number) => call(String(i), "isolate_host", { host: `PC-${i}` });
  const r = await run([{ text: "", toolCalls: [isolate(1), isolate(2)] }, { text: "done", toolCalls: [] }], true, { read: 100, disruptive: 1 });
  assert.deepEqual(r.calls, [["isolate", "PC-1"]]);
  assert.match(r.s.toolResults()[1]!, /hourly limit reached/);
});

test("rate limiter window slides", () => {
  let now = 0;
  const limiter = new RateLimiter({ read: 1 }, () => now);
  assert.equal(limiter.allow("read"), true);
  assert.equal(limiter.allow("read"), false);
  now = 3600;
  assert.equal(limiter.allow("read"), true);
});

test("step limit escalates", async () => {
  const loop = [0, 1, 2].map((i) => ({ text: "", toolCalls: [call(String(i), "lookup_ip", { ip: "1.1.1.1" })] }));
  const r = await run(loop, true, undefined, 3);
  assert.match(r.verdict, /^ESCALATED/);
});

test("alert is wrapped as untrusted data", async () => {
  const r = await run([{ text: "benign", toolCalls: [] }]);
  assert.match(r.s.seen[0]![0]!.content, /^<alert>/);
});
