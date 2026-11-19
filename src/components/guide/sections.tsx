// Build guide content, one entry per sub-page (/guide/<slug>/).
import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import type { ReactNode } from "react";
import { lessonHref, loadContent } from "@/content";
import { CodeTabs } from "../ArticleWidgets";

function lessonLink(id: string) {
  const l = loadContent().lessons.find((x) => x.id === id);
  if (!l) throw new Error(`guide links to unknown lesson "${id}"`);
  return lessonHref(l);
}

function labFiles() {
  const read = (f: string) => fs.readFileSync(path.join(process.cwd(), "labs/security", f), "utf8").trim();
  return [
    { label: "Python", name: "labs/security/lab.py", code: read("lab.py"), run: "python -m unittest lab_test" },
    { label: "TypeScript", name: "labs/security/lab.ts", code: read("lab.ts"), run: "node --test lab.test.ts" },
  ];
}

export type GuideSection = { slug: string; title: string; summary: string; body: () => ReactNode };

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    slug: "two-kinds-of-agent",
    title: "Two kinds of \"agent\"",
    summary: "Software agents observe and act on machines; AI agents reason about what to check and what to do. Good automation uses both.",
    body: () => (
      <>
        <p>In security, the word <em>agent</em> has long meant a small program installed on a machine. AI has given the word a second meaning. Mixing them up leads to architectures where an AI is expected to see things it cannot, or where a sensor is expected to make judgements it was never built for.</p>
        <div className="two-col">
          <div className="box">
            <h3>Software agents</h3>
            <p>Small programs installed on laptops, servers and cloud workloads.</p>
            <ul>
              <li><b>Collect:</b> processes, logins, files, network connections</li>
              <li><b>Answer questions:</b> &quot;which machines have this file?&quot;</li>
              <li><b>Enforce:</b> kill a process, quarantine a file, isolate a machine</li>
            </ul>
            <p className="muted">Examples: EDR sensors, osquery, Wazuh agent, Velociraptor.</p>
          </div>
          <div className="box">
            <h3>AI agents</h3>
            <p>A language model that calls tools in a loop to reach a goal.</p>
            <ul>
              <li><b>Read:</b> alerts, logs, emails, code, threat reports</li>
              <li><b>Reason:</b> &quot;is this real? how bad? what&apos;s related?&quot;</li>
              <li><b>Act through tools:</b> query, enrich, open tickets, propose fixes</li>
            </ul>
            <p className="muted">The AI agent decides; software agents see and act on machines.</p>
          </div>
        </div>
        <p>The useful mental model is a detective and a team of officers. The AI agent decides which questions to ask and what the evidence means. Software agents are the officers at each machine: they run the query, report exactly what they find, and carry out approved actions such as isolating a laptop. The AI never needs direct access to a machine, and the sensors never need to decide what is malicious.</p>
        <p>That split also gives you a clean security boundary. Everything the AI does passes through tools you define, so permissions, approvals and logging live in code you control.</p>
        <p><Link href={lessonLink("software-plus-ai-agents")}>▶ Watch them work together, step by step</Link></p>
      </>
    ),
  },
  {
    slug: "automation-ladder",
    title: "The automation ladder",
    summary: "Climb from scripts to workflows to AI-assisted steps to guarded agents, one rung at a time.",
    body: () => (
      <>
        <p>Teams that jump straight to autonomous agents usually end up switching them off. Teams that climb one rung at a time build trust, data and safeguards along the way. Each rung reuses what the previous one built.</p>
        <ol className="ladder">
          <li><b>Scripts</b><span>Python or PowerShell that does one job, like blocking an IP list every night.</span></li>
          <li><b>Workflows / SOAR</b><span>Playbooks: trigger → fixed steps → result. Predictable, auditable, no AI needed.</span></li>
          <li><b>AI-assisted</b><span>An LLM step inside the workflow: summarise an alert, classify an email, write a query. A person still decides.</span></li>
          <li><b>AI agents with guardrails</b><span>The AI chooses which tools to use and in what order. Read-only and undoable actions run on their own; disruptive ones need approval.</span></li>
          <li><b>Autonomous for proven cases</b><span>Fully automatic only for alert types where the agent has a long, measured track record.</span></li>
        </ol>
        <p>How do you know when to climb? Move up a rung only when the current one is measured: you know how many alerts it handles, how often it is wrong, and what an error costs. Many workloads should stay on rung two for good. A fixed playbook that always quarantines a known-bad file is cheaper, faster and easier to audit than an agent that might.</p>
        <p><Link href={lessonLink("workflow")}>▶ Compare a workflow with an agent in the simulation</Link></p>
      </>
    ),
  },
  {
    slug: "architecture",
    title: "Reference architecture",
    summary: "Sources feed a SIEM, an AI agent investigates through a permissioned tool layer, and humans approve with everything logged.",
    body: () => (
      <>
        <p>Most working designs share the same five layers. Data flows down; decisions and approvals flow back up. The AI agent is one layer, not the whole system.</p>
        <div className="arch">
          <div className="layer"><b>Sources</b><span>Software agents on endpoints · firewalls · cloud logs · email · identity provider</span></div>
          <div className="arrow">↓</div>
          <div className="layer"><b>SIEM / data lake</b><span>Stores all events, runs detection rules, raises alerts</span></div>
          <div className="arrow">↓</div>
          <div className="layer hi"><b>AI agent + SOAR</b><span>Triage, enrichment, investigation, response plans</span></div>
          <div className="arrow">↓</div>
          <div className="layer"><b>Tool layer (with permissions)</b><span>Threat intel · EDR actions · identity actions · ticketing · chat. Each tool tagged read / reversible / disruptive.</span></div>
          <div className="arrow">↓</div>
          <div className="layer"><b>Humans + audit log</b><span>Approvals, overrides, and a record of every decision</span></div>
        </div>
        <p>Two layers deserve the most design effort. The <b>tool layer</b> is where policy lives: each tool has a schema, a risk tag and the narrowest credentials that work. The <b>audit log</b> is what lets you trust the system later: every query, verdict, approval and action with timestamps and identities.</p>
        <p>If you already run a SOAR platform, the AI agent usually becomes a step inside existing playbooks first, rather than a replacement for them.</p>
      </>
    ),
  },
  {
    slug: "step-by-step",
    title: "Build it step by step",
    summary: "Eight steps from visibility to a guarded agent in production, starting with one noisy, boring problem.",
    body: () => (
      <>
        <ol className="steps-list">
          <li><b>Get visibility first.</b> Install software agents on every machine and send logs to one SIEM. AI can&apos;t investigate what you don&apos;t collect.</li>
          <li><b>Pick one noisy, boring problem.</b> Good first targets: phishing reports, &quot;impossible travel&quot; logins, known-malware alerts. Count how many you get and how long each takes today.</li>
          <li><b>Write the playbook as a human would do it.</b> List the steps an analyst follows. That list becomes your workflow, and the judgement calls become the AI&apos;s job.</li>
          <li><b>Connect read-only tools.</b> Threat-intel lookups, log search, host queries. Start the AI in &quot;advise only&quot; mode: it writes a verdict but takes no action.</li>
          <li><b>Compare with your analysts for 2–4 weeks.</b> Run it alongside humans (shadow mode). Track where it agrees and where it&apos;s wrong.</li>
          <li><b>Allow reversible actions.</b> Quarantine a file, disable a phishing link, open a ticket. Keep disruptive actions behind approval.</li>
          <li><b>Build evals.</b> Turn real past alerts into a test set and re-run it whenever you change the prompt, model or tools.</li>
          <li><b>Expand to the next use case.</b> Reuse the same tool layer, guardrails and audit log.</li>
        </ol>
        <p>The baseline in step 2 matters more than it looks. Without today&apos;s numbers you cannot show that the agent saved time, and you cannot spot it quietly getting worse. Record the alert volume, median handling time and false-positive rate before you change anything.</p>
        <p><Link href={lessonLink("evals")}>▶ See how evals catch regressions</Link></p>
      </>
    ),
  },
  {
    slug: "tools",
    title: "Tools you can use",
    summary: "Open-source and commercial options for each layer, plus a low-cost starter stack.",
    body: () => (
      <>
        <p>Examples only: inclusion is not an endorsement and no vendor pays to be listed. Check licences, data-handling terms and integrations for your environment.</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Job</th><th>Open source</th><th>Commercial examples</th></tr></thead>
            <tbody>
              <tr><td>Software agents on machines</td><td>Wazuh agent, osquery, Velociraptor</td><td>CrowdStrike Falcon, Microsoft Defender for Endpoint, SentinelOne</td></tr>
              <tr><td>Network monitoring</td><td>Suricata, Zeek</td><td>Darktrace, Vectra</td></tr>
              <tr><td>SIEM / log search</td><td>Wazuh, Elastic Security</td><td>Splunk, Microsoft Sentinel, Google SecOps</td></tr>
              <tr><td>Workflow / SOAR</td><td>Shuffle, n8n</td><td>Tines, Splunk SOAR, Cortex XSOAR</td></tr>
              <tr><td>Cases &amp; threat intel</td><td>TheHive, MISP, OpenCTI</td><td>Recorded Future, VirusTotal</td></tr>
              <tr><td>Detection rules</td><td>Sigma, YARA</td><td>Built into most SIEM/EDR products</td></tr>
              <tr><td>AI agent layer</td><td>Your own agent loop + any LLM with tool calling; MCP servers to plug in tools</td><td>Security copilots built into SIEM/EDR platforms</td></tr>
            </tbody>
          </table>
        </div>
        <p className="muted">A low-cost starter stack: Wazuh (agents + SIEM) → Shuffle or n8n (workflows) → an LLM step for triage → TheHive for cases.</p>
        <p>Whatever you choose, check that each tool has an API the agent can call with narrowly scoped credentials, and that its actions are logged on the tool&apos;s side as well as yours.</p>
        <p><Link href={lessonLink("mcp")}>▶ Learn how MCP connects agents to tools</Link></p>
      </>
    ),
  },
  {
    slug: "reference-implementation",
    title: "Reference implementation",
    summary: "A tested triage agent in Python and TypeScript with every safeguard from this guide.",
    body: () => (
      <>
        <p>Provider-neutral code with every safeguard from this guide: risk-tagged tools, argument validation, unknown-tool handling, approval for disruptive actions, hourly action limits, a step limit and an audit log. Plug in any LLM client that supports tool calling by implementing one method. Both versions ship with tests that run in our CI on every change.</p>
        <CodeTabs files={labFiles()} />
        <p>Source and tests: <a href="https://github.com/babarkhan811/agent-atlas/tree/main/labs/security" rel="noopener noreferrer" target="_blank">labs/security on GitHub</a>.</p>
        <p>Read the code in this order: <code>run_tool</code> (the policy checks), then <code>triage</code> (the loop), then the tests, which show each safeguard working: unknown tools, bad arguments, denied approvals, rate limits and the step limit.</p>
      </>
    ),
  },
  {
    slug: "automate-vs-human",
    title: "What to automate vs. keep human",
    summary: "Let automation gather evidence and take reversible steps; keep people in charge of disruptive or external actions.",
    body: () => (
      <>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Let automation do it</th><th>Keep a person in charge</th></tr></thead>
            <tbody>
              <tr><td>Collecting and enriching evidence</td><td>Isolating servers or critical systems</td></tr>
              <tr><td>Closing obvious false positives (with notes)</td><td>Disabling executives&apos; or service accounts</td></tr>
              <tr><td>Quarantining files, blocking known-bad hashes and domains</td><td>Deleting data or wiping machines</td></tr>
              <tr><td>Writing tickets, timelines and reports</td><td>Talking to customers, regulators or police</td></tr>
              <tr><td>Drafting fixes as pull requests</td><td>Merging to production</td></tr>
            </tbody>
          </table>
        </div>
        <p>The rule of thumb is reversibility and blast radius. Actions that are easy to undo and affect one object can be automated once measured. Actions that disrupt people, touch production, or communicate outside the organisation need a named human, at least until the track record for that exact action is long and clean.</p>
        <p><Link href={lessonLink("human-in-loop")}>▶ See an approval gate in the simulation</Link></p>
      </>
    ),
  },
  {
    slug: "safeguards",
    title: "Safeguards you need",
    summary: "Least privilege, untrusted-input handling, risk tags, limits, audit logs, fail-safe escalation and evals.",
    body: () => (
      <>
        <ul className="checks">
          <li><b>Least privilege:</b> the agent&apos;s accounts can only do what its tools need.</li>
          <li><b>Untrusted input:</b> alerts, emails and web pages can carry prompt injection. Label them as data, and never let them unlock new tools.</li>
          <li><b>Risk-tagged tools:</b> read → auto, reversible → auto + log, disruptive → approval.</li>
          <li><b>Limits:</b> max steps, max actions per hour, and a kill switch.</li>
          <li><b>Audit everything:</b> inputs, reasoning summary, tool calls, approvals, results.</li>
          <li><b>Fail safe:</b> if the agent is unsure or errors, it escalates to a human. It never guesses.</li>
          <li><b>Evals before every change:</b> re-run past alerts and block regressions.</li>
        </ul>
        <p>Notice that none of these depend on the model behaving well. Instructions in a system prompt help, but they are not controls: a confused or manipulated model can ignore them. Every safeguard above is enforced in code around the model.</p>
        <p><Link href={lessonLink("prompt-injection")}>▶ See prompt injection and guardrails in action</Link></p>
      </>
    ),
  },
  {
    slug: "metrics",
    title: "Measure if it's working",
    summary: "Track detection and response times, automation rate, agreement with analysts and, above all, missed threats.",
    body: () => (
      <>
        <div className="metrics">
          <div><b>MTTD</b><span>Mean time to detect</span></div>
          <div><b>MTTR</b><span>Mean time to respond / contain</span></div>
          <div><b>Auto-closed %</b><span>Alerts resolved without a human</span></div>
          <div><b>Agreement</b><span>How often analysts agree with the AI verdict</span></div>
          <div><b>Missed threats</b><span>True attacks the AI marked benign (keep this near zero)</span></div>
          <div><b>Analyst hours saved</b><span>Per week, per use case</span></div>
        </div>
        <p>Report these per use case, not as one global number: an agent can be excellent at phishing triage and poor at cloud alerts. Review a sample of auto-closed alerts every week, because missed threats only show up if someone looks.</p>
        <p><Link href={lessonLink("observability")}>▶ Learn how tracing makes these numbers possible</Link></p>
      </>
    ),
  },
];
