import unittest

from lab import SAMPLE, Event, build_timeline, open_questions


class TimelineTest(unittest.TestCase):
    def test_orders_events_by_time(self):
        timeline = build_timeline(SAMPLE, "corp.example")
        self.assertEqual([x.action for x in timeline], ["sign-in", "mfa-method-added", "inbox-rule-created"])

    def test_flags_outside_forwarding_but_not_internal(self):
        events = [Event("2026-11-19T01:00:00+00:00", "mail", "inbox-rule-created", {"forward_to": "boss@corp.example"}),
                  Event("2026-11-19T01:05:00+00:00", "mail", "inbox-rule-created", {"forward_to": "x@example.net"})]
        timeline = build_timeline(events, "corp.example")
        self.assertEqual(timeline[0].flags, [])
        self.assertIn("T1114.003", timeline[1].flags[0])

    def test_flags_unconfirmed_mfa_device(self):
        timeline = build_timeline(SAMPLE, "corp.example")
        mfa = next(x for x in timeline if x.action == "mfa-method-added")
        self.assertIn("T1098.005", mfa.flags[0])
        confirmed = build_timeline([Event("2026-11-19T01:00:00+00:00", "identity", "mfa-method-added",
                                          {"by_user_confirmed": True})], "corp.example")
        self.assertEqual(confirmed[0].flags, [])

    def test_open_questions(self):
        questions = open_questions(build_timeline(SAMPLE, "corp.example"))
        self.assertIn("Do any other mailboxes forward to example.net?", questions)
        self.assertIn("Did any other account sign in from 203.0.113.50?", questions)
        self.assertTrue(any("file auditing" in q for q in questions))


if __name__ == "__main__":
    unittest.main()
