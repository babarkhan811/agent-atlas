import unittest

from lab import INVALID_PARAMS, METHOD_NOT_FOUND, UNSUPPORTED_VERSION, VERSION, Client, Server, Tool


def failing(repo: str, title: str):
    raise RuntimeError("repository not found")


def make_server():
    return Server([
        Tool("search_code", "Search code", {"query": str}, lambda query: {"hits": 3}),
        Tool("create_issue", "Open an issue", {"repo": str, "title": str},
             lambda repo, title: {"number": 212, "repo": repo, "title": title}),
        Tool("broken", "Always fails", {"repo": str, "title": str}, failing),
    ])


class McpLabTest(unittest.TestCase):
    def setUp(self):
        self.client = Client(make_server())

    def test_discover_lists_versions_and_caching(self):
        r = self.client.request("server/discover")["result"]
        self.assertEqual(r["resultType"], "complete")
        self.assertEqual(r["supportedVersions"], [VERSION])
        self.assertIn("ttlMs", r)
        self.assertIn("io.modelcontextprotocol/serverInfo", r["_meta"])

    def test_tools_list_is_deterministic_with_schemas(self):
        tools = self.client.request("tools/list")["result"]["tools"]
        self.assertEqual([t["name"] for t in tools], ["broken", "create_issue", "search_code"])
        self.assertEqual(tools[1]["inputSchema"]["required"], ["repo", "title"])

    def test_successful_call(self):
        r = self.client.request("tools/call", name="create_issue", arguments={"repo": "acme/web", "title": "Bug"})["result"]
        self.assertFalse(r["isError"])
        self.assertEqual(r["structuredContent"]["number"], 212)

    def test_unknown_tool_is_a_protocol_error(self):
        r = self.client.request("tools/call", name="delete_repo", arguments={})
        self.assertEqual(r["error"]["code"], INVALID_PARAMS)

    def test_bad_arguments_are_a_tool_execution_error(self):
        r = self.client.request("tools/call", name="create_issue", arguments={"repo": 7})["result"]
        self.assertTrue(r["isError"])
        self.assertIn("missing title", r["content"][0]["text"])
        self.assertIn("repo must be string", r["content"][0]["text"])

    def test_tool_failure_is_reported_not_raised(self):
        r = self.client.request("tools/call", name="broken", arguments={"repo": "x", "title": "y"})["result"]
        self.assertTrue(r["isError"])
        self.assertIn("repository not found", r["content"][0]["text"])

    def test_missing_meta_is_invalid_params(self):
        r = make_server().handle({"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}})
        self.assertEqual(r["error"]["code"], INVALID_PARAMS)

    def test_unsupported_version_lists_supported_ones(self):
        r = Client(make_server(), version="2024-11-05").request("tools/list")
        self.assertEqual(r["error"]["code"], UNSUPPORTED_VERSION)
        self.assertEqual(r["error"]["data"]["supported"], [VERSION])

    def test_unknown_method(self):
        self.assertEqual(self.client.request("initialize")["error"]["code"], METHOD_NOT_FOUND)


if __name__ == "__main__":
    unittest.main()
