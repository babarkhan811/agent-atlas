import assert from "node:assert/strict";
import { test } from "node:test";
import { aligned, dmarc, isLookalike, parseAuthResults, score } from "./lab.ts";

const SPOOF = "Authentication-Results: mx.corp.example;\n    spf=fail smtp.mailfrom=bounce@mailer-x.example;\n    dkim=none; dmarc=fail header.from=micr0soft-help.example";
const GOOD = "Authentication-Results: mx.corp.example; spf=pass smtp.mailfrom=bounce@mail.shop.example; dkim=pass header.d=shop.example header.s=s1";

test("parses a folded header", () => {
  const r = parseAuthResults(SPOOF);
  assert.equal(r.spf!.result, "fail");
  assert.equal(r.spf!["smtp.mailfrom"], "bounce@mailer-x.example");
  assert.equal(r.dkim!.result, "none");
});

test("relaxed vs strict alignment", () => {
  assert.equal(aligned("mail.shop.example", "shop.example", "r"), true);
  assert.equal(aligned("mail.shop.example", "shop.example", "s"), false);
});

test("DMARC needs an aligned pass", () => {
  assert.equal(dmarc(parseAuthResults(GOOD), "shop.example"), "pass");
  assert.equal(dmarc(parseAuthResults("x; spf=pass smtp.mailfrom=bulk@sender-service.example; dkim=none"), "shop.example"), "fail");
});

test("lookalikes", () => {
  assert.equal(isLookalike("micr0soft-help.example", ["microsoft"]), true);
  assert.equal(isLookalike("microsoft-login.example", ["microsoft"]), true);
  assert.equal(isLookalike("login.microsoft.com", ["microsoft"]), false);
  assert.equal(isLookalike("shop.example", ["microsoft"]), false);
});

test("scores the lesson email as phishing", () => {
  const r = score('"IT Support" <it-support@micr0soft-help.example>', "Urgent: your mailbox will be suspended", SPOOF,
    ["https://login.micr0soft-help.example/verify"], ["microsoft"]);
  assert.equal(r.verdict, "phishing");
  assert.deepEqual(new Set(r.signals), new Set(["dmarc_fail", "lookalike_sender", "lookalike_link", "urgency"]));
});

test("weak signals are unsure, not phishing", () => {
  assert.deepEqual(score("news@shop.example", "Final notice: your order", GOOD, ["https://shop.example/o/1"], ["microsoft"]),
    { verdict: "unsure", signals: ["urgency"] });
});
