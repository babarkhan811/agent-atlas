# Agent Atlas: Phase 2 plan

Source brief: `agent-atlas-phase2-prompt.md` (owner, 2026-11-19).

## Architecture today (summary)

1. Next.js 16 App Router + TypeScript, built as a static export; deployed to GitHub Pages (`/agent-atlas` base path) and Vercel (`agent-atlas-two-psi.vercel.app`) from `main`.
2. Content is JSON in `content/` (lessons, paths, glossary), validated at build time by Zod (`src/content/schema.ts`). One file per lesson.
3. Routes: `/learn/<path>/<lesson>/` (SSG, one per lesson), `/guide/`, `/glossary/`, `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, `search-index.json`.
4. The simulation is client-side React: `src/sim/` (isometric icon kit, layout maths, `<Diagram />`, `<Sequence />`) inside `src/components/Workspace.tsx` (playback, inspector, trace) and `Shell.tsx` (header, sidebar, search).
5. From A1, lessons can carry an `article` (hero, depth narrations, walkthrough, concepts, production notes, lab, takeaways, FAQ), a `quiz`, `sources` and `lastVerified`; the article is server-rendered below the simulation by `LessonArticle.tsx`.
6. Labs live in `labs/<name>/` as Python and TypeScript with tests (`npm run test:labs`); lesson pages render the real files.
7. Tests: Vitest (content, layout, search), Playwright e2e + axe (desktop, phone, 1280×560 laptop), lab tests; all run in GitHub Actions CI.
8. Accounts: Vercel project connected to GitHub; Supabase connected via the Vercel integration; Polar sandbox token in Vercel env. No server code yet.

## Milestones

| # | Milestone | Status |
|---|---|---|
| A1 | Content engine + 3 pilot lessons (LLM call, Tool use, Software + AI agents) | **done** (tag `a1`) |
| A2 | Remaining 18 lessons, glossary pages, guide sub-pages, 6 new lessons, freshness CI | **done** (tag `a2`): 27 lessons on the full anatomy, 20 labs, 52 glossary term pages, 9 guide parts, path pages, /learn hub, About & editorial policy |
| B1 | Depth design system (tokens, components, both themes, reduced motion, visual regression) | todo |
| B2 | 3D stage (pan/zoom/orbit, minimap, bigger stage), landing page hero, optional WebGL mode | todo |
| C1 | Pricing, auth, Polar payments, server-side gating + leak test, legal pages, analytics, SEO completion | todo; needs the server deployment (Vercel) |
| D | Launch hardening: axe, Lighthouse, security review, `LAUNCH_CHECKLIST.md` | todo |

Payment provider and country were already settled with the owner (Pakistan → Polar; see `PLAN.md`), so §3's "ask me" is satisfied.

## Decisions and deviations in A1

- **Word counts.** The brief asks for 1,200–2,000 words per lesson *and* 80–150 words per step per depth level. For a 6–8 step lesson those conflict (the second implies 1,400–3,600 words of narration alone). Pilots land at ~2,900–3,100 words of original explanation, with depth narrations of 40–80 words each, plus a 100–150-word walkthrough section per step. The owner should pick which target wins before A2 scales this to 24 more lessons.
- **Quiz validation is client-side for now.** "Server-validated" needs server code; quizzes move behind the API with gating in C1. Free-lesson quiz answers are not secret.
- **Provider formats.** Wire formats are labelled as Anthropic's where shown; Expert depth compares OpenAI (Responses API) and Google (Interactions API; generateContent marked legacy), verified 2026-11-19.
- **Corrections found while verifying:** the old LLM lesson put `stop_reason` in `content_block_delta` (it arrives in `message_delta`); the old security lesson used an osquery query that compared `parent` (a PID) to a process name.

## Risks

1. Content volume for A2 is large (18 rewrites + 6 new lessons + 30 glossary pages); each needs source verification.
2. MCP and A2A specs move quickly; lessons need the freshness check and dated sources.
3. 3D work must not regress the 1280×560 laptop layout, performance budgets or accessibility.
