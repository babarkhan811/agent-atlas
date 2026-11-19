# Sources

## Business decisions

| Claim | Source | Checked |
|---|---|---|
| Lemon Squeezy stopped accepting new users/stores on 2026-11-16 and stops processing on 2027-03-31 | [Lemon Squeezy migration docs](https://docs.lemonsqueezy.com/migration), [Saying goodbye to Lemon Squeezy](https://www.lemonsqueezy.com/blog/saying-goodbye-to-lemon-squeezy) | 2026-11-19 |
| Stripe Managed Payments is not available in every Lemon Squeezy country | [Lemon Squeezy migration docs](https://docs.lemonsqueezy.com/migration) | 2026-11-19 |
| Polar lists Pakistan as a supported payout country (via Stripe Connect Express; Stripe Payments availability not required) | [Polar: supported countries](https://polar.sh/docs/merchant-of-record/supported-countries) | 2026-11-19 |
| Paddle reportedly supports Pakistan-based sellers (wire/Payoneer payouts) — **verify directly with Paddle** | [Paddle vs Lemon Squeezy for Pakistan founders](https://jawadhassan.dev/blog/paddle-vs-lemonsqueezy-pakistan) (third party) | 2026-11-19 |

## Lesson content

Each lesson lists its sources in `content/lessons/<id>.json` (`sources`) with a `lastVerified` date; the page shows them under "Sources". `scripts/check-freshness.mjs` warns in CI when a lesson is older than 90 days.

### Verified 2026-11-19 (pilot lessons)

| Claim | Source |
|---|---|
| Anthropic streaming order: `message_start` → content blocks (`content_block_delta`) → `message_delta` carrying `stop_reason` and output usage → `message_stop` | [Anthropic streaming](https://platform.claude.com/docs/en/build-with-claude/streaming) |
| Anthropic tools: `name`, `description`, `input_schema`; `tool_use` / `tool_result` blocks; `strict: true` on a tool | [Anthropic tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) |
| OpenAI Responses API: `instructions`, `input`; function tools `{type, name, description, parameters, strict}`; `function_call` output with `call_id` and string `arguments`; results as `function_call_output` | [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling) |
| OpenAI streaming events `response.created`, `response.output_text.delta`, `response.completed`; `max_output_tokens` cap, status `incomplete` when reached | [OpenAI streaming](https://developers.openai.com/api/docs/guides/streaming-responses), [Create response reference](https://developers.openai.com/api/reference/python/resources/responses/methods/create) |
| Gemini: Interactions API recommended for new work (`function_call` / `function_result` steps, `previous_interaction_id`); generateContent labelled legacy but supported | [Interactions overview](https://ai.google.dev/gemini-api/docs/interactions-overview), [Migrating to Interactions](https://ai.google.dev/gemini-api/docs/migrate-to-interactions) |
| osquery `processes.parent` is the parent's PID (BIGINT) | [osquery processes spec](https://github.com/osquery/osquery/blob/master/specs/processes.table) |
| ATT&CK T1218.011 (Rundll32), T1566.001 (Spearphishing Attachment) | [T1218.011](https://attack.mitre.org/techniques/T1218/011/), [T1566.001](https://attack.mitre.org/techniques/T1566/001/) |
| Incident response roles and decision authority | [NIST SP 800-61 Rev. 3](https://csrc.nist.gov/pubs/sp/800/61/r3/final) |

Rules of thumb stated as such (not exact): ~¾ of an English word per token ([OpenAI Help](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them)). Token IDs, probabilities, timings and sizes in simulations are labelled illustrative.

### Per-lesson sources (generated from content/lessons, all verified 2026-11-19)

**What happens when you prompt an LLM** (llm-call)
- [Anthropic: Streaming messages (event types and order)](https://platform.claude.com/docs/en/build-with-claude/streaming)
- [OpenAI: Streaming API responses](https://developers.openai.com/api/docs/guides/streaming-responses)
- [Google: Gemini Interactions API, text generation](https://ai.google.dev/gemini-api/docs/interactions/text-generation)
- [OpenAI Help: What are tokens and how to count them](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them)

**Tool use (function calling)** (tool-use)
- [Anthropic: Tool use overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [OpenAI: Function calling guide](https://developers.openai.com/api/docs/guides/function-calling)
- [Google: Gemini Interactions API overview](https://ai.google.dev/gemini-api/docs/interactions-overview)
- [JSON Schema: Getting started](https://json-schema.org/learn/getting-started-step-by-step)

**The agent loop** (agent-loop)
- [Anthropic: Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- [Anthropic: How to implement tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use)
- [OpenAI: Function calling guide](https://developers.openai.com/api/docs/guides/function-calling)
- [Yao et al. (2022): ReAct, Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)

**Prompt injection and guardrails** (prompt-injection)
- [OWASP GenAI Security Project: LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- [Greshake et al. (2023): Not what you've signed up for, indirect prompt injection](https://arxiv.org/abs/2302.12173)
- [Hines et al. (2024): Defending Against Indirect Prompt Injection Attacks With Spotlighting](https://arxiv.org/abs/2403.14720)
- [Simon Willison (2025): The lethal trifecta for AI agents](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)
- [NVD: CVE-2025-32711 (AI command injection in M365 Copilot)](https://nvd.nist.gov/vuln/detail/CVE-2025-32711)

**RAG: retrieval-augmented generation** (rag)
- [Lewis et al. (2020): Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401)
- [Anthropic: Introducing Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval)
- [OpenAI: File search tool](https://developers.openai.com/api/docs/guides/tools-file-search)
- [Google: Gemini API File Search](https://ai.google.dev/gemini-api/docs/file-search)

**How agents remember** (memory)
- [Anthropic: Context windows](https://platform.claude.com/docs/en/build-with-claude/context-windows)
- [Anthropic: Compaction](https://platform.claude.com/docs/en/build-with-claude/compaction)
- [Anthropic: Memory tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool)
- [OpenAI: Conversation state](https://developers.openai.com/api/docs/guides/conversation-state)
- [Packer et al. (2023): MemGPT, Towards LLMs as Operating Systems](https://arxiv.org/abs/2310.08560)

**Context engineering and prompt caching** (context-caching)
- [Anthropic: Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Anthropic: Context windows](https://platform.claude.com/docs/en/build-with-claude/context-windows)
- [Anthropic: Compaction](https://platform.claude.com/docs/en/build-with-claude/compaction)
- [OpenAI: Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- [Google: Gemini context caching](https://ai.google.dev/gemini-api/docs/caching)

**MCP: Model Context Protocol** (mcp)
- [MCP specification 2026-07-28: Overview (messages, _meta, statelessness, error codes)](https://modelcontextprotocol.io/specification/2026-07-28/basic/index)
- [MCP specification 2026-07-28: Key changes (changelog)](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- [MCP specification 2026-07-28: server/discover](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
- [MCP specification 2026-07-28: Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [MCP specification 2026-07-28: stdio transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio)
- [MCP: Versioning (current revision)](https://modelcontextprotocol.io/specification/versioning)
- [A2A blog: A2A joins the Agentic AI Foundation (lists MCP as a sibling project)](https://a2a-protocol.org/latest/blog/2026/08/27/a-new-chapter-for-a2a-joining-the-agentic-ai-foundation/)

**Remote MCP: Streamable HTTP and OAuth** (mcp-remote)
- [MCP specification 2026-07-28: Streamable HTTP transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [MCP specification 2026-07-28: Authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- [MCP specification 2026-07-28: Authorization server discovery](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/authorization-server-discovery)
- [MCP specification 2026-07-28: Client registration](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration)
- [MCP specification 2026-07-28: Authorization security considerations](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations)
- [MCP specification 2026-07-28: Key changes (changelog)](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- [RFC 9728: OAuth 2.0 Protected Resource Metadata](https://datatracker.ietf.org/doc/html/rfc9728)
- [RFC 8707: Resource Indicators for OAuth 2.0](https://www.rfc-editor.org/rfc/rfc8707.html)

**A2A: Agent2Agent protocol** (a2a)
- [A2A Protocol specification (latest, v1.0)](https://a2a-protocol.org/latest/specification/)
- [A2A: Life of a task](https://a2a-protocol.org/latest/topics/life-of-a-task/)
- [A2A: Agent discovery](https://a2a-protocol.org/latest/topics/agent-discovery/)
- [A2A blog: A new chapter for A2A, joining the Agentic AI Foundation (2026-08-27)](https://a2a-protocol.org/latest/blog/2026/08/27/a-new-chapter-for-a2a-joining-the-agentic-ai-foundation/)
- [MCP specification 2026-07-28: Overview](https://modelcontextprotocol.io/specification/2026-07-28/basic/index)

**Reasoning models and structured outputs** (reasoning-structured)
- [Anthropic: Adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
- [Anthropic: Effort](https://platform.claude.com/docs/en/build-with-claude/effort)
- [Anthropic: Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [OpenAI: Reasoning models](https://developers.openai.com/api/docs/guides/reasoning)
- [OpenAI: Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Google: Gemini thinking](https://ai.google.dev/gemini-api/docs/thinking)
- [Google: Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output)

**AI workflow automation** (workflow)
- [Anthropic: Building effective agents (workflows vs agents)](https://www.anthropic.com/engineering/building-effective-agents)
- [Anthropic: Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [OpenAI: Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Google: Gemini structured output (Interactions API)](https://ai.google.dev/gemini-api/docs/interactions/structured-output)
- [Microsoft Graph: change notifications overview](https://learn.microsoft.com/en-us/graph/change-notifications-overview)
- [Gmail API: push notifications](https://developers.google.com/workspace/gmail/api/guides/push)
- [Stripe: idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [GitHub: validating webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)

**Multi-agent teams** (multi-agent)
- [Anthropic: How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Anthropic: Building effective agents (orchestrator-workers, evaluator-optimizer)](https://www.anthropic.com/engineering/building-effective-agents)
- [Zheng et al. (2023): Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685)

**Computer-use and browser agents** (computer-use)
- [Anthropic: Computer use tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)
- [OpenAI: Computer use (Responses API)](https://developers.openai.com/api/docs/guides/tools-computer-use)
- [Google: Gemini API computer use](https://ai.google.dev/gemini-api/docs/computer-use)
- [OWASP Top 10 for LLM Applications 2025: LLM06 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)

**Human-in-the-loop approvals** (human-in-loop)
- [OWASP Top 10 for LLM Applications 2025: LLM06 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)
- [Anthropic: Building effective agents (human checkpoints, stopping conditions)](https://www.anthropic.com/engineering/building-effective-agents)
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- [Stripe: idempotent requests](https://docs.stripe.com/api/idempotent_requests)

**Testing agents with evals** (evals)
- [Anthropic: Create strong empirical evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- [OpenAI: Evals guide](https://developers.openai.com/api/docs/guides/evals)
- [Zheng et al. (2023): Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685)
- [Yao et al. (2024): τ-bench, a benchmark for tool-agent-user interaction (pass^k)](https://arxiv.org/abs/2406.12045)
- [Chen et al. (2021): Evaluating Large Language Models Trained on Code (pass@k)](https://arxiv.org/abs/2107.03374)
- [Anthropic: How we built our multi-agent research system (rubric-based LLM judge)](https://www.anthropic.com/engineering/multi-agent-research-system)

**Observability and tracing for agents** (observability)
- [OpenTelemetry: Traces concepts](https://opentelemetry.io/docs/concepts/signals/traces/)
- [OpenTelemetry GenAI semantic conventions (repository)](https://github.com/open-telemetry/semantic-conventions-genai)
- [OpenTelemetry GenAI: spans and content capture](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-spans.md)
- [OpenTelemetry GenAI: execute_tool spans](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/execute-tool.md)

**Cost and latency budgeting** (cost-latency)
- [Anthropic: Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Anthropic: Prompt caching (cache write and read multipliers)](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Anthropic: Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- [Anthropic: Task budgets](https://platform.claude.com/docs/en/build-with-claude/task-budgets)
- [Anthropic: Token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting)
- [OpenAI: Batch API](https://developers.openai.com/api/docs/guides/batch)
- [OpenAI: Latency optimization](https://developers.openai.com/api/docs/guides/latency-optimization)

**Software agents + AI agents working together** (software-plus-ai-agents)
- [osquery: processes table specification](https://github.com/osquery/osquery/blob/master/specs/processes.table)
- [osquery documentation](https://osquery.readthedocs.io/en/stable/)
- [MITRE ATT&CK T1218.011: System Binary Proxy Execution, Rundll32](https://attack.mitre.org/techniques/T1218/011/)
- [MITRE ATT&CK T1566.001: Phishing, Spearphishing Attachment](https://attack.mitre.org/techniques/T1566/001/)
- [NIST SP 800-61 Rev. 3: Incident Response Recommendations](https://csrc.nist.gov/pubs/sp/800/61/r3/final)
- [Velociraptor documentation](https://docs.velociraptor.app/)

**AI alert triage in the SOC** (soc-triage)
- [MITRE ATT&CK T1059.001: Command and Scripting Interpreter, PowerShell](https://attack.mitre.org/techniques/T1059/001/)
- [MITRE ATT&CK T1027.010: Obfuscated Files or Information, Command Obfuscation](https://attack.mitre.org/techniques/T1027/010/)
- [MITRE ATT&CK T1105: Ingress Tool Transfer](https://attack.mitre.org/techniques/T1105/)
- [MITRE ATT&CK T1204.002: User Execution, Malicious File](https://attack.mitre.org/techniques/T1204/002/)
- [MITRE ATT&CK T1566.001: Phishing, Spearphishing Attachment](https://attack.mitre.org/techniques/T1566/001/)
- [NIST SP 800-61 Rev. 3: Incident Response Recommendations](https://csrc.nist.gov/pubs/sp/800/61/r3/final)
- [CISA: Federal Government Cybersecurity Incident and Vulnerability Response Playbooks](https://www.cisa.gov/resources-tools/resources/federal-government-cybersecurity-incident-and-vulnerability-response-playbooks)

**Automated phishing analysis** (phishing)
- [RFC 9989: Domain-based Message Authentication, Reporting, and Conformance (DMARC), May 2026, obsoletes RFC 7489](https://www.rfc-editor.org/rfc/rfc9989)
- [RFC 7208: Sender Policy Framework (SPF)](https://www.rfc-editor.org/rfc/rfc7208)
- [RFC 6376: DomainKeys Identified Mail (DKIM) Signatures](https://www.rfc-editor.org/rfc/rfc6376)
- [RFC 8601: Message Header Field for Indicating Message Authentication Status](https://www.rfc-editor.org/rfc/rfc8601)
- [MITRE ATT&CK T1566.002: Phishing, Spearphishing Link](https://attack.mitre.org/techniques/T1566/002/)
- [CISA: Phishing Guidance, Stopping the Attack Cycle at Phase One](https://www.cisa.gov/resources-tools/resources/phishing-guidance-stopping-attack-cycle-phase-one)

**Security playbooks on autopilot (SOAR)** (soar-playbook)
- [CISA: Federal Government Cybersecurity Incident and Vulnerability Response Playbooks](https://www.cisa.gov/resources-tools/resources/federal-government-cybersecurity-incident-and-vulnerability-response-playbooks)
- [NIST SP 800-61 Rev. 3: Incident Response Recommendations](https://csrc.nist.gov/pubs/sp/800/61/r3/final)
- [MITRE ATT&CK T1555.003: Credentials from Web Browsers](https://attack.mitre.org/techniques/T1555/003/)
- [MITRE ATT&CK T1539: Steal Web Session Cookie](https://attack.mitre.org/techniques/T1539/)
- [MITRE ATT&CK T1204.002: User Execution, Malicious File](https://attack.mitre.org/techniques/T1204/002/)

**Threat hunting with AI** (threat-hunting)
- [MITRE ATT&CK T1071.001: Application Layer Protocol, Web Protocols](https://attack.mitre.org/techniques/T1071/001/)
- [MITRE ATT&CK T1573: Encrypted Channel](https://attack.mitre.org/techniques/T1573/)
- [Sigma Detection Format: Rules](https://sigmahq.io/docs/basics/rules.html)
- [Sigma specification (SigmaHQ)](https://github.com/SigmaHQ/sigma-specification)
- [RITA: open-source beacon and network threat hunting tool (Active Countermeasures)](https://github.com/activecm/rita)
- [MITRE ATT&CK data sources](https://attack.mitre.org/datasources/)

**Incident response with an AI co-pilot** (incident-response)
- [NIST SP 800-61 Rev. 3: Incident Response Recommendations and Considerations for Cybersecurity Risk Management](https://csrc.nist.gov/pubs/sp/800/61/r3/final)
- [MITRE ATT&CK T1114.003: Email Collection, Email Forwarding Rule](https://attack.mitre.org/techniques/T1114/003/)
- [Microsoft Learn: Revoke user access in an emergency in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/users/users-revoke-access)
- [Microsoft Learn: Continuous access evaluation in Microsoft Entra](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-continuous-access-evaluation)

**Vulnerability fixing agent** (vuln-patch)
- [FIRST: CVSS v4.0 Specification Document](https://www.first.org/cvss/v4-0/specification-document)
- [CISA: Known Exploited Vulnerabilities Catalog](https://www.cisa.gov/known-exploited-vulnerabilities)
- [FIRST: Exploit Prediction Scoring System (EPSS)](https://www.first.org/epss/)
- [NIST National Vulnerability Database](https://nvd.nist.gov/)

**Auto-fixing cloud misconfigurations** (cloud-remediation)
- [AWS: Blocking public access to your Amazon S3 storage](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html)
- [Microsoft Learn: Remediate anonymous read access to blob data](https://learn.microsoft.com/en-us/azure/storage/blobs/anonymous-read-access-prevent)
- [Google Cloud: Public access prevention for Cloud Storage](https://docs.cloud.google.com/storage/docs/public-access-prevention)
- [AWS: Configuring block public access settings for your S3 buckets](https://docs.aws.amazon.com/AmazonS3/latest/userguide/configuring-block-public-access-bucket.html)
- [Terraform AWS provider: aws_s3_bucket_public_access_block](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block)

**Automated access reviews** (access-review)
- [NIST SP 800-53 Rev. 5: Security and Privacy Controls (AC-2 Account Management, AC-6 Least Privilege)](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf)
- [Microsoft Learn: Revoke user access in an emergency in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/users/users-revoke-access)
- [MITRE ATT&CK T1078: Valid Accounts](https://attack.mitre.org/techniques/T1078/)

