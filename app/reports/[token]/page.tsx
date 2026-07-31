import { env } from "cloudflare:workers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ensureDatabase,
  getAuditJobByToken,
  recordReportView,
} from "@/db/repository";
import type { AuditResult, CheckResult } from "@/lib/audit/types";

type PageProps = {
  params: Promise<{ token: string }>;
};

type ReportEnv = {
  DB?: D1Database;
  REPORT_CTA_LABEL?: string;
  REPORT_CTA_URL?: string;
};

const STRENGTH_PRIORITY = [
  "proof",
  "contact",
  "cta",
  "structured-data",
  "service-language",
  "about",
  "https",
  "successful-response",
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function executiveHeading(score: number) {
  if (score >= 80) {
    return "A strong structural foundation. Now refine how it looks, persuades and converts.";
  }
  if (score >= 60) {
    return "Your website is understandable. The opportunity is a clearer path to discovery and enquiry.";
  }
  return "Important business facts are being left for visitors and machines to infer.";
}

function readinessStage(score: number) {
  if (score >= 85) return "Strong foundation";
  if (score >= 70) return "Established";
  if (score >= 55) return "Clear opportunity";
  return "Foundational opportunity";
}

function categoryStage(earned: number, maximum: number) {
  const percentage = maximum > 0 ? (earned / maximum) * 100 : 0;
  if (percentage >= 85) return "Strong";
  if (percentage >= 70) return "Established";
  if (percentage >= 55) return "Opportunity";
  return "Priority";
}

function strongestChecks(result: AuditResult): CheckResult[] {
  const rank = new Map(STRENGTH_PRIORITY.map((key, index) => [key, index]));
  return result.checks
    .filter((check) => check.passed)
    .sort(
      (a, b) =>
        (rank.get(a.key) ?? STRENGTH_PRIORITY.length) -
          (rank.get(b.key) ?? STRENGTH_PRIORITY.length) ||
        b.weight - a.weight,
    )
    .slice(0, 4);
}

export default async function AuditReport({ params }: PageProps) {
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token)) notFound();

  const runtimeEnv = env as unknown as ReportEnv;
  if (!runtimeEnv.DB) notFound();
  await ensureDatabase(runtimeEnv.DB);
  const audit = await getAuditJobByToken(runtimeEnv.DB, token);
  if (!audit) notFound();

  if (audit.status !== "completed" || !audit.result) {
    return (
      <main className="report-shell">
        <section className="report-waiting">
          <p className="eyebrow dark">Assessment status</p>
          <h1>
            {audit.status === "failed"
              ? "We could not complete this assessment."
              : "Your evidence is being assembled."}
          </h1>
          <p>
            {audit.status === "failed"
              ? "The marketer’s system has received the failure status and can request a retry."
              : "This private page will show the completed assessment shortly."}
          </p>
        </section>
      </main>
    );
  }

  await recordReportView(runtimeEnv.DB, audit.id);
  const result = audit.result;
  const domain = new URL(result.finalUrl).hostname.replace(/^www\./, "");
  const strengths = strongestChecks(result);

  return (
    <main className="report-shell">
      <header className="report-header">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>SignalFound</span>
        </Link>
        <span>Private assessment · {formatDate(result.auditedAt)}</span>
      </header>

      <section className="report-hero">
        <div>
          <p className="report-domain">{domain}</p>
          <h1>{executiveHeading(result.score)}</h1>
          <p className="report-summary">{result.summary}</p>
          <p className="report-perspective">
            This complimentary stage assesses crawlable structure, public
            content and visible conversion signals. Rendered desktop/mobile
            presentation and live AI-platform inclusion require the next review.
          </p>
          <div className="report-badges">
            <span>{result.pagesAudited.length} pages inspected</span>
            <span>Evidence-backed assessment</span>
            <span>Structure, content &amp; conversion signals</span>
          </div>
        </div>
        <div
          className="stage-card"
          aria-label={`Structural readiness stage: ${readinessStage(result.score)}`}
        >
          <small>Structural readiness</small>
          <strong>{readinessStage(result.score)}</strong>
          <p>
            A maturity stage—not a grade. It reflects the crawlable foundation,
            not a completed visual or live-platform visibility test.
          </p>
        </div>
      </section>

      <section className="category-grid" aria-label="Score categories">
        {result.categories.map((category) => (
          <article key={category.key}>
            <div>
              <span>{category.label}</span>
              <strong>{categoryStage(category.earned, category.maximum)}</strong>
            </div>
            <div className="score-bar">
              <span
                style={{
                  width: `${(category.earned / category.maximum) * 100}%`,
                }}
              />
            </div>
          </article>
        ))}
      </section>

      <section className="strengths-section">
        <div className="section-heading">
          <p className="eyebrow dark">Existing advantages</p>
          <h2>What is already working</h2>
          <p>
            The best improvements build on existing credibility. These are
            verified strengths worth preserving as the website evolves.
          </p>
        </div>
        <div className="strengths-grid">
          {strengths.map((strength) => (
            <article key={strength.key}>
              <span aria-hidden="true">✓</span>
              <div>
                <h3>{strength.label}</h3>
                <p>{strength.evidence}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="findings-section">
        <div className="section-heading">
          <p className="eyebrow dark">Priority roadmap</p>
          <h2>The three moves we would prioritize</h2>
          <p>
            Each recommendation connects a verified observation to the
            customer journey, then sets out the implementation direction.
          </p>
        </div>
        <div className="findings-list">
          {result.findings.length ? (
            result.findings.slice(0, 3).map((finding, index) => (
              <article className="finding" key={`${finding.title}-${index}`}>
                <div className="finding-index">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <em>{finding.priority}</em>
                </div>
                <div>
                  <h3>{finding.title}</h3>
                  <p>{finding.impact}</p>
                  <dl>
                    <div>
                      <dt>What we observed</dt>
                      <dd>{finding.evidence}</dd>
                    </div>
                    <div>
                      <dt>What we would change</dt>
                      <dd>{finding.recommendation}</dd>
                    </div>
                  </dl>
                </div>
              </article>
            ))
          ) : (
            <article className="finding">
              <div>
                <h3>No critical crawl-readiness gaps were detected.</h3>
                <p>
                  The next useful step is a rendered desktop/mobile review of
                  visual trust and conversion clarity, followed by dated
                  platform-specific visibility experiments where appropriate.
                </p>
              </div>
            </article>
          )}
        </div>
      </section>

      <section className="approach-section">
        <div className="section-heading">
          <p className="eyebrow">Why a combined approach</p>
          <h2>More than conventional SEO or a cosmetic redesign.</h2>
          <p>
            Keywords alone cannot repair a confusing customer journey. A
            visual redesign alone does not ensure that search and AI systems
            understand the business. We align the message, evidence, structure
            and conversion path as one system.
          </p>
        </div>
        <div className="approach-grid">
          <article>
            <span>01</span>
            <h3>Discoverability</h3>
            <p>
              Make the business, services, expertise and locations easier for
              search and AI systems to interpret.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Trust</h3>
            <p>
              Preserve the brand while strengthening the proof and clarity
              prospective customers need to feel confident.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Conversion</h3>
            <p>
              Shorten the journey from first impression to a meaningful
              enquiry, booking or WhatsApp conversation.
            </p>
          </article>
        </div>
      </section>

      <section className="method-section">
        <div>
          <p className="eyebrow">Our standard</p>
          <h2>Specific enough to act on. Responsible enough to trust.</h2>
        </div>
        <p>
          This assessment is grounded in observable technical, content, trust
          and conversion evidence. It measures readiness rather than claiming
          a permanent position in an answer platform. Dated, controlled
          visibility testing can be added when actual platform appearance must
          be verified.
        </p>
      </section>

      {runtimeEnv.REPORT_CTA_URL ? (
        <section className="report-cta">
          <div>
            <p className="eyebrow">Next step</p>
            <h2>Let us show you what we would change first.</h2>
            <p>
              In a short consultation, we will walk through the priority
              improvements, explain the recommended sequence and show how the
              website can become easier to discover, easier to trust and easier
              to contact.
            </p>
          </div>
          <a href={runtimeEnv.REPORT_CTA_URL}>
            {runtimeEnv.REPORT_CTA_LABEL || "Discuss my assessment"}
            <span aria-hidden="true">→</span>
          </a>
        </section>
      ) : null}

      <footer className="report-footer">
        <span>Method: {result.methodologyVersion}</span>
        <span>Assessed URL: {result.finalUrl}</span>
      </footer>
    </main>
  );
}
