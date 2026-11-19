import unittest

from triage_agent import DISRUPTIVE, READ, RateLimiter, Reply, Tool, ToolCall, triage


class ScriptedLLM:
    """Plays back a fixed list of replies and records what it was sent."""

    def __init__(self, replies):
        self.replies, self.seen = list(replies), []

    def chat(self, system, messages, tools):
        self.seen.append([dict(m) for m in messages])
        return self.replies.pop(0)


def make_tools(calls):
    return {
        "lookup_ip": Tool(lambda ip: calls.append(("lookup_ip", ip)) or "on 2 blocklists", READ, {"ip": str}),
        "isolate_host": Tool(lambda host: calls.append(("isolate", host)) or "isolated", DISRUPTIVE, {"host": str}),
    }


def run(replies, approve=True, limits=None, max_steps=10):
    calls, log = [], []
    llm = ScriptedLLM(replies)
    verdict = triage({"id": "A1", "host": "HR-PC-07"}, llm, make_tools(calls),
                     ask_analyst=lambda alert, call: approve,
                     audit_log=lambda *entry: log.append(entry),
                     limiter=RateLimiter(limits or {READ: 100, DISRUPTIVE: 5}), max_steps=max_steps)
    return verdict, calls, log, llm


def tool_results(llm):
    return [m["content"] for m in llm.seen[-1] if m["role"] == "tool"]


class TriageAgentTest(unittest.TestCase):
    def test_happy_path(self):
        verdict, calls, log, _ = run([Reply(tool_calls=[ToolCall("1", "lookup_ip", {"ip": "203.0.113.5"})]),
                                      Reply("malicious, confidence 0.9")])
        self.assertEqual(verdict, "malicious, confidence 0.9")
        self.assertEqual(calls, [("lookup_ip", "203.0.113.5")])
        self.assertEqual(len(log), 1)

    def test_unknown_tool_is_reported_not_raised(self):
        _, calls, log, llm = run([Reply(tool_calls=[ToolCall("1", "delete_everything", {})]), Reply("unsure")])
        self.assertEqual(calls, [])
        self.assertIn("unknown tool 'delete_everything'", tool_results(llm)[0])
        self.assertIn("unknown tool", log[0][3])

    def test_invalid_arguments_are_rejected(self):
        _, calls, _, llm = run([Reply(tool_calls=[ToolCall("1", "lookup_ip", {"ip": 42, "x": 1})]), Reply("unsure")])
        self.assertEqual(calls, [])
        self.assertIn("unexpected ['x']", tool_results(llm)[0])
        self.assertIn("wrong type for ['ip']", tool_results(llm)[0])

    def test_disruptive_action_needs_approval(self):
        _, calls, _, llm = run([Reply(tool_calls=[ToolCall("1", "isolate_host", {"host": "HR-PC-07"})]), Reply("done")],
                               approve=False)
        self.assertEqual(calls, [])
        self.assertEqual(tool_results(llm), ["DENIED: analyst did not approve"])

    def test_hourly_limit_blocks_extra_actions(self):
        isolate = lambda i: ToolCall(str(i), "isolate_host", {"host": f"PC-{i}"})
        _, calls, _, llm = run([Reply(tool_calls=[isolate(1), isolate(2)]), Reply("done")],
                               limits={READ: 100, DISRUPTIVE: 1})
        self.assertEqual(calls, [("isolate", "PC-1")])
        self.assertIn("hourly limit reached", tool_results(llm)[1])

    def test_rate_limiter_window_slides(self):
        now = [0.0]
        limiter = RateLimiter({READ: 1}, clock=lambda: now[0])
        self.assertTrue(limiter.allow(READ))
        self.assertFalse(limiter.allow(READ))
        now[0] = 3600
        self.assertTrue(limiter.allow(READ))

    def test_step_limit_escalates(self):
        loop = [Reply(tool_calls=[ToolCall(str(i), "lookup_ip", {"ip": "1.1.1.1"})]) for i in range(3)]
        verdict, *_ = run(loop, max_steps=3)
        self.assertTrue(verdict.startswith("ESCALATED"))

    def test_alert_is_wrapped_as_untrusted_data(self):
        _, _, _, llm = run([Reply("benign")])
        self.assertTrue(llm.seen[0][0]["content"].startswith("<alert>"))


if __name__ == "__main__":
    unittest.main()
