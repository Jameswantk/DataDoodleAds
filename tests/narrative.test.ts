import assert from "node:assert/strict";
import test from "node:test";
import { addAiNarrative } from "../lib/audit/narrative.ts";
import { scoreHomepage } from "../lib/audit/score.ts";

test("AI findings may only cite failed deterministic evidence keys", async () => {
  const scored = scoreHomepage({
    finalUrl: "https://example.com/",
    html: "<html><head><title>Example</title></head><body><p>Brief site.</p></body></html>",
    status: 200,
  });
  const originalSummary = scored.summary;
  const failedKeys = new Set(
    scored.checks.filter((check) => !check.passed).map((check) => check.key),
  );
  const validKey = [...failedKeys][0];
  const fakeAi = {
    async run() {
      return {
        response: {
          findings: [
            {
              evidenceKeys: [validKey],
              impact: "This verified gap makes the business harder to interpret.",
              recommendation: "Add a clear, specific explanation to the page.",
              title: "Clarify the offer",
            },
            {
              evidenceKeys: ["invented-platform-ranking"],
              impact: "Unsupported.",
              recommendation: "Unsupported.",
              title: "Invented claim",
            },
          ],
        },
      };
    },
  };

  const narrated = await addAiNarrative(fakeAi, scored, "en-MY");

  assert.equal(narrated.analysisMode, "workers-ai");
  assert.equal(narrated.summary, originalSummary);
  assert.equal(narrated.findings.length, 1);
  assert.ok(
    narrated.findings.every((finding) =>
      finding.evidenceKeys.every((key) => failedKeys.has(key)),
    ),
  );
});

test("invalid AI output falls back to deterministic findings", async () => {
  const scored = scoreHomepage({
    finalUrl: "https://example.com/",
    html: "<html><body>Example</body></html>",
    status: 200,
  });
  const fakeAi = {
    async run() {
      return {
        response: {
          findings: [
            {
              evidenceKeys: ["unsupported"],
              impact: "Unsupported.",
              recommendation: "Unsupported.",
              title: "Unsupported",
            },
          ],
        },
      };
    },
  };

  assert.deepEqual(await addAiNarrative(fakeAi, scored, "en"), scored);
});
