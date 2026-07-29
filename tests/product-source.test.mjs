import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageUrl = new URL("../app/page.tsx", import.meta.url);
const formUrl = new URL("../app/components/AuditForm.tsx", import.meta.url);
const layoutUrl = new URL("../app/layout.tsx", import.meta.url);

test("landing product includes the complete conversion contract", async () => {
  const [page, form, layout] = await Promise.all([
    readFile(pageUrl, "utf8"),
    readFile(formUrl, "utf8"),
    readFile(layoutUrl, "utf8"),
  ]);

  assert.match(page, /Can AI find,/);
  assert.match(page, /Evidence-backed/);
  assert.match(page, /not a guarantee/);
  assert.match(form, /name="contactName"/);
  assert.match(form, /name="email"/);
  assert.match(form, /name="mobile"/);
  assert.match(form, /name="websiteUrl"/);
  assert.match(form, /name="auditConsent"/);
  assert.match(form, /name="marketingConsent"/);
  assert.match(layout, /SignalFound \| AI Visibility Audits/);
  assert.doesNotMatch(page + form + layout, /codex-preview|SkeletonPreview/i);
});
