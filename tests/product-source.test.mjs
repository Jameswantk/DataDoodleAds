import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = [
  "../app/page.tsx",
  "../app/layout.tsx",
  "../worker/api.ts",
  "../INTEGRATION.md",
  "../MEMORY.md",
];

test("repository is an audit service, not a marketer-owned lead form", async () => {
  const sources = await Promise.all(
    files.map((file) => readFile(new URL(file, import.meta.url), "utf8")),
  );
  const combined = sources.join("\n");

  assert.match(combined, /externalLeadId/);
  assert.match(combined, /Idempotency-Key/);
  assert.match(combined, /\/api\/v1\/audits/);
  assert.match(combined, /server-to-server/i);
  assert.match(combined, /marketer/i);
  assert.doesNotMatch(combined, /name="contactName"/);
  assert.doesNotMatch(combined, /name="email"/);
  assert.doesNotMatch(combined, /name="mobile"/);
  assert.doesNotMatch(combined, /name="marketingConsent"/);
  assert.doesNotMatch(combined, /AuditForm/);
});
