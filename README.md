# Agent Atlas

Interactive, protocol-level simulations of how AI agents work: LLM calls, tool use, the agent loop, RAG, memory, MCP, multi-agent systems, automation, safety, evals, and a premium path on AI for security teams.

**Live:** https://babarkhan811.github.io/agent-atlas/

## Develop

Requires Node 24.

```bash
npm ci
npm run dev          # http://localhost:3000
npm run typecheck
npm test             # unit tests (Vitest)
npm run build        # static export to ./out
npm run test:e2e     # Playwright against ./out (PW_CHANNEL=msedge to use an installed Edge)
```

## Layout

| Path | What |
|---|---|
| `content/lessons/*.json` | One file per lesson, validated by `src/content/schema.ts` |
| `content/paths.json`, `content/glossary.json` | Learning paths and glossary |
| `src/sim/` | Simulation engine: isometric projection, icon kit, layout, `<Diagram />`, `<Sequence />` |
| `src/components/` | App shell, workspace (playback, inspector, trace) |
| `src/app/` | Routes: `/learn/[path]/[lesson]`, `/guide`, `/glossary` |
| `tests/unit`, `tests/e2e` | Vitest and Playwright suites |
| `docs/` | `PLAN.md`, `DECISIONS.md`, `SOURCES.md` |

URLs: `/learn/<path>/<lesson>/?step=N&view=sequence`. Old `/#/<lesson>/<step>` links redirect.

## Add a lesson

Create `content/lessons/<id>.json` with `nodes` (positions in %) and `steps` (`from`, `to`, `label`, `title`, `text`, `payload` rows of `[field, value, note]`). `npm test` validates it.

## Environment

No secrets are needed yet. From M5 (auth and payments) see `.env.example`; never commit real keys.
