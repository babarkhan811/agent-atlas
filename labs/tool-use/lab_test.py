import unittest

from lab import RoundLimitReached, Tool, ToolCall, Turn, run


class Scripted:
    """Plays back fixed turns and records every message list it was sent."""

    def __init__(self, turns):
        self.turns, self.seen = list(turns), []

    def respond(self, messages, tools):
        self.seen.append(list(messages))
        return self.turns.pop(0)


def weather(city):
    if city == "Atlantis":
        raise ValueError("city not found")
    return f"{city}: 31C, 5% rain"


TOOLS = {"get_weather": Tool(weather, "Current weather for a city.", {"city": str})}


def last_results(model):
    return model.seen[-1][-1]["content"]


class ToolLoopTest(unittest.TestCase):
    def test_round_trip(self):
        model = Scripted([Turn(tool_calls=[ToolCall("t1", "get_weather", {"city": "Lahore"})]), Turn("No umbrella needed.")])
        answer, trace = run(model, TOOLS, "Umbrella?")
        self.assertEqual(answer, "No umbrella needed.")
        self.assertEqual(last_results(model)[0], {"type": "tool_result", "tool_use_id": "t1",
                                                  "content": "Lahore: 31C, 5% rain", "is_error": False})
        self.assertEqual(trace, [{"tool": "get_weather", "input": {"city": "Lahore"}, "is_error": False}])

    def test_unknown_tool_becomes_error_result(self):
        model = Scripted([Turn(tool_calls=[ToolCall("t1", "send_email", {})]), Turn("Sorry.")])
        run(model, TOOLS, "Umbrella?")
        result = last_results(model)[0]
        self.assertTrue(result["is_error"])
        self.assertIn("unknown tool 'send_email'", result["content"])

    def test_invalid_arguments_are_rejected(self):
        model = Scripted([Turn(tool_calls=[ToolCall("t1", "get_weather", {"city": 42, "units": "F"})]), Turn("Sorry.")])
        run(model, TOOLS, "Umbrella?")
        self.assertIn("unexpected=['units']", last_results(model)[0]["content"])
        self.assertIn("wrong_type=['city']", last_results(model)[0]["content"])

    def test_tool_exception_is_reported_not_raised(self):
        model = Scripted([Turn(tool_calls=[ToolCall("t1", "get_weather", {"city": "Atlantis"})]), Turn("Unknown city.")])
        answer, trace = run(model, TOOLS, "Umbrella in Atlantis?")
        self.assertEqual(answer, "Unknown city.")
        self.assertTrue(trace[0]["is_error"])

    def test_parallel_calls_return_in_one_turn(self):
        calls = [ToolCall("a", "get_weather", {"city": "Lahore"}), ToolCall("b", "get_weather", {"city": "Karachi"})]
        model = Scripted([Turn(tool_calls=calls), Turn("Both dry.")])
        run(model, TOOLS, "Lahore and Karachi?")
        self.assertEqual([r["tool_use_id"] for r in last_results(model)], ["a", "b"])

    def test_round_limit(self):
        loop = [Turn(tool_calls=[ToolCall(str(i), "get_weather", {"city": "Lahore"})]) for i in range(3)]
        with self.assertRaises(RoundLimitReached):
            run(Scripted(loop), TOOLS, "Umbrella?", max_rounds=3)


if __name__ == "__main__":
    unittest.main()
