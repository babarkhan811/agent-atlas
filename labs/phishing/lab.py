"""Read email authentication results and score phishing signals.

- Parses an Authentication-Results header (RFC 8601).
- Recomputes DMARC from the SPF/DKIM results with identifier alignment
  (RFC 9989). Simplification: the "organizational domain" is taken as the
  last two labels; real implementations use the DNS tree walk or Public
  Suffix List, so do not use this for domains like example.co.uk.
- Flags lookalike domains and combines signals into a verdict that can be
  "unsure", so uncertain cases go to a human.
"""
from __future__ import annotations

import re

HOMOGLYPHS = str.maketrans({"0": "o", "1": "l", "3": "e", "5": "s", "4": "a", "7": "t"})


def parse_auth_results(header: str) -> dict[str, dict[str, str]]:
    """'mx.example; spf=pass smtp.mailfrom=a@b.example; dkim=none' -> {'spf': {'result': 'pass', 'smtp.mailfrom': ...}}"""
    text = " ".join(header.split())  # unfold whitespace
    if text.lower().startswith("authentication-results:"):
        text = text.split(":", 1)[1]
    parts = [p.strip() for p in text.split(";")][1:]  # first part is the authserv-id
    results: dict[str, dict[str, str]] = {}
    for part in parts:
        m = re.match(r"([a-z-]+)=([a-z]+)\s*(.*)", part, re.I)
        if not m:
            continue
        method, result, rest = m.group(1).lower(), m.group(2).lower(), m.group(3)
        props = {"result": result}
        for key, value in re.findall(r"([a-z]+\.[a-z-]+)=(\S+)", rest, re.I):
            props[key.lower()] = value
        results[method] = props
    return results


def org_domain(domain: str) -> str:
    """Simplified organizational domain: the last two labels."""
    labels = domain.lower().strip(".").split(".")
    return ".".join(labels[-2:])


def aligned(authenticated: str, from_domain: str, mode: str = "r") -> bool:
    a, f = authenticated.lower().strip("."), from_domain.lower().strip(".")
    return a == f if mode == "s" else org_domain(a) == org_domain(f)


def domain_of(address: str) -> str:
    return address.rsplit("@", 1)[-1].strip("<>").lower()


def dmarc(results: dict[str, dict[str, str]], from_domain: str, aspf: str = "r", adkim: str = "r") -> str:
    """DMARC passes if SPF or DKIM passes for a domain aligned with the From domain."""
    spf, dkim = results.get("spf", {}), results.get("dkim", {})
    spf_ok = spf.get("result") == "pass" and aligned(domain_of(spf.get("smtp.mailfrom", "")), from_domain, aspf)
    dkim_ok = dkim.get("result") == "pass" and aligned(dkim.get("header.d", ""), from_domain, adkim)
    return "pass" if spf_ok or dkim_ok else "fail"


def is_lookalike(domain: str, brands: list[str]) -> bool:
    """True if a protected brand appears in the domain after undoing common digit swaps, but it is not the brand's own domain."""
    d = domain.lower()
    normalized = d.translate(HOMOGLYPHS)
    for brand in brands:
        own = f"{brand}.com"
        if org_domain(d) == own:
            return False
        if brand in normalized and brand not in d:
            return True  # e.g. micr0soft -> microsoft
        if brand in d and org_domain(d) != own:
            return True  # e.g. microsoft-login.example
    return False


URGENCY = re.compile(r"\b(urgent|immediately|suspend(ed)?|within 24 hours|final notice|verify now)\b", re.I)


def score(from_address: str, subject: str, auth_header: str, links: list[str], brands: list[str]) -> dict:
    from_domain = domain_of(from_address)
    results = parse_auth_results(auth_header)
    signals = []
    if dmarc(results, from_domain) == "fail":
        signals.append("dmarc_fail")
    if is_lookalike(from_domain, brands):
        signals.append("lookalike_sender")
    if any(is_lookalike(re.sub(r"^https?://", "", u).split("/")[0], brands) for u in links):
        signals.append("lookalike_link")
    if URGENCY.search(subject):
        signals.append("urgency")
    strong = {"lookalike_sender", "lookalike_link"} & set(signals)
    if strong and len(signals) >= 2:
        verdict = "phishing"
    elif signals:
        verdict = "unsure"  # route to a human
    else:
        verdict = "no_signals"
    return {"verdict": verdict, "signals": signals}


if __name__ == "__main__":
    header = ("Authentication-Results: mx.corp.example; spf=fail smtp.mailfrom=bounce@mailer-x.example; "
              "dkim=none; dmarc=fail header.from=micr0soft-help.example")
    print(score('"IT Support" <it-support@micr0soft-help.example>', "Urgent: your mailbox will be suspended",
                header, ["https://login.micr0soft-help.example/verify"], ["microsoft"]))
