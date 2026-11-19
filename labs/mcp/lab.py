"""A tiny in-process MCP-style server and client (2026-07-28 rules, simplified).

Implements server/discover, tools/list and tools/call with:
- required per-request _meta (protocolVersion + clientCapabilities) -> -32602 if missing
- UnsupportedProtocolVersion (-32022) listing supported versions
- resultType on every result, cache hints on list/discover results
- protocol errors (unknown method/tool) vs tool execution errors (isError: true)

Not a complete MCP implementation: no transport, pagination or subscriptions.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Callable

VERSION = "2026-07-28"
META = "io.modelcontextprotocol/"

INVALID_PARAMS, METHOD_NOT_FOUND, UNSUPPORTED_VERSION = -32602, -32601, -32022


@dataclass
class Tool:
    name: str
    description: str
    params: dict[str, type]          # required argument names and types
    fn: Callable[..., Any]


@dataclass
class Server:
    tools: list[Tool]
    supported_versions: list[str] = field(default_factory=lambda: [VERSION])
    name: str = "lab-server"

    def handle(self, request: dict) -> dict:
        rid, method, params = request.get("id"), request.get("method"), request.get("params") or {}
        meta = params.get("_meta") or {}
        version = meta.get(META + "protocolVersion")
        if version is None or META + "clientCapabilities" not in meta:
            return _error(rid, INVALID_PARAMS, "missing required _meta fields")
        if version not in self.supported_versions:
            return _error(rid, UNSUPPORTED_VERSION, f"unsupported protocol version {version}",
                          {"supported": self.supported_versions})
        handler = {"server/discover": self._discover, "tools/list": self._list, "tools/call": self._call}.get(method)
        if handler is None:
            return _error(rid, METHOD_NOT_FOUND, f"method not found: {method}")
        result = handler(params)
        if "error" in result:
            return _error(rid, *result["error"])
        result = {"resultType": "complete", **result,
                  "_meta": {META + "serverInfo": {"name": self.name, "version": "1.0.0"}}}
        return {"jsonrpc": "2.0", "id": rid, "result": result}

    def _discover(self, _params: dict) -> dict:
        return {"supportedVersions": self.supported_versions, "capabilities": {"tools": {}},
                "ttlMs": 3_600_000, "cacheScope": "public"}

    def _list(self, _params: dict) -> dict:
        tools = [{"name": t.name, "description": t.description,
                  "inputSchema": {"type": "object",
                                  "properties": {p: {"type": _json_type(ty)} for p, ty in t.params.items()},
                                  "required": list(t.params), "additionalProperties": False}}
                 for t in sorted(self.tools, key=lambda t: t.name)]  # deterministic order
        return {"tools": tools, "ttlMs": 300_000, "cacheScope": "private"}

    def _call(self, params: dict) -> dict:
        tool = next((t for t in self.tools if t.name == params.get("name")), None)
        if tool is None:  # protocol error: the model is unlikely to fix this by retrying
            return {"error": (INVALID_PARAMS, f"Unknown tool: {params.get('name')}")}
        args = params.get("arguments") or {}
        problems = [f"missing {p}" for p in tool.params if p not in args]
        problems += [f"unexpected {a}" for a in args if a not in tool.params]
        problems += [f"{p} must be {_json_type(ty)}" for p, ty in tool.params.items()
                     if p in args and not isinstance(args[p], ty)]
        if problems:  # tool execution error: actionable feedback for the model
            return _tool_error("Invalid arguments: " + "; ".join(problems))
        try:
            value = tool.fn(**args)
        except Exception as e:
            return _tool_error(f"{tool.name} failed: {e}")
        return {"content": [{"type": "text", "text": json.dumps(value)}], "structuredContent": value, "isError": False}


def _json_type(t: type) -> str:
    return {str: "string", int: "integer", float: "number", bool: "boolean"}.get(t, "object")


def _tool_error(text: str) -> dict:
    return {"content": [{"type": "text", "text": text}], "isError": True}


def _error(rid: Any, code: int, message: str, data: Any = None) -> dict:
    err: dict = {"code": code, "message": message}
    if data is not None:
        err["data"] = data
    return {"jsonrpc": "2.0", "id": rid, "error": err}


class Client:
    """Adds the required _meta to every request, because the protocol is stateless."""

    def __init__(self, server: Server, version: str = VERSION):
        self.server, self.version, self._next = server, version, 0

    def request(self, method: str, **params: Any) -> dict:
        self._next += 1
        params["_meta"] = {META + "protocolVersion": self.version, META + "clientCapabilities": {},
                           META + "clientInfo": {"name": "lab-client", "version": "1.0.0"}}
        return self.server.handle({"jsonrpc": "2.0", "id": self._next, "method": method, "params": params})


if __name__ == "__main__":
    def create_issue(repo: str, title: str) -> dict:
        return {"number": 212, "url": f"https://github.com/{repo}/issues/212", "title": title}

    client = Client(Server([Tool("create_issue", "Open an issue", {"repo": str, "title": str}, create_issue)]))
    print(json.dumps(client.request("tools/list"), indent=2))
    print(json.dumps(client.request("tools/call", name="create_issue", arguments={"repo": "acme/web", "title": "Dark mode"}), indent=2))
