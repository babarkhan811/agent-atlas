"""Server-side checks for a remote MCP request (Streamable HTTP + OAuth), simplified.

1. Required headers and header/body consistency  -> 400 + HeaderMismatch (-32020)
2. Missing or invalid token                       -> 401 + WWW-Authenticate resource_metadata
3. Token for another audience                     -> 401
4. Missing scope                                  -> 403 + error="insufficient_scope"
5. PKCE S256 helpers (RFC 7636)

Tokens are looked up in a dict for the lab; real servers verify signatures or
use token introspection.
"""
from __future__ import annotations

import base64
import hashlib
import time
from dataclasses import dataclass

VERSION = "2026-07-28"
RESOURCE = "https://mcp.example.com/mcp"
METADATA_URL = "https://mcp.example.com/.well-known/oauth-protected-resource"
HEADER_MISMATCH = -32020
NAMED_METHODS = {"tools/call": "name", "resources/read": "uri", "prompts/get": "name"}
SCOPES = {"tools/list": "tickets:read", "tools/call": "tickets:write"}


@dataclass
class Reply:
    status: int
    headers: dict
    body: dict | None = None


def challenge(status: int, **params: str) -> Reply:
    parts = [f'resource_metadata="{METADATA_URL}"'] + [f'{k}="{v}"' for k, v in params.items()]
    return Reply(status, {"WWW-Authenticate": "Bearer " + ", ".join(parts)})


def mismatch(rid, message: str) -> Reply:
    return Reply(400, {}, {"jsonrpc": "2.0", "id": rid, "error": {"code": HEADER_MISMATCH, "message": message}})


def check_headers(headers: dict, body: dict) -> Reply | None:
    h = {k.lower(): v for k, v in headers.items()}  # header names are case-insensitive
    rid, method, params = body.get("id"), body.get("method"), body.get("params") or {}
    body_version = (params.get("_meta") or {}).get("io.modelcontextprotocol/protocolVersion")
    if h.get("mcp-protocol-version") != body_version:
        return mismatch(rid, "MCP-Protocol-Version header missing or does not match _meta")
    if h.get("mcp-method") != method:
        return mismatch(rid, "Mcp-Method header missing or does not match body")
    if method in NAMED_METHODS and h.get("mcp-name") != params.get(NAMED_METHODS[method]):
        return mismatch(rid, "Mcp-Name header missing or does not match body")
    return None


def check_token(headers: dict, method: str, tokens: dict, now: float | None = None) -> Reply | None:
    now = time.time() if now is None else now
    auth = {k.lower(): v for k, v in headers.items()}.get("authorization", "")
    needed = SCOPES.get(method, "tickets:read")
    if not auth.startswith("Bearer "):
        return challenge(401, scope=needed)
    info = tokens.get(auth[len("Bearer "):])
    if info is None or info["exp"] <= now:
        return challenge(401, error="invalid_token")
    if info["aud"] != RESOURCE:  # issued for someone else: never accept (no passthrough)
        return challenge(401, error="invalid_token", error_description="token audience is not this server")
    if needed not in info["scope"].split():
        return challenge(403, error="insufficient_scope", scope=needed)
    return None


def handle(headers: dict, body: dict, tokens: dict, now: float | None = None) -> Reply:
    problem = check_headers(headers, body) or check_token(headers, body.get("method", ""), tokens, now)
    if problem:
        return problem
    return Reply(200, {"Content-Type": "application/json"},
                 {"jsonrpc": "2.0", "id": body.get("id"), "result": {"resultType": "complete"}})


def s256(verifier: str) -> str:
    """PKCE code_challenge = BASE64URL(SHA256(verifier)) without padding."""
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


def verify_pkce(verifier: str, challenge_value: str) -> bool:
    return s256(verifier) == challenge_value


if __name__ == "__main__":
    body = {"jsonrpc": "2.0", "id": 1, "method": "tools/list",
            "params": {"_meta": {"io.modelcontextprotocol/protocolVersion": VERSION,
                                 "io.modelcontextprotocol/clientCapabilities": {}}}}
    headers = {"MCP-Protocol-Version": VERSION, "Mcp-Method": "tools/list"}
    print(handle(headers, body, tokens={}))
