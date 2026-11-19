// A tiny in-process MCP-style server and client (2026-07-28 rules, simplified).
//
// Implements server/discover, tools/list and tools/call with required
// per-request _meta, UnsupportedProtocolVersion (-32022), resultType, cache
// hints, and the split between protocol errors and tool execution errors.
// Not a complete MCP implementation. Run with: node lab.ts

export const VERSION = "2026-07-28";
const META = "io.modelcontextprotocol/";
export const INVALID_PARAMS = -32602, METHOD_NOT_FOUND = -32601, UNSUPPORTED_VERSION = -32022;

type ParamType = "string" | "number" | "boolean";
export type Tool = { name: string; description: string; params: Record<string, ParamType>; fn: (args: Record<string, unknown>) => unknown };
export type Request = { jsonrpc: "2.0"; id: number | string; method: string; params?: Record<string, any> };
export type Response = { jsonrpc: "2.0"; id: number | string | undefined; result?: Record<string, any>; error?: { code: number; message: string; data?: unknown } };

const toolError = (text: string) => ({ content: [{ type: "text", text }], isError: true });
const err = (id: Request["id"] | undefined, code: number, message: string, data?: unknown): Response =>
  ({ jsonrpc: "2.0", id, error: data === undefined ? { code, message } : { code, message, data } });

export class Server {
  tools: Tool[];
  supportedVersions: string[];
  constructor(tools: Tool[], supportedVersions: string[] = [VERSION]) {
    this.tools = tools;
    this.supportedVersions = supportedVersions;
  }

  handle(req: Request): Response {
    const params = req.params ?? {};
    const meta = params._meta ?? {};
    const version = meta[META + "protocolVersion"];
    if (version === undefined || !(META + "clientCapabilities" in meta)) return err(req.id, INVALID_PARAMS, "missing required _meta fields");
    if (!this.supportedVersions.includes(version)) {
      return err(req.id, UNSUPPORTED_VERSION, `unsupported protocol version ${version}`, { supported: this.supportedVersions });
    }
    let result: Record<string, any>;
    if (req.method === "server/discover") {
      result = { supportedVersions: this.supportedVersions, capabilities: { tools: {} }, ttlMs: 3_600_000, cacheScope: "public" };
    } else if (req.method === "tools/list") {
      const tools = [...this.tools].sort((a, b) => a.name.localeCompare(b.name)).map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: {
          type: "object",
          properties: Object.fromEntries(Object.entries(t.params).map(([p, ty]) => [p, { type: ty }])),
          required: Object.keys(t.params),
          additionalProperties: false,
        },
      }));
      result = { tools, ttlMs: 300_000, cacheScope: "private" };
    } else if (req.method === "tools/call") {
      const tool = this.tools.find((t) => t.name === params.name);
      if (!tool) return err(req.id, INVALID_PARAMS, `Unknown tool: ${params.name}`); // protocol error
      result = this.call(tool, params.arguments ?? {});
    } else {
      return err(req.id, METHOD_NOT_FOUND, `method not found: ${req.method}`);
    }
    return { jsonrpc: "2.0", id: req.id, result: { resultType: "complete", ...result, _meta: { [META + "serverInfo"]: { name: "lab-server", version: "1.0.0" } } } };
  }

  private call(tool: Tool, args: Record<string, unknown>) {
    const problems = [
      ...Object.keys(tool.params).filter((p) => !(p in args)).map((p) => `missing ${p}`),
      ...Object.keys(args).filter((a) => !(a in tool.params)).map((a) => `unexpected ${a}`),
      ...Object.entries(tool.params).filter(([p, t]) => p in args && typeof args[p] !== t).map(([p, t]) => `${p} must be ${t}`),
    ];
    if (problems.length) return toolError(`Invalid arguments: ${problems.join("; ")}`); // tool execution error
    try {
      const value = tool.fn(args);
      return { content: [{ type: "text", text: JSON.stringify(value) }], structuredContent: value, isError: false };
    } catch (e) {
      return toolError(`${tool.name} failed: ${(e as Error).message}`);
    }
  }
}

/** Adds the required _meta to every request, because the protocol is stateless. */
export class Client {
  server: Server;
  version: string;
  private next = 0;
  constructor(server: Server, version = VERSION) {
    this.server = server;
    this.version = version;
  }

  request(method: string, params: Record<string, unknown> = {}): Response {
    const _meta = { [META + "protocolVersion"]: this.version, [META + "clientCapabilities"]: {}, [META + "clientInfo"]: { name: "lab-client", version: "1.0.0" } };
    return this.server.handle({ jsonrpc: "2.0", id: ++this.next, method, params: { ...params, _meta } });
  }
}

if (import.meta.main) {
  const client = new Client(new Server([
    { name: "create_issue", description: "Open an issue", params: { repo: "string", title: "string" },
      fn: ({ repo, title }) => ({ number: 212, url: `https://github.com/${repo}/issues/212`, title }) },
  ]));
  console.log(JSON.stringify(client.request("tools/list"), null, 2));
  console.log(JSON.stringify(client.request("tools/call", { name: "create_issue", arguments: { repo: "acme/web", title: "Dark mode" } }), null, 2));
}
