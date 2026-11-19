import assert from "node:assert/strict";
import { test } from "node:test";
import { HEADER_MISMATCH, RESOURCE, VERSION, handle, s256, verifyPkce, type Body, type TokenInfo } from "./lab.ts";

const NOW = 1_000_000;
const TOKENS: Record<string, TokenInfo> = {
  reader: { aud: RESOURCE, scope: "tickets:read", exp: NOW + 600 },
  writer: { aud: RESOURCE, scope: "tickets:read tickets:write", exp: NOW + 600 },
  "other-audience": { aud: "https://hr.example.com/api", scope: "tickets:write", exp: NOW + 600 },
  expired: { aud: RESOURCE, scope: "tickets:write", exp: NOW - 1 },
};

function request(method = "tools/call", token?: string, overrides: Record<string, string> = {}): [Record<string, string>, Body] {
  const params: Record<string, any> = { _meta: { "io.modelcontextprotocol/protocolVersion": VERSION, "io.modelcontextprotocol/clientCapabilities": {} } };
  const headers: Record<string, string> = { "MCP-Protocol-Version": VERSION, "Mcp-Method": method };
  if (method === "tools/call") {
    params.name = "create_ticket";
    params.arguments = { title: "Printer on fire" };
    headers["Mcp-Name"] = "create_ticket";
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  return [{ ...headers, ...overrides }, { jsonrpc: "2.0", id: 1, method, params }];
}
const call = (method?: string, token?: string, overrides?: Record<string, string>) => handle(...request(method, token, overrides), TOKENS, NOW);

test("missing token gets a challenge with metadata and scope", () => {
  const r = call("tools/list");
  assert.equal(r.status, 401);
  assert.match(r.headers["WWW-Authenticate"]!, /resource_metadata="https:\/\/mcp\.example\.com\/\.well-known\/oauth-protected-resource"/);
  assert.match(r.headers["WWW-Authenticate"]!, /scope="tickets:read"/);
});

test("valid token passes", () => assert.equal(call("tools/call", "writer").status, 200));

test("header names are case-insensitive", () => {
  const [headers, body] = request("tools/call", "writer");
  const lowered = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  assert.equal(handle(lowered, body, TOKENS, NOW).status, 200);
});

test("insufficient scope is a 403 step-up challenge", () => {
  const r = call("tools/call", "reader");
  assert.equal(r.status, 403);
  assert.match(r.headers["WWW-Authenticate"]!, /error="insufficient_scope"/);
  assert.match(r.headers["WWW-Authenticate"]!, /scope="tickets:write"/);
});

test("wrong audience is rejected", () => {
  const r = call("tools/call", "other-audience");
  assert.equal(r.status, 401);
  assert.match(r.headers["WWW-Authenticate"]!, /audience/);
});

test("expired token is rejected", () => assert.equal(call("tools/call", "expired").status, 401));

test("header/body mismatch", () => {
  const r = call("tools/call", "writer", { "Mcp-Name": "delete_everything" });
  assert.equal(r.status, 400);
  assert.equal(r.body!.error.code, HEADER_MISMATCH);
});

test("missing version header", () => {
  const [headers, body] = request("tools/call", "writer");
  delete headers["MCP-Protocol-Version"];
  assert.equal(handle(headers, body, TOKENS, NOW).body!.error.code, HEADER_MISMATCH);
});

test("PKCE matches the RFC 7636 example", () => {
  const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  assert.equal(s256(verifier), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  assert.equal(verifyPkce(verifier, s256(verifier)), true);
  assert.equal(verifyPkce("attacker-guess", s256(verifier)), false);
});
