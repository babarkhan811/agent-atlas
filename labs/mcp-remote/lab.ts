// Server-side checks for a remote MCP request (Streamable HTTP + OAuth), simplified.
//
// 1. Required headers and header/body consistency -> 400 + HeaderMismatch (-32020)
// 2. Missing or invalid token                      -> 401 + WWW-Authenticate resource_metadata
// 3. Token for another audience                    -> 401
// 4. Missing scope                                 -> 403 + error="insufficient_scope"
// 5. PKCE S256 helpers (RFC 7636)
// Tokens are looked up in a map for the lab; real servers verify signatures or
// use token introspection. Run the tests with: node --test

import { createHash } from "node:crypto";

export const VERSION = "2026-07-28";
export const RESOURCE = "https://mcp.example.com/mcp";
const METADATA_URL = "https://mcp.example.com/.well-known/oauth-protected-resource";
export const HEADER_MISMATCH = -32020;
const NAMED_METHODS: Record<string, string> = { "tools/call": "name", "resources/read": "uri", "prompts/get": "name" };
const SCOPES: Record<string, string> = { "tools/list": "tickets:read", "tools/call": "tickets:write" };

export type TokenInfo = { aud: string; scope: string; exp: number };
export type Reply = { status: number; headers: Record<string, string>; body?: Record<string, any> };
export type Body = { jsonrpc: "2.0"; id: number | string; method: string; params?: Record<string, any> };

const lower = (h: Record<string, string>) => Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toLowerCase(), v]));

function challenge(status: number, params: Record<string, string>): Reply {
  const parts = [`resource_metadata="${METADATA_URL}"`, ...Object.entries(params).map(([k, v]) => `${k}="${v}"`)];
  return { status, headers: { "WWW-Authenticate": `Bearer ${parts.join(", ")}` } };
}

const mismatch = (id: Body["id"], message: string): Reply =>
  ({ status: 400, headers: {}, body: { jsonrpc: "2.0", id, error: { code: HEADER_MISMATCH, message } } });

export function checkHeaders(headers: Record<string, string>, body: Body): Reply | null {
  const h = lower(headers); // header names are case-insensitive
  const params = body.params ?? {};
  const bodyVersion = params._meta?.["io.modelcontextprotocol/protocolVersion"];
  if (h["mcp-protocol-version"] !== bodyVersion) return mismatch(body.id, "MCP-Protocol-Version header missing or does not match _meta");
  if (h["mcp-method"] !== body.method) return mismatch(body.id, "Mcp-Method header missing or does not match body");
  const field = NAMED_METHODS[body.method];
  if (field && h["mcp-name"] !== params[field]) return mismatch(body.id, "Mcp-Name header missing or does not match body");
  return null;
}

export function checkToken(headers: Record<string, string>, method: string, tokens: Record<string, TokenInfo>, now = Date.now() / 1000): Reply | null {
  const auth = lower(headers)["authorization"] ?? "";
  const needed = SCOPES[method] ?? "tickets:read";
  if (!auth.startsWith("Bearer ")) return challenge(401, { scope: needed });
  const key = auth.slice("Bearer ".length);
  const info = Object.hasOwn(tokens, key) ? tokens[key] : undefined;
  if (!info || info.exp <= now) return challenge(401, { error: "invalid_token" });
  if (info.aud !== RESOURCE) return challenge(401, { error: "invalid_token", error_description: "token audience is not this server" });
  if (!info.scope.split(" ").includes(needed)) return challenge(403, { error: "insufficient_scope", scope: needed });
  return null;
}

export function handle(headers: Record<string, string>, body: Body, tokens: Record<string, TokenInfo>, now?: number): Reply {
  const problem = checkHeaders(headers, body) ?? checkToken(headers, body.method, tokens, now);
  if (problem) return problem;
  return { status: 200, headers: { "Content-Type": "application/json" }, body: { jsonrpc: "2.0", id: body.id, result: { resultType: "complete" } } };
}

/** PKCE code_challenge = BASE64URL(SHA256(verifier)) without padding. */
export const s256 = (verifier: string) => createHash("sha256").update(verifier, "ascii").digest("base64url");
export const verifyPkce = (verifier: string, challengeValue: string) => s256(verifier) === challengeValue;

if (import.meta.main) {
  const body: Body = { jsonrpc: "2.0", id: 1, method: "tools/list",
    params: { _meta: { "io.modelcontextprotocol/protocolVersion": VERSION, "io.modelcontextprotocol/clientCapabilities": {} } } };
  console.log(handle({ "MCP-Protocol-Version": VERSION, "Mcp-Method": "tools/list" }, body, {}));
}
