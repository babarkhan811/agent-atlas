import unittest

from lab import Budget, ToolCall, Turn, run

TOOLS = {"list_issues": lambda state: "12 open bugs", "read_issue": lambda id: f"issue {id}: details"}


class Scripted:
    def __init__(self, turns):
        self.turns = list(turns)

    def respond(self, messages):
        return self.turns.pop(0)


def call(i, name="list_issues", **inp):
    return ToolCall(str(i), name, inp or {"state": "open"})


class AgentLoopTest(unittest.TestCase):
    def test_finishes_when_model_stops_calling_tools(self):
        r = run(Scripted([Turn(tool_calls=[call(1)], tokens=100), Turn("done", tokens=200)]), TOOLS, "goal")
        self.assertEqual((r.stop, r.answer, r.turns, r.tokens, r.calls), ("done", "done", 2, 300, ["list_issues"]))

    def test_turn_budget(self):
        turns = [Turn(tool_calls=[call(i, "read_issue", id=i)], tokens=10) for i in range(5)]
        r = run(Scripted(turns), TOOLS, "goal", Budget(max_turns=3))
        self.assertEqual((r.stop, r.turns), ("max_turns", 3))

    def test_token_budget(self):
        turns = [Turn(tool_calls=[call(i, "read_issue", id=i)], tokens=400) for i in range(5)]
        r = run(Scripted(turns), TOOLS, "goal", Budget(max_tokens=1000))
        self.assertEqual(r.stop, "max_tokens")
        self.assertGreater(r.tokens, 1000)

    def test_repeated_identical_calls_are_a_loop(self):
        turns = [Turn(tool_calls=[call(i)], tokens=10) for i in range(5)]
        r = run(Scripted(turns), TOOLS, "goal", Budget(max_repeats=2))
        self.assertEqual(r.stop, "loop_detected")
        self.assertEqual(r.calls, ["list_issues", "list_issues"])

    def test_argument_order_does_not_hide_a_loop(self):
        a = ToolCall("1", "list_issues", {"state": "open", "label": "bug"})
        b = ToolCall("2", "list_issues", {"label": "bug", "state": "open"})
        r = run(Scripted([Turn(tool_calls=[a]), Turn(tool_calls=[b])]), {"list_issues": lambda **k: "x"}, "g", Budget(max_repeats=1))
        self.assertEqual(r.stop, "loop_detected")

    def test_tool_errors_are_returned_not_raised(self):
        r = run(Scripted([Turn(tool_calls=[call(1, "nope")]), Turn("gave up")]), TOOLS, "goal")
        self.assertEqual(r.stop, "done")


if __name__ == "__main__":
    unittest.main()
