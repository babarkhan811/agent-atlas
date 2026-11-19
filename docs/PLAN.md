# Agent Atlas: product plan

Source brief: `agent-atlas-claude-code-prompt.md` (owner's prompt, Nov 2026).

## Decisions (settled 2026-11-19)

| Topic | Decision |
|---|---|
| Brand / domain | Keep "Agent Atlas". No custom domain yet: GitHub Pages now, Vercel preview URL once the owner creates a Vercel account. |
| Audience | General AI-agent learners (free paths) **plus** "AI for Security Teams" as the premium vertical. |
| Owner location | Pakistan (affects payment-provider eligibility). |
| Payments | **Polar** (merchant of record) behind a `PaymentProvider` interface. The owner picked Lemon Squeezy, but it stopped accepting new sellers on 2026-11-16 and stops processing on 2027-03-31; its recommended successor (Stripe Managed Payments) is not available to Pakistan-based businesses. Polar's official supported-countries page lists Pakistan. Fallback: Paddle. See `docs/SOURCES.md`. |
| Prices (config, not code) | Free: Path 1 + glossary + guide preview + 1 lab. Pro: $15/month or $119/year. Team: $25/seat/month, 5-seat minimum, "contact us" above 25 seats. Student/PPP coupons. 14-day refund. |

## Architecture

Next.js (App Router) + TypeScript, content as JSON validated by Zod, Vitest + Playwright + axe in GitHub Actions.

- **Until M5** the app is built as a static export and deployed to GitHub Pages (real per-lesson URLs, per-page metadata). No server is needed for free content.
- **From M5** it deploys to Vercel with Supabase (Postgres, Auth, RLS). Paid lesson bodies, quiz answers and lab solutions move out of the static bundle and are served only by server code after an entitlement check.
- Legacy hash URLs (`#/lesson-id/3`) keep working through a client-side redirect to `/learn/<path>/<lesson>?step=3`.

## Milestones

| # | Milestone | Status |
|---|---|---|
| M1 | Next.js foundation, content migration + schema, real URLs, `<Simulation />` port, CI, Pages deploy | **done** (tag `m1`, 2026-11-19) |
| M2 | Bugs 1–12 and accessibility fixes, each with a regression test; axe 0 serious/critical | todo |
| M3 | Landing page with live-sim hero, design tokens, purpose-built mobile layout, Lighthouse ≥ 95 | todo |
| M4 | Learning paths, lesson template, quizzes, progress, full-content search, timeline scrubber, node inspector | todo |
| M5 | Auth + Polar payments + server-side gating + leak test (needs owner accounts, see below) | blocked on accounts |
| M6 | New/updated content: A2A, MCP refresh, context & caching, reasoning & structured output, observability & cost; template on every lesson; `lastVerified` + sources | todo |
| M7 | SEO (sitemap, JSON-LD, OG images), privacy-friendly analytics, newsletter, legal pages | todo |
| M8 | Optional lazy-loaded 3D mode within budget, or a written cut note | todo |
| M9 | Launch hardening: security review, load test, runbook, `LAUNCH_CHECKLIST.md` | todo |

Each milestone ends with tests green, a commit and a git tag (`m1`, `m2`, …).

## Risks

1. **Payments eligibility.** Polar pays out via Stripe Connect Express; individual sellers in Pakistan must pass Stripe's verification for that account type. Verify during Polar onboarding before M5 work is finished. Paddle is the fallback.
2. **Content gating needs a server.** Nothing paid can be protected on GitHub Pages. Pro content stays free/ungated until M5 ships on Vercel.
3. **Content accuracy.** MCP, A2A and vendor APIs change quickly. Every lesson carries `lastVerified` and `sources`; CI warns after 90 days.
4. **Scope.** This is weeks of work. Milestones are ordered so each one is shippable on its own.
5. **3D mode budget** (≤ 250 KB gz extra, 60/30 fps) may not be achievable; it is explicitly optional.

## What the owner must do (never paste secrets into chat)

| When | Account / action |
|---|---|
| Before M5 | Vercel account (free Hobby plan is fine for previews; commercial use requires Pro), connect the GitHub repo |
| Before M5 | Supabase project (free tier); set env vars in Vercel from `.env.example` |
| Before M5 | Polar account in **sandbox** mode; create products for Pro monthly/yearly and Team; add webhook secret to Vercel env |
| Before M7 | Email provider (Resend or Postmark) + verified sending domain; Plausible or PostHog account |
| Before launch | Domain purchase + DNS records (CNAME to Vercel, SPF/DKIM/DMARC for email) |
| Before launch | Lawyer review of Privacy Policy, Terms and Refund Policy drafts |
| Before launch | Switch Polar from sandbox to production (only with explicit go-ahead) |
