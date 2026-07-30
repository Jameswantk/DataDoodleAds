# Marketer Integration Contract

This interface is server-to-server. The marketer's landing page should submit
to the marketer's backend first. That backend stores contact data and calls the
audit service with only the external lead reference and website.

## Create an audit

`POST /api/v1/audits`

Headers:

```http
Authorization: Bearer <AUDIT_API_KEY>
Idempotency-Key: <stable-key-for-this-lead-and-audit-version>
Content-Type: application/json
```

Body:

```json
{
  "externalLeadId": "crm-lead-123",
  "websiteUrl": "https://example.com",
  "locale": "en-MY"
}
```

`locale` is optional. Unknown JSON fields are ignored, but contact fields
should never be sent.

New job response (`202 Accepted`):

```json
{
  "auditId": "3fdc4e5e-8fc9-47b6-bd8f-d16597a5e4f3",
  "externalLeadId": "crm-lead-123",
  "websiteUrl": "https://example.com/",
  "status": "queued",
  "score": null,
  "reportUrl": null,
  "statusUrl": "https://audit.example.com/api/v1/audits/3fdc4e5e-8fc9-47b6-bd8f-d16597a5e4f3",
  "callbackStatus": "pending",
  "createdAt": "2026-07-30T03:00:00.000Z",
  "updatedAt": "2026-07-30T03:00:00.000Z"
}
```

Repeating the identical request with the same key returns `200 OK` and the
existing job. Reusing the key with a different `externalLeadId` or normalized
URL returns `409 IDEMPOTENCY_CONFLICT`.

## Check status

`GET /api/v1/audits/{auditId}`

This route uses the same bearer authentication. Terminal states are
`completed` and `failed`. Completed responses contain an absolute private
`reportUrl`. Failed responses include an `errorCode` suitable for operational
routing, not a raw internal stack trace.

Poll conservatively, for example after 3 seconds and then every 5–10 seconds.
Stop after a terminal state. The callback should be the primary completion
signal; polling is the recovery path.

## Completion callback

The service sends `POST AUDIT_CALLBACK_URL`:

```json
{
  "schemaVersion": "1",
  "event": "audit.completed",
  "eventId": "audit:3fdc4e5e-8fc9-47b6-bd8f-d16597a5e4f3:completed",
  "occurredAt": "2026-07-30T03:02:12.000Z",
  "auditId": "3fdc4e5e-8fc9-47b6-bd8f-d16597a5e4f3",
  "externalLeadId": "crm-lead-123",
  "websiteUrl": "https://example.com/",
  "status": "completed",
  "score": 63,
  "reportUrl": "https://audit.example.com/reports/<private-token>"
}
```

Headers:

```http
content-type: application/json
x-audit-event-id: audit:<audit-id>:completed
x-audit-timestamp: <unix-seconds>
x-audit-signature: sha256=<lowercase-hex-hmac>
```

The signature is:

```text
HMAC_SHA256(AUDIT_CALLBACK_SIGNING_SECRET, timestamp + "." + rawRequestBody)
```

Callback receiver requirements:

1. Read the raw body before JSON parsing.
2. Reject timestamps older than the agreed tolerance, normally five minutes.
3. Recompute the HMAC and compare it in constant time.
4. Deduplicate by `x-audit-event-id`.
5. Return any `2xx` only after the event is durably accepted.
6. Use `externalLeadId` to attach the report to the marketer's own lead.

Callbacks can be retried and may arrive more than once. Their delivery order
must not be used as a state machine.

## Error contract

Errors are JSON:

```json
{
  "error": {
    "code": "INVALID_WEBSITE_URL",
    "message": "websiteUrl must be a public HTTP or HTTPS URL."
  }
}
```

Expected codes include:

- `UNAUTHORIZED`
- `INVALID_JSON`
- `INVALID_REQUEST`
- `INVALID_WEBSITE_URL`
- `INVALID_IDEMPOTENCY_KEY`
- `IDEMPOTENCY_CONFLICT`
- `AUDIT_NOT_FOUND`
- `SERVICE_NOT_CONFIGURED`
- `INTERNAL_ERROR`

## Go-live handoff

Before switching on paid traffic, both parties must agree on the production
base URL, API key exchange and rotation, callback URL and secret exchange,
timeout and retry policy, report retention, support contact, and a test lead
that can be safely replayed.
