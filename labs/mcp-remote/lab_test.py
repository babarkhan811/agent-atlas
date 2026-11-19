import unittest

from lab import HEADER_MISMATCH, RESOURCE, VERSION, handle, s256, verify_pkce

NOW = 1_000_000.0
TOKENS = {
    "reader": {"aud": RESOURCE, "scope": "tickets:read", "exp": NOW + 600},
    "writer": {"aud": RESOURCE, "scope": "tickets:read tickets:write", "exp": NOW + 600},
    "other-audience": {"aud": "https://hr.example.com/api", "scope": "tickets:write", "exp": NOW + 600},
    "expired": {"aud": RESOURCE, "scope": "tickets:write", "exp": NOW - 1},
}


def request(method="tools/call", name="create_ticket", token=None, **header_overrides):
    params = {"_meta": {"io.modelcontextprotocol/protocolVersion": VERSION,
                        "io.modelcontextprotocol/clientCapabilities": {}}}
    headers = {"MCP-Protocol-Version": VERSION, "Mcp-Method": method}
    if method == "tools/call":
        params["name"], params["arguments"] = name, {"title": "Printer on fire"}
        headers["Mcp-Name"] = name
    if token:
        headers["Authorization"] = f"Bearer {token}"
    headers.update(header_overrides)
    return headers, {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}


class RemoteMcpLabTest(unittest.TestCase):
    def call(self, *args, **kwargs):
        return handle(*request(*args, **kwargs), tokens=TOKENS, now=NOW)

    def test_missing_token_gets_challenge_with_metadata_and_scope(self):
        r = self.call(method="tools/list")
        self.assertEqual(r.status, 401)
        self.assertIn('resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"', r.headers["WWW-Authenticate"])
        self.assertIn('scope="tickets:read"', r.headers["WWW-Authenticate"])

    def test_valid_token_passes(self):
        self.assertEqual(self.call(token="writer").status, 200)

    def test_header_names_are_case_insensitive(self):
        headers, body = request(token="writer")
        lowered = {k.lower(): v for k, v in headers.items()}
        self.assertEqual(handle(lowered, body, TOKENS, NOW).status, 200)

    def test_insufficient_scope_is_403_step_up(self):
        r = self.call(token="reader")
        self.assertEqual(r.status, 403)
        self.assertIn('error="insufficient_scope"', r.headers["WWW-Authenticate"])
        self.assertIn('scope="tickets:write"', r.headers["WWW-Authenticate"])

    def test_wrong_audience_is_rejected(self):
        r = self.call(token="other-audience")
        self.assertEqual(r.status, 401)
        self.assertIn("audience", r.headers["WWW-Authenticate"])

    def test_expired_token_is_rejected(self):
        self.assertEqual(self.call(token="expired").status, 401)

    def test_header_body_mismatch(self):
        r = self.call(token="writer", **{"Mcp-Name": "delete_everything"})
        self.assertEqual(r.status, 400)
        self.assertEqual(r.body["error"]["code"], HEADER_MISMATCH)

    def test_missing_version_header(self):
        headers, body = request(token="writer")
        del headers["MCP-Protocol-Version"]
        self.assertEqual(handle(headers, body, TOKENS, NOW).body["error"]["code"], HEADER_MISMATCH)

    def test_pkce_rfc7636_example(self):
        verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
        self.assertEqual(s256(verifier), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")
        self.assertTrue(verify_pkce(verifier, s256(verifier)))
        self.assertFalse(verify_pkce("attacker-guess", s256(verifier)))


if __name__ == "__main__":
    unittest.main()
