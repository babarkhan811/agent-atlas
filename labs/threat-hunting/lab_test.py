import random
import unittest

from lab import detect_beacons

rng = random.Random(42)


def beacon(src, dest, period, jitter, n=100, start=0.0):
    return [(src, dest, start + i * period + rng.uniform(-jitter, jitter)) for i in range(n)]


def browsing(src, dest, mean_gap, n=100):
    out, t = [], 0.0
    for _ in range(n):
        t += rng.expovariate(1 / mean_gap)
        out.append((src, dest, t))
    return out


class BeaconLabTest(unittest.TestCase):
    def test_finds_a_jittered_beacon(self):
        found = detect_beacons(beacon("DEV-SRV-03", "198.51.100.23", 60, 4))
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0]["dest"], "198.51.100.23")
        self.assertAlmostEqual(found[0]["mean_interval"], 60, delta=2)

    def test_ignores_irregular_human_traffic(self):
        self.assertEqual(detect_beacons(browsing("HR-PC-07", "news.example", 90)), [])

    def test_allowlist_excludes_known_benign_timers(self):
        conns = beacon("HR-PC-07", "updates.vendor.example", 300, 10)
        allow = frozenset({("HR-PC-07", "updates.vendor.example")})
        self.assertEqual(len(detect_beacons(conns)), 1)
        self.assertEqual(detect_beacons(conns, allowlist=allow), [])

    def test_too_few_connections_is_not_enough_evidence(self):
        self.assertEqual(detect_beacons(beacon("A", "B", 60, 1, n=5)), [])

    def test_sorts_most_regular_first_in_mixed_traffic(self):
        conns = beacon("A", "c2.example", 60, 1) + beacon("B", "sync.example", 120, 15) + browsing("C", "web.example", 60)
        found = detect_beacons(conns)
        self.assertEqual([f["dest"] for f in found], ["c2.example", "sync.example"])


if __name__ == "__main__":
    unittest.main()
