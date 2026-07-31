import assert from "node:assert/strict";
import test from "node:test";
import { analysisCacheKey, cacheTtlDays } from "../lib/audit/cache.ts";
import { compactAuditEvidence } from "../lib/audit/evidence.ts";
import {
  compactHtml,
  contentFingerprint,
} from "../lib/audit/inspect.ts";
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

  assert.equal(result.methodologyVersion, "site-readiness-v2");
  assert.equal(result.score, 100);
  assert.equal(result.categories.length, 3);
  assert.equal(result.findings.length, 0);
  assert.ok(result.checks.every((check) => check.evidence.length > 0));
});

test("keeps homepage checks page-scoped while using site-wide supporting evidence", () => {
  const homepage = `<!doctype html><html lang="en"><head>
    <title>Example Services in Kuala Lumpur</title>
    <meta name="description" content="Example provides practical support services for families and businesses throughout Kuala Lumpur, Malaysia.">
    <meta name="viewport" content="width=device-width">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://example.com/">
    <script type="application/ld+json">{"@type":"Organization"}</script>
    </head><body>
      <nav>
        <a href="https://example.com/services">Services</a>
        <a href="https://example.com/about">About</a>
        <a href="https://example.com/contact">Contact</a>
        <a href="https://example.com/faq">FAQ</a>
      </nav>
      <p>Contact our Kuala Lumpur team to request a consultation.</p>
    </body></html>`;
  const secondary = `<html><head><meta name="robots" content="noindex"></head>
    <body><h1>Contact Us</h1><h2>How we help</h2>
    <p>Our services, client results, certified team and testimonials.</p>
    <a href="/about">About us</a></body></html>`;
  const result = scoreHomepage(
    { finalUrl: "https://example.com/", html: homepage, status: 200 },
    { siteHtml: `${homepage}\n${secondary}` },
  );
  const checks = new Map(result.checks.map((check) => [check.key, check]));

  assert.equal(checks.get("robots")?.passed, true);
  assert.match(checks.get("robots")?.evidence ?? "", /index, follow/);
  assert.equal(checks.get("h1")?.passed, false);
  assert.equal(checks.get("internal-links")?.passed, true);
  assert.match(checks.get("internal-links")?.evidence ?? "", /4 unique/);
  assert.equal(checks.get("proof")?.passed, true);
});

test("ignores explicitly hidden H1 elements", () => {
  const result = scoreHomepage({
    finalUrl: "https://example.com/",
    status: 200,
    html: `<html><body>
      <h1 aria-hidden="true">Home</h1>
      <h1>Physiotherapy and rehabilitation in Kuala Lumpur</h1>
    </body></html>`,
  });
  assert.match(
    result.checks.find((check) => check.key === "h1")?.evidence ?? "",
    /Physiotherapy and rehabilitation/,
  );
});

test("does not treat a generic primary heading as descriptive", () => {
  const result = scoreHomepage({
    finalUrl: "https://example.com/",
    status: 200,
    html: "<html><body><h1>Why choose us?</h1></body></html>",
  });

  assert.equal(
    result.checks.find((check) => check.key === "h1")?.passed,
    false,
  );
});

test("compacts large script payloads without losing audit-relevant markup", async () => {
  const html = `<html><head><title>Large builder page</title>
    <script>${"x".repeat(900_000)}</script></head>
    <body><h1>Visible service heading</h1><a href="/contact">Contact</a></body></html>`;
  const compacted = compactHtml(html);

  assert.ok(compacted.length < 10_000);
  assert.match(compacted, /Visible service heading/);
  assert.doesNotMatch(compacted, /x{100}/);
  assert.equal(await contentFingerprint(compacted), await contentFingerprint(compacted));
});

test("compact evidence and cache keys bound repeated model work", () => {
  const result = scoreHomepage({
    finalUrl: "https://example.com/",
    status: 200,
    html: "<html><body>Brief page.</body></html>",
  });
  const evidence = compactAuditEvidence(result);

  assert.ok(evidence.failedChecks.length <= 6);
  assert.ok(evidence.verifiedStrengths.length <= 3);
  assert.equal(cacheTtlDays(undefined), 14);
  assert.equal(cacheTtlDays("31"), 14);
  assert.notEqual(
    analysisCacheKey("en-MY", "model-v1", "abc"),
    analysisCacheKey("en-MY", "model-v1", "def"),
  );
});
