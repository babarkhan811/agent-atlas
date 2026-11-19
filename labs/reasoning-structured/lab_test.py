import json
import unittest

from lab import Reply, extract_ticket, rule_errors, schema_errors

GOOD = {"category": "billing", "priority": "high", "refund_requested": True, "refund_amount_gbp": 89, "summary": "Charged twice"}


def answer(**changes):
    return json.dumps({**GOOD, **changes})


class Scripted:
    def __init__(self, replies):
        self.replies, self.seen = list(replies), []

    def respond(self, messages):
        self.seen.append(list(messages))
        return self.replies.pop(0)


class StructuredLabTest(unittest.TestCase):
    def test_valid_first_time(self):
        out = extract_ticket(Scripted([Reply(answer())]), "email", 89)
        self.assertEqual((out.status, out.attempts, out.ticket["refund_amount_gbp"]), ("ok", 1, 89))

    def test_business_rule_failure_is_fed_back_and_fixed(self):
        model = Scripted([Reply(answer(refund_amount_gbp=178)), Reply(answer())])
        out = extract_ticket(model, "email", 89)
        self.assertEqual((out.status, out.attempts), ("ok", 2))
        self.assertIn("must not exceed order total 89", model.seen[1][-1]["content"])

    def test_gives_up_after_the_retry_cap(self):
        model = Scripted([Reply(answer(refund_amount_gbp=178)), Reply(answer(refund_amount_gbp=150))])
        out = extract_ticket(model, "email", 89)
        self.assertEqual((out.status, out.attempts), ("needs_human", 2))
        self.assertTrue(out.errors)

    def test_schema_catches_shape_problems(self):
        bad = {**GOOD, "category": "Billing!!", "extra": 1}
        del bad["summary"]
        errors = schema_errors(bad)
        self.assertIn("missing field 'summary'", errors)
        self.assertIn("unexpected field 'extra'", errors)
        self.assertTrue(any("category" in e for e in errors))
        self.assertIn("'refund_amount_gbp' must be number", schema_errors({**GOOD, "refund_amount_gbp": True}))

    def test_invalid_json_and_truncation_are_retried(self):
        model = Scripted([Reply("{not json"), Reply(answer()[:20], stop_reason="max_tokens")])
        out = extract_ticket(model, "email", 89)
        self.assertEqual(out.status, "needs_human")
        self.assertIn("not valid JSON", model.seen[1][-1]["content"])
        self.assertEqual(out.errors, ["answer was cut off at the output limit"])

    def test_refusal_goes_straight_to_a_human(self):
        out = extract_ticket(Scripted([Reply("", stop_reason="refusal")]), "email", 89)
        self.assertEqual((out.status, out.attempts), ("needs_human", 1))

    def test_no_refund_means_zero_amount(self):
        self.assertTrue(rule_errors({**GOOD, "refund_requested": False, "refund_amount_gbp": 10}, 89))


if __name__ == "__main__":
    unittest.main()
