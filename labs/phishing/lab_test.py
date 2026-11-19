import unittest

from lab import aligned, dmarc, is_lookalike, parse_auth_results, score

SPOOF = ("Authentication-Results: mx.corp.example;\n    spf=fail smtp.mailfrom=bounce@mailer-x.example;\n"
         "    dkim=none; dmarc=fail header.from=micr0soft-help.example")
GOOD = ("Authentication-Results: mx.corp.example; spf=pass smtp.mailfrom=bounce@mail.shop.example; "
        "dkim=pass header.d=shop.example header.s=s1")


class PhishingLabTest(unittest.TestCase):
    def test_parses_folded_header(self):
        r = parse_auth_results(SPOOF)
        self.assertEqual(r["spf"]["result"], "fail")
        self.assertEqual(r["spf"]["smtp.mailfrom"], "bounce@mailer-x.example")
        self.assertEqual(r["dkim"]["result"], "none")

    def test_alignment_relaxed_vs_strict(self):
        self.assertTrue(aligned("mail.shop.example", "shop.example", "r"))
        self.assertFalse(aligned("mail.shop.example", "shop.example", "s"))

    def test_dmarc_needs_an_aligned_pass(self):
        self.assertEqual(dmarc(parse_auth_results(GOOD), "shop.example"), "pass")
        # SPF passes, but for an unrelated domain: not aligned, so DMARC fails.
        unaligned = "x; spf=pass smtp.mailfrom=bulk@sender-service.example; dkim=none"
        self.assertEqual(dmarc(parse_auth_results(unaligned), "shop.example"), "fail")

    def test_lookalikes(self):
        self.assertTrue(is_lookalike("micr0soft-help.example", ["microsoft"]))
        self.assertTrue(is_lookalike("microsoft-login.example", ["microsoft"]))
        self.assertFalse(is_lookalike("login.microsoft.com", ["microsoft"]))
        self.assertFalse(is_lookalike("shop.example", ["microsoft"]))

    def test_scores_the_lesson_email_as_phishing(self):
        result = score('"IT Support" <it-support@micr0soft-help.example>', "Urgent: your mailbox will be suspended",
                       SPOOF, ["https://login.micr0soft-help.example/verify"], ["microsoft"])
        self.assertEqual(result["verdict"], "phishing")
        self.assertEqual(set(result["signals"]), {"dmarc_fail", "lookalike_sender", "lookalike_link", "urgency"})

    def test_weak_signals_are_unsure_not_phishing(self):
        result = score("news@shop.example", "Final notice: your order", GOOD, ["https://shop.example/o/1"], ["microsoft"])
        self.assertEqual(result, {"verdict": "unsure", "signals": ["urgency"]})


if __name__ == "__main__":
    unittest.main()
