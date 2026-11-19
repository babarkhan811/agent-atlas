import unittest

from lab import Tracer, run_agent, summarize


def scripted_model(replies):
    replies = list(replies)
    return lambda messages: replies.pop(0)


TOOL_TURN = {"stop_reason": "tool_use", "text": "", "tool_call": {"id": "toolu_1", "name": "lookup_order", "input": {"order_id": "A-5521"}},
             "usage": {"input_tokens": 340, "cache_read_input_tokens": 2900, "output_tokens": 60}}
FINAL_TURN = {"stop_reason": "end_turn", "text": "Your refund was issued on 3 Nov.",
              "usage": {"input_tokens": 120, "cache_read_input_tokens": 3200, "output_tokens": 40}}


def flaky_lookup():
    calls = {"n": 0}

    def lookup_order(order_id):
        calls["n"] += 1
        if calls["n"] == 1:
            raise TimeoutError("orders API took longer than 3 s")
        return f"{order_id}: refunded 2026-11-03"

    return lookup_order


class TracerLabTest(unittest.TestCase):
    def run_once(self, capture=False):
        tracer = Tracer(capture_content=capture)
        answer = run_agent(tracer, scripted_model([TOOL_TURN, FINAL_TURN]), {"lookup_order": flaky_lookup()}, "Where is my refund?")
        return tracer, answer

    def test_spans_form_one_tree_with_convention_names(self):
        tracer, answer = self.run_once()
        self.assertEqual(answer, "Your refund was issued on 3 Nov.")
        names = [s.name for s in tracer.spans]
        self.assertEqual(names, ["invoke_agent support-agent", "chat example-model", "execute_tool lookup_order",
                                 "execute_tool lookup_order", "chat example-model"])
        root = tracer.spans[0]
        self.assertEqual({s.trace_id for s in tracer.spans}, {root.trace_id})
        self.assertTrue(all(s.parent_id == root.span_id for s in tracer.spans[1:]))

    def test_errors_are_recorded_on_the_failing_span_and_retried(self):
        tracer, _ = self.run_once()
        first, second = [s for s in tracer.spans if s.name.startswith("execute_tool")]
        self.assertEqual((first.status, first.attributes["error.type"]), ("ERROR", "TimeoutError"))
        self.assertEqual(first.events[0]["name"], "exception")
        self.assertEqual((second.status, second.attributes["attempt"]), ("OK", 2))
        self.assertEqual(first.attributes["gen_ai.tool.call.id"], "toolu_1")

    def test_usage_follows_the_convention_and_sums_per_run(self):
        tracer, _ = self.run_once()
        chat = tracer.spans[1]
        self.assertEqual(chat.attributes["gen_ai.usage.input_tokens"], 3240)  # uncached + cache reads
        self.assertEqual(chat.attributes["gen_ai.usage.cache_read.input_tokens"], 2900)
        self.assertEqual(chat.attributes["gen_ai.response.finish_reasons"], ["tool_use"])
        totals = summarize(tracer)
        self.assertEqual((totals["model_calls"], totals["tool_calls"], totals["errors"]), (2, 2, 1))
        self.assertEqual((totals["input_tokens"], totals["output_tokens"]), (6560, 100))
        self.assertGreater(totals["duration"], 0)

    def test_content_is_left_out_unless_capture_is_enabled(self):
        tracer, _ = self.run_once(capture=False)
        root = tracer.spans[0].attributes
        self.assertNotIn("gen_ai.input.messages", root)
        self.assertEqual(root["gen_ai.input.messages.length"], len("Where is my refund?"))
        tracer, _ = self.run_once(capture=True)
        self.assertEqual(tracer.spans[0].attributes["gen_ai.input.messages"], "Where is my refund?")


if __name__ == "__main__":
    unittest.main()
