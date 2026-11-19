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
