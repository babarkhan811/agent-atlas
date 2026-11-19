import unittest

from lab import (CANCELED, COMPLETED, INPUT_REQUIRED, SUBMITTED, WORKING, InvalidTransition, Task,
                 choose_interface, validate_card)

CARD = {
    "name": "Hotel booking agent",
    "description": "Searches and books rooms",
    "supportedInterfaces": [
        {"url": "https://hotels.example.com/a2a", "protocolBinding": "JSONRPC", "protocolVersion": "1.0"},
        {"url": "https://hotels.example.com/a2a/rest", "protocolBinding": "HTTP+JSON", "protocolVersion": "1.0"},
    ],
    "capabilities": {"streaming": True, "pushNotifications": True},
    "skills": [{"id": "book-hotel", "name": "Book a hotel", "description": "Find and book rooms", "tags": ["travel"]}],
}


class A2ALabTest(unittest.TestCase):
    def test_happy_path_with_input_required(self):
        t = Task(context_id="ctx")
        for s in (WORKING, INPUT_REQUIRED, WORKING, COMPLETED):
            t.move(s)
        self.assertEqual(t.history, [SUBMITTED, WORKING, INPUT_REQUIRED, WORKING, COMPLETED])

    def test_terminal_tasks_are_immutable(self):
        t = Task(context_id="ctx")
        t.move(WORKING)
        t.move(COMPLETED)
        with self.assertRaises(InvalidTransition):
            t.move(WORKING)
        with self.assertRaises(InvalidTransition):
            t.add_artifact("art-2", "late", [{"text": "too late"}])

    def test_illegal_jump(self):
        with self.assertRaises(InvalidTransition):
            Task(context_id="ctx").move(INPUT_REQUIRED)

    def test_refinement_creates_new_task_in_same_context(self):
        t = Task(context_id="ctx-trip")
        t.move(WORKING)
        t.move(CANCELED)
        follow_up = t.refine()
        self.assertNotEqual(follow_up.id, t.id)
        self.assertEqual(follow_up.context_id, "ctx-trip")
        self.assertEqual(follow_up.reference_task_ids, [t.id])

    def test_cannot_refine_unfinished_task(self):
        with self.assertRaises(InvalidTransition):
            Task(context_id="ctx").refine()

    def test_artifacts_need_parts_and_unique_ids(self):
        t = Task(context_id="ctx")
        t.move(WORKING)
        t.add_artifact("art-1", "booking-confirmation", [{"data": {"ref": "MA-55120"}}])
        with self.assertRaises(ValueError):
            t.add_artifact("art-1", "dup", [{"text": "x"}])
        with self.assertRaises(ValueError):
            t.add_artifact("art-2", "empty", [])

    def test_valid_card(self):
        self.assertEqual(validate_card(CARD), [])

    def test_card_problems_are_listed(self):
        bad = {"name": "x", "supportedInterfaces": [{"url": "http://x", "protocolBinding": "SOAP"}],
               "skills": [{"id": "s"}], "capabilities": {"streaming": "yes"}}
        problems = validate_card(bad)
        self.assertIn("missing description", problems)
        self.assertIn("supportedInterfaces[0].url must be https", problems)
        self.assertTrue(any("protocolBinding" in p for p in problems))
        self.assertIn("skills[0] missing name", problems)
        self.assertIn("capabilities.streaming must be true or false", problems)

    def test_choose_interface_respects_preferences(self):
        self.assertEqual(choose_interface(CARD, ["GRPC", "HTTP+JSON"])["protocolBinding"], "HTTP+JSON")
        self.assertIsNone(choose_interface(CARD, ["GRPC"]))


if __name__ == "__main__":
    unittest.main()
