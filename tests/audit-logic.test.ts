import assert from "node:assert/strict";
import test from "node:test";
import { scoreHomepage } from "../lib/audit/score.ts";
import { normalizePublicUrl } from "../lib/audit/url.ts";

test("normalizes public website addresses", () => {
  assert.equal(
    normalizePublicUrl("example.com/pricing#plans"),
    "https://example.com/pricing",
  );
  assert.equal(
    normalizePublicUrl("https://www.example.com/"),
    "https://www.example.com/",
  );
});

test("rejects obvious private and unsafe destinations", () => {
  assert.throws(() => normalizePublicUrl("file:///etc/passwd"), /INVALID_PROTOCOL/);
  assert.throws(() => normalizePublicUrl("http://127.0.0.1"), /PRIVATE_DESTINATION/);
  assert.throws(() => normalizePublicUrl("http://192.168.1.5"), /PRIVATE_DESTINATION/);
  assert.throws(() => normalizePublicUrl("http://service.internal"), /PRIVATE_DESTINATION/);
});

test("produces a versioned evidence-backed score", () => {
  const result = scoreHomepage({
    finalUrl: "https://example.com/",
    status: 200,
    html: `<!doctype html>
      <html lang="en">
      <head>
        <title>Example Advisory Services for Growing Businesses</title>
        <meta name="description" content="Example Advisory provides practical commercial strategy and operational support for growing companies throughout Malaysia.">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="canonical" href="https://example.com/">
        <script type="application/ld+json">{"@type":"Organization"}</script>
      </head>
      <body>
        <h1>Commercial advisory services for growing businesses</h1>
        <h2>How we help</h2>
        <p>Our services support clients nationwide with certified experts, case studies, and measured results.</p>
        <nav>
          <a href="/services">Services</a><a href="/about">About us</a>
          <a href="/case-studies">Case studies</a><a href="/contact">Contact</a>
        </nav>
        <a href="/contact">Book a consultation</a>
      </body>
      </html>`,
  });

  assert.equal(result.methodologyVersion, "homepage-readiness-v1");
  assert.equal(result.score, 100);
  assert.equal(result.categories.length, 3);
  assert.equal(result.findings.length, 0);
  assert.ok(result.checks.every((check) => check.evidence.length > 0));
});
