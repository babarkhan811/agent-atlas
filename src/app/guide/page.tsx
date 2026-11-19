import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { lessonHref, lessonIndex, loadContent } from "@/content";
import { PageShell } from "@/components/PageShell";
import { absUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Build guide: automate cybersecurity with software agents and AI",
  alternates: { canonical: absUrl("/guide/") },
  description: "A practical guide to automating security operations with software agents and AI agents: automation ladder, architecture, tools, example code and safeguards.",
};

// The sample is the real lab file, so the guide always shows tested code.
const TRIAGE_AGENT_CODE = fs.readFileSync(path.join(process.cwd(), "labs/security/lab.py"), "utf8").trim();

function lessonHrefById(id: string) {
  const l = loadContent().lessons.find((x) => x.id === id);
  if (!l) throw new Error(`guide links to unknown lesson "${id}"`);
  return lessonHref(l);
}

export default function GuidePage() {
  return (
    <PageShell index={lessonIndex()}>
      <div className="crumbs"><Link href="/">Lessons</Link> / Build guide</div>
      <div className="lesson-head">
        <h1>How to automate cybersecurity with software agents and AI</h1>
        <p>A practical guide: what to build, which tools to use, and how to keep it safe.</p>
      </div>
      <div className="guide">
        <nav className="toc">
          <a href="#two-agents">Two kinds of agent</a>
          <a href="#ladder">Automation ladder</a>
          <a href="#architecture">Architecture</a>
          <a href="#steps">Build it step by step</a>
          <a href="#tools">Tools</a>
          <a href="#code">Example code</a>
          <a href="#human">Automate vs. human</a>
          <a href="#safety">Safeguards</a>
          <a href="#metrics">Measure it</a>
        </nav>
        <div className="guide-body">
      
        <section id="two-agents">
          <h2>1. Two kinds of "agent"</h2>
          <p>In security, the word <em>agent</em> means two different things. Good automation uses both.</p>
          <div className="two-col">
            <div className="box">
              <h3>Software agents</h3>
              <p>Small programs installed on laptops, servers and cloud workloads.</p>
              <ul>
                <li><b>Collect:</b> processes, logins, files, network connections</li>
                <li><b>Answer questions:</b> "which machines have this file?"</li>
                <li><b>Enforce:</b> kill a process, quarantine a file, isolate a machine</li>
              </ul>
              <p className="muted">Examples: EDR sensors, osquery, Wazuh agent, Velociraptor.</p>
            </div>
            <div className="box">
              <h3>AI agents</h3>
              <p>A language model that calls tools in a loop to reach a goal.</p>
              <ul>
                <li><b>Read:</b> alerts, logs, emails, code, threat reports</li>
                <li><b>Reason:</b> "is this real? how bad? what's related?"</li>
                <li><b>Act through tools:</b> query, enrich, open tickets, propose fixes</li>
              </ul>
              <p className="muted">The AI agent decides; software agents see and act on machines.</p>
            </div>
          </div>
          <p><Link href={lessonHrefById("software-plus-ai-agents")}>▶ Watch them work together, step by step</Link></p>
        </section>
      
        <section id="ladder">
          <h2>2. The automation ladder</h2>
          <p>Climb one rung at a time. Each rung builds on the one below it.</p>
          <ol className="ladder">
            <li><b>Scripts</b><span>Python or PowerShell that does one job, like blocking an IP list every night.</span></li>
            <li><b>Workflows / SOAR</b><span>Playbooks: trigger → fixed steps → result. Predictable, auditable, no AI needed.</span></li>
            <li><b>AI-assisted</b><span>An LLM step inside the workflow: summarise an alert, classify an email, write a query. A person still decides.</span></li>
            <li><b>AI agents with guardrails</b><span>The AI chooses which tools to use and in what order. Read-only and undoable actions run on their own; disruptive ones need approval.</span></li>
            <li><b>Autonomous for proven cases</b><span>Fully automatic only for alert types where the agent has a long, measured track record.</span></li>
          </ol>
        </section>
      
        <section id="architecture">
          <h2>3. Reference architecture</h2>
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
        </section>
      
        <section id="steps">
          <h2>4. Build it step by step</h2>
          <ol className="steps-list">
            <li><b>Get visibility first.</b> Install software agents on every machine and send logs to one SIEM. AI can't investigate what you don't collect.</li>
            <li><b>Pick one noisy, boring problem.</b> Good first targets: phishing reports, "impossible travel" logins, known-malware alerts. Count how many you get and how long each takes today.</li>
            <li><b>Write the playbook as a human would do it.</b> List the steps an analyst follows. That list becomes your workflow, and the judgement calls become the AI's job.</li>
            <li><b>Connect read-only tools.</b> Threat-intel lookups, log search, host queries. Start the AI in "advise only" mode: it writes a verdict but takes no action.</li>
            <li><b>Compare with your analysts for 2–4 weeks.</b> Run it alongside humans (shadow mode). Track where it agrees and where it's wrong.</li>
            <li><b>Allow reversible actions.</b> Quarantine a file, disable a phishing link, open a ticket. Keep disruptive actions behind approval.</li>
            <li><b>Build evals.</b> Turn real past alerts into a test set and re-run it whenever you change the prompt, model or tools.</li>
            <li><b>Expand to the next use case.</b> Reuse the same tool layer, guardrails and audit log.</li>
          </ol>
        </section>
      
        <section id="tools">
          <h2>5. Tools you can use</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Job</th><th>Open source</th><th>Commercial examples</th></tr></thead>
              <tbody>
                <tr><td>Software agents on machines</td><td>Wazuh agent, osquery, Velociraptor</td><td>CrowdStrike Falcon, Microsoft Defender for Endpoint, SentinelOne</td></tr>
                <tr><td>Network monitoring</td><td>Suricata, Zeek</td><td>Darktrace, Vectra</td></tr>
                <tr><td>SIEM / log search</td><td>Wazuh, Elastic Security</td><td>Splunk, Microsoft Sentinel, Google SecOps</td></tr>
                <tr><td>Workflow / SOAR</td><td>Shuffle, n8n</td><td>Tines, Splunk SOAR, Cortex XSOAR</td></tr>
                <tr><td>Cases & threat intel</td><td>TheHive, MISP, OpenCTI</td><td>Recorded Future, VirusTotal</td></tr>
                <tr><td>Detection rules</td><td>Sigma, YARA</td><td>Built into most SIEM/EDR products</td></tr>
                <tr><td>AI agent layer</td><td>Your own agent loop + any LLM with tool calling; MCP servers to plug in tools</td><td>Security copilots built into SIEM/EDR platforms</td></tr>
              </tbody>
            </table>
          </div>
          <p className="muted">A low-cost starter stack: Wazuh (agents + SIEM) → Shuffle or n8n (workflows) → an LLM step for triage → TheHive for cases.</p>
        </section>
      
        <section id="code">
          <h2>6. Example: a minimal triage agent</h2>
          <p>Provider-neutral Python with every safeguard from this guide: risk-tagged tools, argument validation, unknown-tool handling, approval for disruptive actions, hourly action limits, a step limit and an audit log. It ships with tests and a TypeScript version in <code>labs/security/</code>; plug in any LLM client that supports tool calling.</p>
      <pre tabIndex={0} aria-label="labs/security/lab.py source code"><code>{TRIAGE_AGENT_CODE}</code></pre>
        </section>
      
        <section id="human">
          <h2>7. What to automate vs. keep human</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Let automation do it</th><th>Keep a person in charge</th></tr></thead>
              <tbody>
                <tr><td>Collecting and enriching evidence</td><td>Isolating servers or critical systems</td></tr>
                <tr><td>Closing obvious false positives (with notes)</td><td>Disabling executives' or service accounts</td></tr>
                <tr><td>Quarantining files, blocking known-bad hashes and domains</td><td>Deleting data or wiping machines</td></tr>
                <tr><td>Writing tickets, timelines and reports</td><td>Talking to customers, regulators or police</td></tr>
                <tr><td>Drafting fixes as pull requests</td><td>Merging to production</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      
        <section id="safety">
          <h2>8. Safeguards you need</h2>
          <ul className="checks">
            <li><b>Least privilege:</b> the agent's accounts can only do what its tools need.</li>
            <li><b>Untrusted input:</b> alerts, emails and web pages can carry prompt injection. Label them as data, and never let them unlock new tools.</li>
            <li><b>Risk-tagged tools:</b> read → auto, reversible → auto + log, disruptive → approval.</li>
            <li><b>Limits:</b> max steps, max actions per hour, and a kill switch.</li>
            <li><b>Audit everything:</b> inputs, reasoning summary, tool calls, approvals, results.</li>
            <li><b>Fail safe:</b> if the agent is unsure or errors, it escalates to a human. It never guesses.</li>
            <li><b>Evals before every change:</b> re-run past alerts and block regressions.</li>
          </ul>
          <p><Link href={lessonHrefById("prompt-injection")}>▶ See prompt injection and guardrails in action</Link></p>
        </section>
      
        <section id="metrics">
          <h2>9. Measure if it's working</h2>
          <div className="metrics">
            <div><b>MTTD</b><span>Mean time to detect</span></div>
            <div><b>MTTR</b><span>Mean time to respond / contain</span></div>
            <div><b>Auto-closed %</b><span>Alerts resolved without a human</span></div>
            <div><b>Agreement</b><span>How often analysts agree with the AI verdict</span></div>
            <div><b>Missed threats</b><span>True attacks the AI marked benign (keep this near zero)</span></div>
            <div><b>Analyst hours saved</b><span>Per week, per use case</span></div>
          </div>
        </section>
        </div>
      </div>
    </PageShell>
  );
}
