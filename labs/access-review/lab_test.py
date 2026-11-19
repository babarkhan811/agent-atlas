import unittest
from datetime import date

from lab import ACCOUNTS, EMPLOYEES, TODAY, Account, Employee, Grant, review


class AccessReviewTest(unittest.TestCase):
    def test_sample_findings_in_risk_order(self):
        items = review(ACCOUNTS, EMPLOYEES, TODAY)
        self.assertEqual([(i.kind, i.account) for i in items], [
            ("leaver_active", "s.khan"),
            ("unused_privileged", "j.lee"),
            ("mover_old_access", "m.ali"),
            ("orphaned", "svc-report"),
        ])

    def test_unused_days_threshold(self):
        recent = Account("a", "e1", grants=[Grant("billing", "admin", True, last_used=date(2026, 11, 1))])
        self.assertEqual(review([recent], EMPLOYEES, TODAY), [])
        self.assertEqual(review([recent], EMPLOYEES, TODAY, unused_days=10)[0].kind, "unused_privileged")

    def test_never_used_admin_is_flagged(self):
        never = Account("b", "e1", grants=[Grant("billing", "admin", True)])
        self.assertIn("never used", review([never], EMPLOYEES, TODAY)[0].reason)

    def test_disabled_leaver_is_not_flagged(self):
        gone = Account("c", "e3", enabled=False)
        self.assertEqual(review([gone], EMPLOYEES, TODAY), [])

    def test_matches_on_ids_not_names(self):
        twin = [Employee("e9", "Finance", "active")]
        self.assertEqual(review([Account("x", "e1")], twin, TODAY)[0].kind, "orphaned")


if __name__ == "__main__":
    unittest.main()
