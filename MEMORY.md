# Project Memory

Read this file before making architectural or product changes.

## Purpose

SignalFound converts paid-ad traffic into evidence-backed website audit leads.
The application must feel like a credible diagnostic product, not a generic
lead form or an AI-generated PDF.

## Product promise

> Show whether a website gives machines enough access, clarity, and evidence to
> understand and potentially recommend the business, then identify what to fix
> first.

The product measures readiness separately from observed platform visibility.
Never claim that a deterministic site audit proves ranking or placement inside
ChatGPT, Gemini, Claude, or another answer platform.

## Current state

- The landing page, intake API, homepage inspector, scoring engine, D1
  persistence, report route, attribution capture, and optional CRM webhook are
  implemented.
- The current audit is a synchronous, bounded homepage inspection.
- `ARCHITECTURE.md` defines the production evolution into a durable multi-page
  Cloudflare Workflow.
- R2 is declared for future screenshots, crawl evidence, and exports but is not
  yet written by the current homepage audit.
- A language model is not required for the current evidence score. The planned
  model adapter may explain collected facts but must never invent them.

## Non-negotiable invariants

1. Evidence is collected before narrative generation.
2. Scores come from versioned rules and stored evidence.
3. Personal information never appears in report URLs.
4. Audit consent and marketing consent remain distinct.
5. Every externally fetched redirect is revalidated.
6. Fetches have strict time, size, scheme, and destination boundaries.
7. A failed CRM notification must not destroy a completed report.
8. Model/provider names are internal implementation details, not client-facing
   marketing copy.
9. Observed AI visibility must include platform, query, time, market, and
   evidence; otherwise call it readiness.
10. Changes to scoring require a new methodology version and regression
    examples.

## Important paths

- `app/page.tsx` — public acquisition page
- `app/components/AuditForm.tsx` — lead capture and attribution
- `app/api/audits/route.ts` — intake and current synchronous orchestration
- `app/audit/[token]/page.tsx` — private report
- `lib/audit/` — URL safety, bounded fetch, scoring, shared result types
- `db/schema.ts` — canonical relational schema
- `db/repository.ts` — D1 boundary and event writes
- `lib/integrations/crm.ts` — optional CRM delivery boundary
- `ARCHITECTURE.md` — target architecture and migration logic

## Near-term roadmap

1. Add Turnstile and per-IP/domain submission quotas.
2. Move audit execution from the HTTP request into Cloudflare Workflows.
3. Add robots/sitemap discovery and a 10-page crawl budget.
4. Add Browser Rendering snapshots for desktop and mobile.
5. Store screenshots and normalized evidence documents in R2.
6. Add an evaluated narrative adapter with strict structured output.
7. Add dated platform-specific visibility experiments.
8. Add email/SMS delivery and booking-event ingestion.
9. Build a reviewer screen for the first 50 production audits.

## Working conventions

- Use `npm run build` after implementation changes.
- Run `npm run db:generate` after schema changes and inspect the SQL.
- Keep Cloudflare bindings in `.openai/hosting.json`.
- Keep hosted secrets out of that file and out of Git.
- Prefer small pure functions in `lib/audit` for scoring and security logic.
- Add evidence fixtures before changing score weights.
