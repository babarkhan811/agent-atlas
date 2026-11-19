import assert from "node:assert/strict";
import { test } from "node:test";
import { Client, INVALID_PARAMS, METHOD_NOT_FOUND, Server, UNSUPPORTED_VERSION, VERSION, type Tool } from "./lab.ts";

const tools: Tool[] = [
  { name: "search_code", description: "Search code", params: { query: "string" }, fn: () => ({ hits: 3 }) },
  { name: "create_issue", description: "Open an issue", params: { repo: "string", title: "string" }, fn: ({ repo, title }) => ({ number: 212, repo, title }) },
  { name: "broken", description: "Always fails", params: { repo: "string", title: "string" }, fn: () => { throw new Error("repository not found"); } },
];
const client = () => new Client(new Server(tools));

test("discover lists versions and cache hints", () => {
  const r = client().request("server/discover").result!;
  assert.equal(r.resultType, "complete");
  assert.deepEqual(r.supportedVersions, [VERSION]);
  assert.ok("ttlMs" in r);
  assert.ok("io.modelcontextprotocol/serverInfo" in r._meta);
});

test("tools/list is deterministic with schemas", () => {
  const list = client().request("tools/list").result!.tools;
  assert.deepEqual(list.map((t: { name: string }) => t.name), ["broken", "create_issue", "search_code"]);
  assert.deepEqual(list[1].inputSchema.required, ["repo", "title"]);
});

test("successful call", () => {
  const r = client().request("tools/call", { name: "create_issue", arguments: { repo: "acme/web", title: "Bug" } }).result!;
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.number, 212);
});

test("unknown tool is a protocol error", () => {
  assert.equal(client().request("tools/call", { name: "delete_repo", arguments: {} }).error!.code, INVALID_PARAMS);
});

test("bad arguments are a tool execution error", () => {
  const r = client().request("tools/call", { name: "create_issue", arguments: { repo: 7 } }).result!;
  assert.equal(r.isError, true);
  assert.match(r.content[0].text, /missing title/);
  assert.match(r.content[0].text, /repo must be string/);
});

test("tool failure is reported, not thrown", () => {
  const r = client().request("tools/call", { name: "broken", arguments: { repo: "x", title: "y" } }).result!;
  assert.equal(r.isError, true);
  assert.match(r.content[0].text, /repository not found/);
});

test("missing _meta is invalid params", () => {
  const r = new Server(tools).handle({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
  assert.equal(r.error!.code, INVALID_PARAMS);
});

test("unsupported version lists supported ones", () => {
  const r = new Client(new Server(tools), "2024-11-05").request("tools/list");
  assert.equal(r.error!.code, UNSUPPORTED_VERSION);
  assert.deepEqual(r.error!.data, { supported: [VERSION] });
});

test("unknown method", () => {
  assert.equal(client().request("initialize").error!.code, METHOD_NOT_FOUND);
});
