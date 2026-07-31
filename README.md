# SignalFound Audit Engine

A standalone, evidence-first website audit service. A marketer-owned landing
page submits a website and an external lead reference to this service. The
service validates and crawls the public website, calculates a transparent
readiness score, optionally uses AI to explain verified findings, publishes a
private report, and notifies the marketer's backend.

This repository does **not** own the ads, landing page, contact form, consent,
email, mobile number, or CRM lead record.

## Implemented

- Bearer-authenticated, idempotent server-to-server intake API
- Minimal input contract: external lead ID, website URL, and optional locale
- Public-URL validation and redirect revalidation
- Bounded, prioritized multi-page crawl
- Page-scoped, versioned deterministic 100-point score
- Content-fingerprint result cache with a configurable 1-30 day lifetime
- Optional Workers AI narrative constrained to three verified findings
- Durable Cloudflare Workflow path with a local/Sites `waitUntil` fallback
- D1 job state and append-only operational events
- R2 evidence snapshots
- Private, unguessable report URLs
- HMAC-signed completion callback with retry-safe event IDs
- No new storage of contact names, emails, or mobile numbers

The audit measures **website readiness**, not a guaranteed ranking inside
ChatGPT, Gemini, Claude, or any other answer platform.

## API quick start

```bash
curl -X POST "https://audit.example.com/api/v1/audits" \
  -H "Authorization: Bearer $AUDIT_API_KEY" \
  -H "Idempotency-Key: crm-lead-123-audit-v1" \
  -H "Content-Type: application/json" \
  --data '{
    "externalLeadId": "crm-lead-123",
    "websiteUrl": "https://example.com",
    "locale": "en-MY"
  }'
```

The response is `202 Accepted` for a new job and includes a status URL. Sending
the same idempotency key and payload safely returns the existing job. A
completed job contains its private report URL.

See [INTEGRATION.md](./INTEGRATION.md) for the full handoff contract and
[openapi.yaml](./openapi.yaml) for the machine-readable API definition.

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Set `AUDIT_API_KEY` in `.env.local`. Local development uses the Cloudflare
emulator and runs processing with `waitUntil` when a Workflow binding is not
present.

## Validation

```bash
npm run lint
npm test
```

After schema changes:

```bash
npm run db:generate
```

## Cloudflare deployment

The intended production stack is Workers/Sites, D1, R2, Workflows, and
optionally Workers AI. Copy the bindings from
[wrangler.example.jsonc](./wrangler.example.jsonc) into the production
Wrangler configuration, provision real D1/R2 resources, and set secrets rather
than committing them.

Required secret:

- `AUDIT_API_KEY`

Required for callbacks:

- `AUDIT_CALLBACK_URL`
- `AUDIT_CALLBACK_SIGNING_SECRET`

Optional:

- `WORKERS_AI_MODEL`
- `AUDIT_CACHE_TTL_DAYS` (defaults to `14`; valid range `1`-`30`)
- `REPORT_CTA_URL`
- `REPORT_CTA_LABEL`

See [ARCHITECTURE.md](./ARCHITECTURE.md) for system logic and
[MEMORY.md](./MEMORY.md) for durable scope decisions.

## Production gates

- Add DNS-resolution and egress enforcement against private destinations.
- Apply rate and concurrency limits per integration key and domain.
- Confirm crawl authorization, robots policy, retention, and deletion terms.
- Calibrate the scoring rules against a manually reviewed audit set.
- Add browser rendering and viewport screenshots for reliable visual assessment
  of JavaScript-heavy sites.
- Run separately disclosed ChatGPT, Gemini, or Claude query observations only
  for qualified or engaged leads.
- Add alerting and a dead-letter recovery path for exhausted callbacks.
- Keep report tokens private and define their expiry/revocation policy.

## License

Private commercial project. Add an explicit license before making the
repository public.
