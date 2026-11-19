# Agent Atlas

Interactive, step-by-step lessons on how AI agents work: LLM calls, tool use, the agent loop, RAG, memory, MCP, multi-agent teams, computer use, workflow automation, cybersecurity automation (SOC triage, SOAR playbooks, phishing analysis, vulnerability fixing, cloud misconfiguration fixes, access reviews, threat hunting, incident response), safety guardrails and evals.

There is also a build guide (`#/guide`) on automating cybersecurity with software agents and AI: automation ladder, architecture, step-by-step plan, tools, example code, safeguards and metrics.

Each lesson animates messages between components and decodes every request field by field.

**Live site:** https://babarkhan811.github.io/agent-atlas/

## Run locally

It's plain HTML, CSS and JavaScript with no build step. Open `index.html` in a browser.

## Add a lesson

Add an object to `lessons.js` with `nodes` (positions in %) and `steps` (`from`, `to`, `label`, `title`, `text`, `payload`).
