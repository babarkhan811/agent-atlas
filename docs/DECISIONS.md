# Decisions

Every dependency and every deviation from the recommended architecture is recorded here with a one-line reason.

## Dependencies

| Package | Why |
|---|---|
| `next` | App Router, static generation of one real URL per lesson, metadata API; later server-side gating on Vercel. |
| `react`, `react-dom` | Required by Next.js; the simulation is now typed React components instead of HTML strings. |
| `zod` | Validates every content file at build time so a broken lesson fails CI instead of production. |
| `typescript` (dev) | Type safety across content, simulation and UI. |
| `vitest` (dev) | Fast unit tests for pure layout/projection/content logic. |
| `@playwright/test` (dev) | End-to-end tests against the exported site in a real browser. |
| `@axe-core/playwright` (dev) | Automated WCAG checks inside the e2e suite (used from M2). |

Fonts are loaded with `next/font/google`, which downloads them at build time and serves them from our own origin (no third-party request at runtime).

## Deviations from the recommended stack

- **No Tailwind (yet).** The prototype already has a complete token-based stylesheet (dark/light themes, per-kind colours). Porting it as global CSS keeps M1 pixel-identical; M3 replaces it with a formal token system. Tailwind can be adopted then if it earns its place.
- **Static export until M5.** The owner has no Vercel/Supabase accounts yet. `output: "export"` lets the new app replace the prototype on GitHub Pages with real per-lesson URLs now. M5 removes the export and moves to Vercel because paid content must be served by server code.
- **No ESLint in CI for M1.** Next 16 no longer bundles `next lint`; type-checking plus tests cover M1. Revisit in M2.
- **Lemon Squeezy → Polar.** Lemon Squeezy stopped accepting new sellers on 2026-11-16 (see `SOURCES.md`).

## Content model

- Lessons are JSON files in `content/lessons/<id>.json`, validated by `src/content/schema.ts`. The node/step/payload structure is unchanged from the prototype so content migrated mechanically.
- `category` is kept for the "Agent stack" header until M3 replaces that header with the learning-path map.
- URLs are `/learn/<path>/<lesson>/?step=N&view=sequence`. Prototype hash URLs (`/#/<lesson>/<step>`) redirect client-side.
