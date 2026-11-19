"""Build an incident timeline from several log sources.

Merges events into one time-ordered list, flags known persistence techniques
(outside mail forwarding, attacker MFA device) and lists open questions for the
incident team. Standard library only; runs on the sample events below.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Event:
    time: str           # ISO 8601, e.g. "2026-11-19T02:14:00+00:00"
    source: str         # "identity", "mail", "files", ...
    action: str         # "sign-in", "inbox-rule-created", "mfa-method-added", ...
    detail: dict = field(default_factory=dict)


@dataclass
class Entry:
    when: datetime
    source: str
    action: str
    detail: dict
    flags: list[str]


def flags_for(e: Event, internal_domain: str) -> list[str]:
    flags = []
    if e.action == "inbox-rule-created":
        target = str(e.detail.get("forward_to", ""))
        if target and not target.lower().endswith("@" + internal_domain.lower()):
            flags.append("persistence: outside forwarding rule (ATT&CK T1114.003)")
    if e.action == "mfa-method-added" and e.detail.get("by_user_confirmed") is not True:
        flags.append("persistence: unconfirmed MFA device (ATT&CK T1098.005)")
    if e.action == "sign-in" and e.detail.get("new_country"):
        flags.append("suspicious: sign-in from a new country")
    return flags


def build_timeline(events: list[Event], internal_domain: str) -> list[Entry]:
    entries = [Entry(datetime.fromisoformat(e.time), e.source, e.action, e.detail, flags_for(e, internal_domain))
               for e in events]
    return sorted(entries, key=lambda x: x.when)


def open_questions(timeline: list[Entry]) -> list[str]:
    questions = []
    for x in timeline:
        if x.action == "inbox-rule-created" and x.flags:
            domain = str(x.detail.get("forward_to", "")).split("@")[-1]
            questions.append(f"Do any other mailboxes forward to {domain}?")
        if x.action == "sign-in" and x.flags:
            questions.append(f"Did any other account sign in from {x.detail.get('ip', 'the same IP')}?")
    if not any(x.source == "files" for x in timeline):
        questions.append("No file events found: was file auditing enabled for this period?")
    return list(dict.fromkeys(questions))  # unique, in order


SAMPLE = [
    Event("2026-11-19T02:19:00+00:00", "identity", "mfa-method-added", {"method": "phone"}),
    Event("2026-11-19T02:14:00+00:00", "identity", "sign-in", {"ip": "203.0.113.50", "new_country": True}),
    Event("2026-11-19T02:23:00+00:00", "mail", "inbox-rule-created", {"forward_to": "invoices@example.net"}),
]

if __name__ == "__main__":
    timeline = build_timeline(SAMPLE, "corp.example")
    for x in timeline:
        print(x.when.strftime("%H:%M"), x.source, x.action, "|", "; ".join(x.flags) or "-")
    print("Open questions:", *open_questions(timeline), sep="\n- ")
