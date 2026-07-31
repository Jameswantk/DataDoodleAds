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

const reportSource = await readFile(
  new URL("../app/reports/[token]/page.tsx", import.meta.url),
  "utf8",
);

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

test("private report presents an evidence-led consultation offer", () => {
  assert.match(reportSource, /What is already working/);
  assert.match(reportSource, /The three moves we would prioritize/);
  assert.match(
    reportSource,
    /More than conventional SEO or a cosmetic redesign/,
  );
  assert.match(
    reportSource,
    /easier to discover,\s+easier to trust and easier\s+to contact/i,
  );
  assert.match(reportSource, /Evidence-backed assessment/);
  assert.match(reportSource, /Strong foundation/);
  assert.match(reportSource, /A maturity stage—not a grade/);
  assert.match(reportSource, /Rendered desktop\/mobile/);
  assert.match(reportSource, /Structural readiness/);
  assert.doesNotMatch(reportSource, /\/ 100/);
  assert.doesNotMatch(reportSource, /guaranteed ranking/i);
  assert.doesNotMatch(reportSource, /we are the best/i);
});
