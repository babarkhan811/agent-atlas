import unittest

from lab import SAMPLE, Finding, prioritise, rank, severity_band


class PrioritiserTest(unittest.TestCase):
    def test_severity_bands_follow_cvss_scale(self):
        self.assertEqual([severity_band(s) for s in (0, 0.1, 3.9, 4.0, 6.9, 7.0, 8.9, 9.0, 10)],
                         ["None", "Low", "Low", "Medium", "Medium", "High", "High", "Critical", "Critical"])

    def test_reachable_internet_high_is_p1(self):
        self.assertEqual(prioritise(SAMPLE[0])[0], "P1")

    def test_unreachable_critical_is_not_p1(self):
        priority, why = prioritise(SAMPLE[1])
        self.assertEqual(priority, "P3")
        self.assertIn("vulnerable code not reachable (re-check when code changes)", why)

    def test_kev_unknown_reachability_is_urgent(self):
        self.assertEqual(prioritise(SAMPLE[2])[0], "P1")

    def test_ranking_order(self):
        self.assertEqual([f.cve[:13] for _, f, _ in rank(SAMPLE)],
                         ["CVE-2026-0001", "CVE-2026-0003", "CVE-2026-0002", "CVE-2026-0004"])

    def test_rejects_out_of_range_inputs(self):
        with self.assertRaises(ValueError):
            Finding("x", "y", 11, False, 0.1, True, "internet")
        with self.assertRaises(ValueError):
            Finding("x", "y", 5, False, 1.5, True, "internet")
        with self.assertRaises(ValueError):
            Finding("x", "y", 5, False, 0.1, True, "cloud")


if __name__ == "__main__":
    unittest.main()
