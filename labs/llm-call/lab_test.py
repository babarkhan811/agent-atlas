import unittest

from lab import TruncatedReply, collect, fake_stream, require_complete


class StreamLabTest(unittest.TestCase):
    def test_assembles_text_and_usage(self):
        reply = collect(fake_stream("Hello there friend", input_tokens=12))
        self.assertEqual(reply.text, "Hello there friend")
        self.assertEqual((reply.input_tokens, reply.output_tokens), (12, 3))
        self.assertEqual(require_complete(reply), "Hello there friend")

    def test_truncated_reply_is_not_treated_as_finished(self):
        reply = collect(fake_stream("This answer was cut", stop_reason="max_tokens"))
        self.assertFalse(reply.complete)
        with self.assertRaises(TruncatedReply):
            require_complete(reply)

    def test_broken_stream_is_an_error(self):
        events = list(fake_stream("never finished"))[:-2]  # drop message_delta and message_stop
        with self.assertRaises(ConnectionError):
            collect(events)

    def test_error_event_raises(self):
        events = [{"type": "message_start", "message": {"usage": {"input_tokens": 1}}},
                  {"type": "error", "error": {"message": "overloaded"}}]
        with self.assertRaisesRegex(RuntimeError, "overloaded"):
            collect(events)


if __name__ == "__main__":
    unittest.main()
