# Launch checklist

## Free public launch (2026-11-21)

Live at https://agent-atlas-two-psi.vercel.app (primary) and https://babarkhan811.github.io/agent-atlas/ (mirror).

| Item | Status |
|---|---|
| Landing page at `/` with CTA to the free first lesson | ✅ |
| All 27 lessons free during launch (`ALL_LESSONS_FREE` in `src/config/pricing.ts`) | ✅ |
| Pricing shown as "coming soon"; nothing can be bought | ✅ |
| Privacy Policy, Terms of Use, Contact, About & editorial policy | ✅ drafts, see owner actions |
| Open Graph / Twitter tags and share image (`public/og.png`) | ✅ |
| Sitemap, robots, canonical URLs, JSON-LD (WebSite, Course, FAQPage, LearningResource, BreadcrumbList, DefinedTerm) | ✅ |
| Accessibility: axe 0 serious/critical on all page types, both themes | ✅ |
| Tests: e2e, unit, labs, visual regression in CI | ✅ |

## Owner actions (only you can do these)

1. **Legal review.** Have a lawyer review `/privacy/` and `/terms/`, in particular: governing law/jurisdiction (not stated), content licence for lessons and lab code, and liability wording. Nothing on the site currently collects personal data.
2. **Contact email (optional).** Contact currently goes through public GitHub issues. If you want a private email address on `/contact/`, tell me which one to publish.
3. **Byline.** `/about/` names "Babar Yousaf" as creator; confirm or change.
4. **Domain (recommended before marketing).** Buy a domain, add it in Vercel → Project → Domains, and set the DNS records Vercel shows (CNAME/A). Canonical URLs then follow automatically (Vercel provides the production domain at build time).
5. **Search engines.** Add the site to Google Search Console and Bing Webmaster Tools and submit `/sitemap.xml`.
6. **Vercel security.** Enable two-factor authentication on the Vercel account.

## Before charging money (not part of the free launch)

- Server-side gating of Pro content + leak test (C1), auth, Polar checkout and webhooks.
- Polar production account with identity and payout verification for Pakistan.
- Vercel Pro plan (the Hobby plan is for non-commercial use).
- Refund policy page, updated Privacy Policy covering accounts/payments/analytics.
