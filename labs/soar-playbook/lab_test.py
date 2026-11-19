import unittest

from lab import DISRUPTIVE, READ, REVERSIBLE, Step, run_playbook

WORKSTATION = {"host": "HR-PC-07", "asset_class": "workstation"}


def make_steps(state, quarantine_works=True):
    def quarantine(alert):
        state["quarantined"] = quarantine_works
    return {
        "auto_contain": [
            Step("lookup_hash", READ, lambda a: "malicious"),
            Step("quarantine_file", REVERSIBLE, quarantine, lambda a: state["quarantined"]),
        ],
        "escalate": [Step("isolate_host", DISRUPTIVE, lambda a: state.update(isolated=True))],
    }


class PlaybookLabTest(unittest.TestCase):
    def test_reversible_steps_run_and_are_verified(self):
        state = {"quarantined": False}
        result = run_playbook(WORKSTATION, lambda a: "auto_contain", make_steps(state), approve=lambda s, a: False)
        self.assertEqual(result["status"], "contained")
        self.assertTrue(state["quarantined"])

    def test_failed_verification_escalates(self):
        state = {"quarantined": False}
        result = run_playbook(WORKSTATION, lambda a: "auto_contain", make_steps(state, quarantine_works=False),
                              approve=lambda s, a: True)
        self.assertEqual(result["status"], "escalated")
        self.assertIn("quarantine_file: verification failed", result["log"])

    def test_invalid_model_choice_escalates(self):
        result = run_playbook(WORKSTATION, lambda a: "delete_everything", {}, approve=lambda s, a: True)
        self.assertEqual(result["status"], "escalated")
        self.assertIn("invalid choice", result["log"][0])

    def test_hard_rule_overrides_model_for_servers(self):
        state = {"quarantined": False}
        server = {"host": "DB-01", "asset_class": "server"}
        result = run_playbook(server, lambda a: "auto_contain", make_steps(state), approve=lambda s, a: False)
        self.assertEqual(result["status"], "awaiting_approval")
        self.assertFalse(state["quarantined"])

    def test_disruptive_step_waits_for_approval(self):
        state = {}
        result = run_playbook(WORKSTATION, lambda a: "escalate", make_steps(state), approve=lambda s, a: False)
        self.assertEqual(result["status"], "awaiting_approval")
        self.assertNotIn("isolated", state)

    def test_dry_run_changes_nothing(self):
        state = {"quarantined": False}
        result = run_playbook(WORKSTATION, lambda a: "auto_contain", make_steps(state), approve=lambda s, a: True, dry_run=True)
        self.assertEqual(result["status"], "dry_run")
        self.assertFalse(state["quarantined"])
        self.assertIn("quarantine_file: would run (reversible)", result["log"])


if __name__ == "__main__":
    unittest.main()
