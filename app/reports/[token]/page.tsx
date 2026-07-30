import { env } from "cloudflare:workers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ensureDatabase,
  getAuditJobByToken,
  recordReportView,
} from "@/db/repository";

type PageProps = {
  params: Promise<{ token: string }>;
};

type ReportEnv = {
  DB?: D1Database;
  REPORT_CTA_LABEL?: string;
  REPORT_CTA_URL?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
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
          <p className="eyebrow dark">Audit status</p>
          <h1>
            {audit.status === "failed"
              ? "We could not complete this audit."
              : "Your evidence is being assembled."}
          </h1>
          <p>
            {audit.status === "failed"
              ? "The marketer’s system has received the failure status and can request a retry."
              : "This private page will show the completed report shortly."}
          </p>
        </section>
      </main>
    );
  }

  await recordReportView(runtimeEnv.DB, audit.id);
  const result = audit.result;
  const domain = new URL(result.finalUrl).hostname.replace(/^www\./, "");

  return (
    <main className="report-shell">
      <header className="report-header">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>SignalFound</span>
        </Link>
        <span>Private audit · {formatDate(result.auditedAt)}</span>
      </header>

      <section className="report-hero">
        <div>
          <p className="report-domain">{domain}</p>
          <h1>Your AI visibility readiness audit.</h1>
          <p className="report-summary">{result.summary}</p>
          <div className="report-badges">
            <span>{result.pagesAudited.length} pages inspected</span>
            <span>
              {result.analysisMode === "workers-ai"
                ? "AI-assisted explanation"
                : "Evidence-rule explanation"}
            </span>
          </div>
        </div>
        <div
          className="score-dial"
          aria-label={`Readiness score ${result.score} out of 100`}
        >
          <strong>{result.score}</strong>
          <span>/ 100</span>
          <small>Readiness score</small>
        </div>
      </section>

      <section className="category-grid" aria-label="Score categories">
        {result.categories.map((category) => (
          <article key={category.key}>
            <div>
              <span>{category.label}</span>
              <strong>
                {category.earned}/{category.maximum}
              </strong>
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

      <section className="findings-section">
        <div className="section-heading">
          <p className="eyebrow dark">Priority roadmap</p>
          <h2>What to improve first</h2>
          <p>
            Every recommendation is anchored to evidence collected from the
            audited website.
          </p>
        </div>
        <div className="findings-list">
          {result.findings.length ? (
            result.findings.map((finding, index) => (
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
                      <dt>Evidence</dt>
                      <dd>{finding.evidence}</dd>
                    </div>
                    <div>
                      <dt>Recommended move</dt>
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
                  A deeper consultation can focus on topic coverage and dated
                  platform-specific visibility experiments.
                </p>
              </div>
            </article>
          )}
        </div>
      </section>

      <section className="method-section">
        <div>
          <p className="eyebrow">Methodology</p>
          <h2>A readiness assessment—not a fabricated ranking.</h2>
        </div>
        <p>
          This report evaluates observable technical, content, trust, and
          conversion signals. It does not claim a permanent position in
          ChatGPT, Gemini, Claude, or another answer platform. Platform
          visibility requires separate dated, controlled tests.
        </p>
      </section>

      {runtimeEnv.REPORT_CTA_URL ? (
        <section className="report-cta">
          <div>
            <p className="eyebrow">Next step</p>
            <h2>Turn the findings into an implementation plan.</h2>
          </div>
          <a href={runtimeEnv.REPORT_CTA_URL}>
            {runtimeEnv.REPORT_CTA_LABEL || "Discuss this audit"}
            <span aria-hidden="true">→</span>
          </a>
        </section>
      ) : null}

      <footer className="report-footer">
        <span>Method: {result.methodologyVersion}</span>
        <span>Audited URL: {result.finalUrl}</span>
      </footer>
    </main>
  );
}
