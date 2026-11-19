"""Detect beaconing from connection timestamps.

Groups connections by (source host, destination), measures the gaps between
them, and flags pairs whose gaps are very regular. Regularity is measured by
the coefficient of variation (standard deviation / mean of the gaps), so
beacons with random jitter are still caught. Results are candidates for an
analyst, not verdicts: update checkers and monitoring agents also beacon.
"""
from __future__ import annotations

from collections import defaultdict
from statistics import mean, pstdev
from typing import Iterable


def detect_beacons(connections: Iterable[tuple[str, str, float]], min_count: int = 20,
                   max_cv: float = 0.15, allowlist: frozenset[tuple[str, str]] = frozenset()) -> list[dict]:
    """connections: (src_host, dest, unix_seconds). Allowlist entries are (src_host, dest) pairs."""
    by_pair: dict[tuple[str, str], list[float]] = defaultdict(list)
    for src, dest, ts in connections:
        by_pair[(src, dest)].append(ts)
    found = []
    for (src, dest), times in by_pair.items():
        if (src, dest) in allowlist or len(times) < min_count:
            continue
        times.sort()
        gaps = [b - a for a, b in zip(times, times[1:]) if b > a]
        if len(gaps) < min_count - 1:
            continue
        avg = mean(gaps)
        cv = pstdev(gaps) / avg
        if cv <= max_cv:
            found.append({"src": src, "dest": dest, "count": len(times),
                          "mean_interval": round(avg, 1), "cv": round(cv, 3)})
    return sorted(found, key=lambda f: f["cv"])


if __name__ == "__main__":
    import random

    rng = random.Random(7)
    conns = [("DEV-SRV-03", "198.51.100.23", i * 60 + rng.uniform(-4, 4)) for i in range(200)]   # jittered beacon
    t = 0.0
    for _ in range(200):                                                                          # human browsing
        t += rng.expovariate(1 / 90)
        conns.append(("HR-PC-07", "news.example", t))
    for f in detect_beacons(conns):
        print(f)
