import { notFound } from "next/navigation";
import Link from "next/link";
import { ensureDatabase, getAuditByToken, recordReportView } from "@/db/repository";

type PageProps = {
  params: Promise<{ token: string }>;
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

  await ensureDatabase();
  const audit = await getAuditByToken(token);
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
              ? "Please reply to the audit email or submit the website again."
              : "Refresh this private page shortly."}
          </p>
          <Link href="/">Return to SignalFound</Link>
        </section>
      </main>
    );
  }

  await recordReportView(audit.id);
  const { result } = audit;
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
        </div>
        <div className="score-dial" aria-label={`Readiness score ${result.score} out of 100`}>
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
            Every finding below is linked to evidence observed on the audited
            homepage.
          </p>
        </div>
        <div className="findings-list">
          {result.findings.length ? (
            result.findings.map((finding, index) => (
              <article className="finding" key={finding.title}>
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
                <h3>No critical homepage gaps were detected.</h3>
                <p>
                  The next step is deeper multi-page coverage and controlled
                  visibility testing across answer platforms.
                </p>
              </div>
            </article>
          )}
        </div>
      </section>

      <section className="method-section">
        <div>
          <p className="eyebrow">How to read this</p>
          <h2>A readiness score—not a fabricated ranking.</h2>
        </div>
        <p>
          This report evaluates observable technical, content, trust, and
          conversion signals on the public homepage. It does not claim a
          permanent position in ChatGPT, Gemini, Claude, or any other platform.
          Platform visibility must be measured separately with dated,
          controlled queries.
        </p>
      </section>

      <section className="report-cta">
        <div>
          <p className="eyebrow">Complimentary consultation</p>
          <h2>Turn these findings into a visibility roadmap.</h2>
        </div>
        <a
          href={`mailto:hello@signalfound.example?subject=${encodeURIComponent(
            `AI visibility consultation for ${domain}`,
          )}`}
        >
          Discuss this audit <span aria-hidden="true">→</span>
        </a>
      </section>

      <footer className="report-footer">
        <span>Method: {result.methodologyVersion}</span>
        <span>Audited URL: {result.finalUrl}</span>
      </footer>
    </main>
  );
}
