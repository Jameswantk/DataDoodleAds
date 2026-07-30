# Project Memory

Read this file before changing product scope or architecture.

## Boundary

SignalFound is the audit engine only.

The marketer owns:

- advertising and campaign attribution
- landing page and contact form
- name, email, mobile number, and consent
- the CRM lead record and sales funnel

This repository owns:

- authenticated audit intake
- URL safety checks
- website evidence collection
- deterministic scoring
- evidence-grounded AI explanation
- private report generation
- status lookup and signed completion callbacks

The marketer sends only an `externalLeadId`, `websiteUrl`, and optional
`locale`. Do not add contact fields or browser-direct submission to the audit
API.

## Product promise

> Show whether a website gives machines enough access, clarity, and evidence to
> understand and potentially recommend the business, then identify what to fix
> first.

The service measures readiness separately from observed platform visibility.
Never claim the deterministic audit proves ranking or placement inside
ChatGPT, Gemini, Claude, or another answer platform.

## Current implementation

- `POST /api/v1/audits` authenticates a server integration and creates an
  idempotent queued job.
- A bound Cloudflare Workflow processes the job durably. Local and Sites
  previews use `waitUntil` when that binding is absent.
- The crawler inspects a small prioritized set of public pages.
- Code calculates the versioned score. Workers AI is optional and may only
  explain failed, stored evidence checks.
- D1 stores job state and events; R2 stores the result evidence document.
- `GET /api/v1/audits/{id}` exposes authenticated status.
- `/reports/{token}` renders the private report.
- Completion callbacks are signed with HMAC-SHA256.
- Legacy MVP tables remain in the schema only to make migration
  non-destructive; the new service does not write lead PII.

## Non-negotiable invariants

1. Evidence is collected before narrative generation.
2. Scores come from versioned rules, never a language model.
3. Generated claims must cite known evidence keys.
4. No name, email, mobile number, or consent data enters the new job contract.
5. The integration is server-to-server; do not enable broad browser CORS.
6. Every redirect is revalidated and every fetch is bounded.
7. A callback failure must not destroy a completed report.
8. Idempotency keys prevent duplicate jobs for retried submissions.
9. Report URLs contain a random bearer token and no lead or domain data.
10. Provider/model names stay out of client-facing report copy.
11. Observed AI visibility requires platform, query, time, market, and captured
    evidence; otherwise call the result readiness.
12. Any scoring change requires a new methodology version and regression tests.

## Important paths

- `worker/api.ts` — authenticated intake and status API
- `worker/audit-workflow.ts` — durable orchestration
- `worker/audit-processor.ts` — crawl, score, evidence, and callback boundaries
- `lib/api/contracts.ts` — request validation and authentication
- `lib/audit/` — URL safety, crawler, scoring, and narrative guardrails
- `lib/integrations/callback.ts` — signed completion delivery
- `app/reports/[token]/page.tsx` — private report
- `db/schema.ts` and `db/repository.ts` — D1 schema and persistence boundary
- `INTEGRATION.md` — marketer handoff contract
- `ARCHITECTURE.md` — architecture and decision logic

## Next decisions

1. Production hostname and ownership of the API key rotation process.
2. Callback URL, retry/dead-letter operations, and CRM event mapping.
3. Exact crawl authorization, robots policy, page budget, and retention period.
4. Report-token expiry and consultation CTA destination.
5. Score calibration set and approval threshold before paid-traffic launch.
6. Whether to add Browser Rendering for JavaScript-heavy sites.
7. Whether platform-specific observed visibility tests belong in a later
   separately disclosed product.

## Working conventions

- Run `npm run build`, `npm run lint`, and `npm test` after implementation.
- Run `npm run db:generate` after schema changes and inspect the SQL.
- Keep deployment bindings in configuration and secrets outside Git.
- Prefer small pure functions for scoring, validation, and signing.
- Preserve legacy data unless a separately approved migration removes it.
