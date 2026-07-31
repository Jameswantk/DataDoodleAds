import { writeFile } from "node:fs/promises";
import { crawlSite } from "../lib/audit/crawl";
import { scoreHomepage } from "../lib/audit/score";

const SOURCE_URL = "https://thunderous-kitsune-ca7394.netlify.app/";
const REPORT_PATH = "benchmarks/OUTBOUND_BACKTEST_2026-07-31.md";
const RESULTS_PATH = "benchmarks/outbound-backtest-2026-07-31.json";
const SAMPLE_PER_INDUSTRY = 3;
const CONCURRENCY = 3;

type Prospect = {
  group: string;
  host: string;
  name: string;
  sourceMessage: string;
  sourceScore: number;
  url: string;
};

type BacktestResult = Prospect & {
  categoryStages?: Record<string, string>;
  elapsedMs: number;
  error?: string;
  failedChecks?: string[];
  finalUrl?: string;
  findings?: string[];
  pagesAudited?: number;
  readinessScore?: number;
  readinessStage?: string;
  scoreDelta?: number;
};

const PREVIOUSLY_TESTED_HOSTS = new Set([
  "acephysiotherapy.my",
  "chambersofsakthi.com",
  "clever.com.my",
  "edenfuneral.com",
  "gskassociates.net",
  "myrenovationcenter.com",
]);

