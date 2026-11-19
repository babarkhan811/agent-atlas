import unittest

from lab import Action, ApprovalError, FakePayments, Gate


def refund(amount, order="A-5521"):
    return Action("issue_refund", {"order_id": order, "amount": amount, "currency": "USD"})


class GateTest(unittest.TestCase):
    def setUp(self):
        self.now = [1000.0]
        self.payments = FakePayments()
        self.gate = Gate({"issue_refund": self.payments.issue_refund}, clock=lambda: self.now[0], ttl_seconds=60)

    def approved(self, action):
        pending = self.gate.request(action, requested_by="agent")
        self.assertEqual(pending["status"], "pending")
        return self.gate.approve(pending["request_id"], approver="manager")

    def test_small_refund_runs_without_approval(self):
        out = self.gate.request(refund(40), requested_by="agent")
        self.assertEqual(out["status"], "executed")
        self.assertEqual(self.payments.calls, 1)

    def test_large_refund_waits_then_runs_once(self):
        approval = self.approved(refund(450))
        self.assertEqual(self.payments.calls, 0)
        self.gate.execute(refund(450), approval)
        self.assertEqual(self.payments.calls, 1)

    def test_approval_is_single_use(self):
        approval = self.approved(refund(450))
        self.gate.execute(refund(450), approval)
        with self.assertRaisesRegex(ApprovalError, "already used"):
            self.gate.execute(refund(450), approval)

    def test_approval_is_bound_to_exact_arguments(self):
        approval = self.approved(refund(450))
        with self.assertRaisesRegex(ApprovalError, "does not match"):
            self.gate.execute(refund(4500), approval)
        self.assertEqual(self.payments.calls, 0)

    def test_approval_expires(self):
        approval = self.approved(refund(450))
        self.now[0] += 61
        with self.assertRaisesRegex(ApprovalError, "expired"):
            self.gate.execute(refund(450), approval)

    def test_requester_cannot_self_approve(self):
        pending = self.gate.request(refund(450), requested_by="agent")
        with self.assertRaisesRegex(ApprovalError, "own action"):
            self.gate.approve(pending["request_id"], approver="agent")

    def test_idempotency_key_prevents_double_payment(self):
        self.gate.request(refund(40), requested_by="agent")
        self.gate.request(refund(40), requested_by="agent")  # e.g. a retry after a timeout
        self.assertEqual(self.payments.calls, 1)

    def test_audit_log_is_complete_and_read_only(self):
        approval = self.approved(refund(450))
        self.gate.execute(refund(450), approval)
        events = [e["event"] for e in self.gate.log]
        self.assertEqual(events, ["requested", "approval_needed", "approved", "executed"])
        self.gate.log[0]["event"] = "tampered"
        self.assertEqual(self.gate.log[0]["event"], "requested")


if __name__ == "__main__":
    unittest.main()
