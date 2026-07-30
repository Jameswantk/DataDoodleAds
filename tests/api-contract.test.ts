import assert from "node:assert/strict";
import test from "node:test";
import {
  isAuthorized,
  parseCreateAuditRequest,
  validateIdempotencyKey,
} from "../lib/api/contracts.ts";

test("accepts the minimal marketer integration payload", async () => {
  const request = new Request("https://audit.example/api/v1/audits", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      externalLeadId: "crm-123",
      websiteUrl: "example.com",
      locale: "en-MY",
      contactName: "must not enter the service contract",
    }),
  });

  assert.deepEqual(await parseCreateAuditRequest(request), {
    externalLeadId: "crm-123",
    locale: "en-MY",
    normalizedUrl: "https://example.com/",
    websiteUrl: "example.com",
  });
});

test("rejects invalid payloads and unsafe URLs", async () => {
  const request = new Request("https://audit.example/api/v1/audits", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      externalLeadId: "crm-123",
      websiteUrl: "http://127.0.0.1/admin",
    }),
  });

  await assert.rejects(parseCreateAuditRequest(request), /INVALID_WEBSITE_URL/);
});

test("requires exact bearer auth and a stable idempotency key", () => {
  assert.equal(
    isAuthorized(
      new Request("https://audit.example", {
        headers: { authorization: "Bearer correct-secret" },
      }),
      "correct-secret",
    ),
    true,
  );
  assert.equal(
    isAuthorized(
      new Request("https://audit.example", {
        headers: { authorization: "Bearer wrong-secret" },
      }),
      "correct-secret",
    ),
    false,
  );
  assert.equal(
    validateIdempotencyKey("crm-123-audit-v1"),
    "crm-123-audit-v1",
  );
  assert.throws(
    () =>
      validateIdempotencyKey("short"),
    /INVALID_IDEMPOTENCY_KEY/,
  );
});
