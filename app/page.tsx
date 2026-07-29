import type { Metadata } from "next";
import { AuditForm } from "./components/AuditForm";

export const metadata: Metadata = {
  title: "SignalFound | Complimentary AI Visibility Audit",
  description:
    "See whether AI answer engines can understand, trust, and recommend your business.",
};

const checks = [
  {
    number: "01",
    title: "Discoverability",
    copy: "We test whether machines can access, parse, and confidently identify what your business does.",
  },
  {
    number: "02",
    title: "Answer readiness",
    copy: "We examine how clearly your services, locations, expertise, and proof are expressed.",
  },
  {
    number: "03",
    title: "Website experience",
    copy: "We flag the presentation and conversion gaps that can lose visitors after discovery.",
  },
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="SignalFound home">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>SignalFound</span>
        </a>
        <a className="header-link" href="#audit">
          Run your audit
          <span aria-hidden="true">↘</span>
        </a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="pulse" aria-hidden="true" />
            Complimentary website intelligence
          </p>
          <h1>
            Can AI find,
            <br />
            understand and
            <br />
            <em>recommend you?</em>
          </h1>
          <p className="hero-lede">
            Get a personalized audit showing how ready your website is to be
            discovered and cited by AI answer engines—and what to fix first.
          </p>
          <div className="proof-row" aria-label="Audit benefits">
            <span>Evidence-backed</span>
            <span>Private result</span>
            <span>No obligation</span>
          </div>
        </div>

        <div className="form-wrap" id="audit">
          <div className="form-heading">
            <div>
              <span className="form-kicker">Your complimentary audit</span>
              <h2>See your readiness score</h2>
            </div>
            <span className="score-orbit" aria-hidden="true">
              <span>AI</span>
            </span>
          </div>
          <AuditForm />
        </div>
      </section>

      <section className="audit-strip" aria-labelledby="what-we-test">
        <div className="strip-intro">
          <p className="eyebrow dark">What we test</p>
          <h2 id="what-we-test">Three signals that shape AI visibility.</h2>
        </div>
        <div className="check-grid">
          {checks.map((check) => (
            <article className="check-card" key={check.number}>
              <span className="check-number">{check.number}</span>
              <h3>{check.title}</h3>
              <p>{check.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <span>SignalFound</span>
        <p>
          Readiness results are a dated technical assessment, not a guarantee
          of placement on any AI platform.
        </p>
      </footer>
    </main>
  );
}
