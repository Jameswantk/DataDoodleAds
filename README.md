# SignalFound AI Visibility Audit

An evidence-first lead acquisition application for complimentary AI visibility
audits. It captures an attributed lead, inspects the submitted public homepage,
calculates a transparent readiness score, stores the result, and returns a
private report URL.

## What is implemented

- Four-field lead form with separate audit and marketing consent
- UTM, Meta click, campaign, ad-set, and ad attribution capture
- Public-URL validation and redirect revalidation
- Bounded homepage fetch with content-type, size, and timeout controls
- Versioned 100-point deterministic scoring methodology
- D1-backed leads, audits, and append-only audit events
- High-entropy report URLs with no personal data in the address
- Personalized, evidence-backed report UI
- Optional outbound CRM webhook
- Cloudflare Sites/Workers-compatible build
- D1 and R2 declarations for hosted deployment

The initial implementation deliberately measures **readiness**, not a fabricated
universal ranking in ChatGPT, Gemini, or Claude.

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Create `.env.local` from `.env.example` only when testing optional integrations.
Do not commit secrets.

## Validation

```bash
npm run lint
npm test
```

`npm test` performs a production build and verifies the rendered product shell.

## Data model

- `leads`: contact information, consent timestamps, attribution
- `audits`: private token, state, normalized URL, score, serialized evidence
- `audit_events`: append-only funnel and operational events

The source schema lives in `db/schema.ts`; generated migrations live in
`drizzle/`.

## Deployment modes

1. **Cloudflare-first** — Workers/Sites, D1, R2, Workflows/Queues and Browser
   Rendering.
2. **Local development** — Miniflare plus local browser tooling.
3. **Hybrid compute** — Cloudflare owns intake and reports while an external or
   local pull consumer performs browser-heavy crawling or open-weight inference.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the complete system design and
[MEMORY.md](./MEMORY.md) for durable project context.

## Before production advertising

- Replace the placeholder brand/contact values.
- Add privacy notice and terms URLs approved for the target markets.
- Configure Turnstile and submission rate limiting.
- Move the synchronous homepage inspection into a Workflow.
- Connect the real CRM and booking destination.
- Configure Browser Rendering for mobile/desktop evidence.
- Add email/SMS delivery.
- Run security testing focused on SSRF, redirects, quotas, and abuse.
- Manually review and calibrate the first 50 reports.

## License

Private commercial project. Add an explicit license before publishing the
repository outside your organization.