function decodeHtml(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function textContent(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedHost(value: string) {
  return value.toLowerCase().replace(/^www\./, "");
}

function extractProspects(html: string): Prospect[] {
  return html
    .split('<div class="lead"')
    .slice(1)
    .flatMap((block) => {
      const group = decodeHtml(block.match(/data-group="([^"]+)"/)?.[1] ?? "");
      const name = textContent(
        block.match(/<span class="bn">([\s\S]*?)<\/span>/)?.[1] ?? "",
      );
      const host = textContent(
        block.match(/<span class="host">([\s\S]*?)<\/span>/)?.[1] ?? "",
      );
      const sourceMessage = textContent(
        block.match(/<textarea class="mt" readonly>([\s\S]*?)<\/textarea>/)?.[1] ??
          "",
      );
      const url = sourceMessage
        .match(/I took a look at (https?:\/\/\S+?)(?:\.\s|$)/)?.[1]
        ?.replace(/[.,]+$/, "");
      const sourceScore = Number(
        sourceMessage.match(/came out (\d+)\/100/i)?.[1] ?? "NaN",
      );
      if (!group || !host || !name || !url || !Number.isFinite(sourceScore)) {
        return [];
      }
      return [{ group, host, name, sourceMessage, sourceScore, url }];
    });
}

function selectStratifiedSample(prospects: Prospect[]) {
  const groups = Map.groupBy(prospects, (prospect) => prospect.group);
  return [...groups.entries()].flatMap(([, groupProspects]) => {
    const eligible = groupProspects.filter(
      (prospect) => !PREVIOUSLY_TESTED_HOSTS.has(normalizedHost(prospect.host)),
    );
    if (eligible.length <= SAMPLE_PER_INDUSTRY) return eligible;
    const indexes = [
      0,
      Math.floor((eligible.length - 1) / 2),
      eligible.length - 1,
    ];
    return [...new Set(indexes)].map((index) => eligible[index]);
  });
}

function maturityStage(score: number) {
  if (score >= 85) return "Strong foundation";
  if (score >= 70) return "Established";
  if (score >= 55) return "Clear opportunity";
  return "Foundational opportunity";
}

function categoryStage(earned: number, maximum: number) {
  const percentage = maximum ? (earned / maximum) * 100 : 0;
  if (percentage >= 85) return "Strong";
  if (percentage >= 70) return "Established";
  if (percentage >= 55) return "Opportunity";
  return "Priority";
}

async function auditProspect(prospect: Prospect): Promise<BacktestResult> {
  const startedAt = Date.now();
  try {
    const crawl = await crawlSite(prospect.url);
    const result = scoreHomepage(crawl.homepage, {
      pagesAudited: crawl.pagesAudited,
      siteHtml: crawl.combinedSnapshot.html,
    });
    return {
      ...prospect,
      categoryStages: Object.fromEntries(
        result.categories.map((category) => [
          category.label,
          categoryStage(category.earned, category.maximum),
        ]),
      ),
      elapsedMs: Date.now() - startedAt,
      failedChecks: result.checks
        .filter((check) => !check.passed)
        .map((check) => check.key),
      finalUrl: result.finalUrl,
      findings: result.findings.map((finding) => finding.title),
      pagesAudited: result.pagesAudited.length,
      readinessScore: result.score,
      readinessStage: maturityStage(result.score),
      scoreDelta: result.score - prospect.sourceScore,
    };
  } catch (error) {
    return {
      ...prospect,
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
) {
  const results: R[] = new Array(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await mapper(values[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker()),
  );
  return results;
}

function average(values: number[]) {
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;
}

function escapeCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\s+/g, " ");
}

function buildReport(results: BacktestResult[], totalProspects: number) {
  const completed = results.filter(
    (result): result is BacktestResult & { readinessScore: number } =>
      typeof result.readinessScore === "number",
  );
  const failures = results.filter((result) => result.error);
  const highMismatch = completed.filter(
    (result) => result.sourceScore <= 55 && result.readinessScore >= 85,
  );
  const noDeterministicGap = completed.filter(
    (result) => !result.failedChecks?.length,
  );
  const groups = new Set(results.map((result) => result.group));
  const sourceMean = average(completed.map((result) => result.sourceScore));
  const readinessMean = average(completed.map((result) => result.readinessScore));

  const rows = results.map((result) => {
    const outcome = result.error
      ? `Needs verification (${result.error})`
      : `${result.readinessStage} (${result.readinessScore})`;
    return `| ${escapeCell(result.group)} | ${escapeCell(result.name)} | ${result.sourceScore} | ${escapeCell(outcome)} | ${
      result.scoreDelta ?? "—"
    } | ${escapeCell(result.failedChecks?.join(", ") || "None detected")} |`;
  });

  return `# Expanded outbound-directory backtest

Date: 2026-07-31  
Methodology: \`site-readiness-v2\`  
Source directory: ${SOURCE_URL}

## Scope

This is a stratified deterministic backtest across ${results.length} additional
companies from ${groups.size} industries, selected from ${totalProspects} parsed
prospects. It tests crawlability and evidence rules. It does not independently
prove live inclusion or exclusion in ChatGPT, Gemini, Claude, or Google AI, and
it does not include a rendered aesthetic assessment.

The directory's older "Google + AI Findability" score is retained only as a
comparison benchmark. Its methodology is not available in the directory and it
must not be treated as ground truth.

## Results

- Completed: ${completed.length}/${results.length}
- Needs verification: ${failures.length}/${results.length}
- Mean directory score among completed sites: ${sourceMean.toFixed(1)}
- Mean current deterministic readiness score: ${readinessMean.toFixed(1)}
- Large directional mismatches (directory <=55, current readiness >=85): ${highMismatch.length}
- No deterministic gap found; route to rendered visual review: ${noDeterministicGap.length}

| Industry | Company | Directory score | Current result | Difference | Failed deterministic checks |
| --- | --- | ---: | --- | ---: | --- |
${rows.join("\n")}

## Interpretation

1. The two scores are not measuring the same thing. A large difference is not
   automatically a defect in either number, but it is a warning against
   presenting either one as observed AI-platform visibility.
2. Crawl failures are reported as "Needs verification" and are not converted
   into low prospect scores.
3. The current result can legitimately show a strong technical/content
   foundation while still leaving aesthetic, positioning, conversion, or
   platform-observation opportunities for a consultation.
4. The source outbound message is largely templated. It offers a useful sales
   tone benchmark, but its statements that AI platforms do not name the company
   and that buyers are landing on competitors are unsupported by evidence in
   the directory itself and should not be copied into generated reports.
5. A site with no deterministic gap should be routed to the rendered aesthetic
   and conversion review. Its score should not be artificially reduced merely
   to manufacture a sales opportunity.

## Targeted rendered spot-check

The three 100-point deterministic results were opened in a real desktop browser
because they are the highest-risk false-complete cases:

- **Donny Wong & Co.** passed every structural rule, but the first screen uses a
  dated, visually dense split layout with an FAQ promotion competing against a
  long consultation form. A visual model should still identify hierarchy,
  positioning, and conversion opportunities.
- **Alisther Intervention & Rehabilitation Centre** passed every structural
  rule, but the first screen has an oversized identity block, substantial empty
  space, and a cramped navigation/contact row before the main proposition.
- **Fed to Flourish** passed every structural rule and also presented a clear,
  modern proposition with legible service language and two visible actions.

Two of the three perfect structural results still contain meaningful visual
opportunities. Therefore a deterministic 100 must mean "no rule gap detected,"
not "nothing to improve." Paid-traffic reports should not imply that aesthetics
were assessed until the Terra screenshot stage is connected.
`;
}

const sourceResponse = await fetch(SOURCE_URL, {
  headers: { "user-agent": "SignalFound benchmark/1.0" },
});
if (!sourceResponse.ok) {
  throw new Error(`SOURCE_DIRECTORY_HTTP_${sourceResponse.status}`);
}
const prospects = extractProspects(await sourceResponse.text());
const sample = selectStratifiedSample(prospects);
const results = await mapWithConcurrency(sample, CONCURRENCY, auditProspect);

await writeFile(
  RESULTS_PATH,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      methodologyVersion: "site-readiness-v2",
      results,
      sampleSize: results.length,
      sourceProspects: prospects.length,
      sourceUrl: SOURCE_URL,
    },
    null,
    2,
  )}\n`,
  "utf8",
);
await writeFile(REPORT_PATH, buildReport(results, prospects.length), "utf8");

console.log(
  JSON.stringify({
    completed: results.filter((result) => !result.error).length,
    failures: results.filter((result) => result.error).length,
    report: REPORT_PATH,
    sampleSize: results.length,
    sourceProspects: prospects.length,
  }),
);
