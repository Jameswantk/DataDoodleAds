const capabilities = [
  {
    label: "01",
    title: "Accept",
    copy: "Authenticated, idempotent audit requests linked to the marketer’s external lead ID.",
  },
  {
    label: "02",
    title: "Inspect",
    copy: "A bounded multi-page crawl collects technical, content, trust, and conversion evidence.",
  },
  {
    label: "03",
    title: "Analyze",
    copy: "Versioned rules calculate the score; AI explains verified gaps without inventing new facts.",
  },
  {
    label: "04",
    title: "Return",
    copy: "A private report and signed completion callback return the result to the marketer’s system.",
  },
];

export default function Home() {
  return (
    <main className="service-shell">
      <header className="service-header">
        <a className="brand" href="#top" aria-label="SignalFound Audit Engine">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>SignalFound Audit Engine</span>
        </a>
        <a className="health-link" href="/health">
          <span aria-hidden="true" />
          Service health
        </a>
      </header>

      <section className="service-hero" id="top">
        <div>
          <p className="eyebrow">Integration service</p>
          <h1>
            Evidence in.
            <br />
            <em>Actionable audit out.</em>
          </h1>
        </div>
        <div className="service-intro">
          <p>
            This repository is the audit backend—not the advertising landing
            page. It receives a website and external lead ID from the marketer,
            processes the audit, and returns the result.
          </p>
          <div className="endpoint">
            <span>POST</span>
            <code>/api/v1/audits</code>
          </div>
        </div>
      </section>

      <section className="capability-section">
        <div className="capability-heading">
          <p className="eyebrow dark">Service boundary</p>
          <h2>One job, four dependable stages.</h2>
        </div>
        <div className="capability-list">
          {capabilities.map((capability) => (
            <article key={capability.label}>
              <span>{capability.label}</span>
              <h3>{capability.title}</h3>
              <p>{capability.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="contract-section">
        <div>
          <p className="eyebrow">Minimal request contract</p>
          <h2>No contact data required.</h2>
          <p>
            The marketer retains the person’s name, email, mobile number,
            consent, and attribution. This service only needs the website,
            locale, and external lead reference.
          </p>
        </div>
        <pre>
          <code>{`{
  "externalLeadId": "crm-lead-123",
  "websiteUrl": "https://example.com",
  "locale": "en-MY"
}`}</code>
        </pre>
      </section>

      <footer className="service-footer">
        <span>SignalFound Audit Engine</span>
        <span>Readiness is not a guaranteed AI-platform ranking.</span>
      </footer>
    </main>
  );
}
