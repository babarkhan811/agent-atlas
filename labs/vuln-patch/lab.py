"""A vulnerability prioritiser.

Combines CVSS severity, CISA KEV status, EPSS probability, reachability and
exposure into a priority (P1 fix now ... P4 track) with plain-English reasons.
The thresholds are a starting point to tune, not a standard.
"""
from __future__ import annotations

from dataclasses import dataclass

EXPOSURES = ("internet", "internal", "offline")


@dataclass
class Finding:
    cve: str
    package: str
    cvss: float              # CVSS v4.0 score, 0-10
    kev: bool                # listed in CISA's Known Exploited Vulnerabilities catalog
    epss: float              # probability of exploitation in the next 30 days, 0-1
    reachable: bool | None   # None = not analysed
    exposure: str            # "internet", "internal" or "offline"

    def __post_init__(self):
        if not 0 <= self.cvss <= 10:
            raise ValueError("cvss must be between 0 and 10")
        if not 0 <= self.epss <= 1:
            raise ValueError("epss must be between 0 and 1")
        if self.exposure not in EXPOSURES:
            raise ValueError(f"exposure must be one of {EXPOSURES}")


def severity_band(cvss: float) -> str:
    """CVSS qualitative rating scale (FIRST)."""
    if cvss == 0:
        return "None"
    if cvss < 4:
        return "Low"
    if cvss < 7:
        return "Medium"
    if cvss < 9:
        return "High"
    return "Critical"


def prioritise(f: Finding) -> tuple[str, list[str]]:
    reasons = [f"CVSS {f.cvss} ({severity_band(f.cvss)})"]
    if f.kev:
        reasons.append("listed in CISA KEV: exploited in the wild")
    if f.epss >= 0.1:
        reasons.append(f"EPSS {f.epss:.2f}: elevated chance of exploitation in 30 days")
    if f.reachable is True:
        reasons.append("vulnerable code is reachable")
    elif f.reachable is False:
        reasons.append("vulnerable code not reachable (re-check when code changes)")
    else:
        reasons.append("reachability not analysed")
    reasons.append(f"exposure: {f.exposure}")

    possibly_reachable = f.reachable is not False
    if f.exposure != "offline" and possibly_reachable and (f.kev or (f.exposure == "internet" and f.cvss >= 7)):
        return "P1", reasons
    if f.kev or (possibly_reachable and (f.cvss >= 7 or f.epss >= 0.1)):
        return "P2", reasons
    if possibly_reachable or f.cvss >= 4:
        return "P3", reasons
    return "P4", reasons


def rank(findings: list[Finding]) -> list[tuple[str, Finding, list[str]]]:
    rows = [(*prioritise(f), f) for f in findings]
    rows.sort(key=lambda r: (r[0], -r[2].cvss, -r[2].epss))
    return [(p, f, why) for p, why, f in rows]


SAMPLE = [
    Finding("CVE-2026-0001 (example)", "image-lib", 8.8, False, 0.12, True, "internet"),
    Finding("CVE-2026-0002 (example)", "xml-kit", 9.8, False, 0.02, False, "internal"),
    Finding("CVE-2026-0003 (example)", "auth-helper", 7.5, True, 0.40, None, "internal"),
    Finding("CVE-2026-0004 (example)", "csv-tools", 5.3, False, 0.01, False, "offline"),
]

if __name__ == "__main__":
    for priority, f, why in rank(SAMPLE):
        print(priority, f.cve, f.package, "-", "; ".join(why))
