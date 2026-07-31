import type {
  AuditResult,
  CheckResult,
  Finding,
  ScoreCategory,
} from "./types";
import type { HomepageSnapshot } from "./inspect";

export type ScoringContext = {
  pagesAudited?: AuditResult["pagesAudited"];
  siteHtml?: string;
};

export const METHODOLOGY_VERSION = "site-readiness-v2";

function match(html: string, expression: RegExp) {
  return expression.test(html);
}

function capture(html: string, expression: RegExp) {
  const value = html.match(expression)?.[1]?.replace(/\s+/g, " ").trim();
  return value ? value.slice(0, 240) : null;
}

function primaryHeading(html: string) {
  for (const heading of html.matchAll(/<h1\b([^>]*)>([\s\S]*?)<\/h1>/gi)) {
    const attributes = heading[1] ?? "";
    if (
      /\bhidden\b/i.test(attributes) ||
      /aria-hidden=["']?true/i.test(attributes) ||
      /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(attributes)
    ) {
      continue;
    }
    const text = heading[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text) return text.slice(0, 240);
  }
  return null;
}

function isDescriptiveHeading(value: string | null) {
  if (!value || value.length < 12) return false;
  const normalized = value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return ![
    "our service",
    "our services",
    "what we do",
    "who we are",
    "why choose us",
    "welcome",
    "welcome to our website",
  ].includes(normalized);
}

function internalLinkCount(html: string, pageUrl: string) {
  const origin = new URL(pageUrl).origin;
  const links = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]+href=["']([^"'#]+)["']/gi)) {
    try {
      const url = new URL(match[1], pageUrl);
      if (url.origin !== origin || !["http:", "https:"].includes(url.protocol)) {
        continue;
      }
      url.hash = "";
      links.add(url.toString());
    } catch {
      // Invalid and non-HTTP links do not count as crawlable navigation.
    }
  }
  return links.size;
}

function robotsContent(html: string) {
  return (
    capture(
      html,
      /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    ) ??
    capture(
      html,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["'][^>]*>/i,
    )
  );
}

function visibleText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function check(
  key: string,
  label: string,
  passed: boolean,
  weight: number,
  evidence: string,
): CheckResult {
  return { key, label, passed, weight, points: passed ? weight : 0, evidence };
}

export function scoreHomepage(
  snapshot: HomepageSnapshot,
  context: ScoringContext = {},
): AuditResult {
  const homepageHtml = snapshot.html;
  const siteHtml = context.siteHtml ?? homepageHtml;
  const title = capture(homepageHtml, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = capture(
    homepageHtml,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  ) ?? capture(
    homepageHtml,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i,
  );
  const h1 = primaryHeading(homepageHtml);
  const homepageText = visibleText(homepageHtml);
  const siteText = visibleText(siteHtml);
  const internalLinks = internalLinkCount(homepageHtml, snapshot.finalUrl);
  const robots = robotsContent(homepageHtml);

  const technical = [
    check(
      "successful-response",
      "Homepage responds successfully",
      snapshot.status >= 200 && snapshot.status < 300,
      7,
      `HTTP status ${snapshot.status}`,
    ),
    check(
      "https",
      "Secure HTTPS address",
      snapshot.finalUrl.startsWith("https://"),
      6,
      snapshot.finalUrl.startsWith("https://")
        ? "The final homepage uses HTTPS."
        : "The final homepage does not use HTTPS.",
    ),
    check(
      "title",
      "Descriptive page title",
      Boolean(title && title.length >= 20 && title.length <= 70),
      5,
      title ? `Detected title: “${title}”` : "No page title was detected.",
    ),
    check(
      "description",
      "Search description",
      Boolean(description && description.length >= 70),
      5,
      description
        ? `A ${description.length}-character description was detected.`
        : "No meta description was detected.",
    ),
    check(
      "canonical",
      "Canonical URL declared",
      match(homepageHtml, /<link[^>]+rel=["'][^"']*canonical[^"']*["'][^>]*>/i),
      4,
      "Checked the rendered homepage markup for a canonical link.",
    ),
    check(
      "robots",
      "Homepage is not marked noindex",
      !robots?.toLowerCase().includes("noindex"),
      5,
      robots
        ? `Homepage robots directive: “${robots}”.`
        : "No homepage noindex directive was detected.",
    ),
    check(
      "viewport",
      "Mobile viewport configured",
      match(homepageHtml, /<meta[^>]+name=["']viewport["'][^>]*>/i),
      4,
      "Checked for a mobile viewport declaration.",
    ),
    check(
      "language",
      "Page language declared",
      match(homepageHtml, /<html[^>]+lang=["'][a-z]{2,}/i),
      4,
      "Checked the root document language attribute.",
    ),
  ];

  const answerReadiness = [
    check(
      "h1",
      "Clear primary heading",
      isDescriptiveHeading(h1),
      7,
      h1 ? `Primary heading: “${h1}”` : "No usable H1 was detected.",
    ),
    check(
      "structured-data",
      "Structured business data",
      match(homepageHtml, /application\/ld\+json/i),
      8,
      "Checked for JSON-LD structured data.",
    ),
    check(
      "service-language",
      "Service or product language",
      /\b(service|services|solutions|products|what we do|how we help)\b/i.test(
        siteText,
      ),
      6,
      "Checked the audited public pages for explicit offering language.",
    ),
    check(
      "location-language",
      "Location or service-area context",
      /\b(location|locations|service area|serving|based in|near you|nationwide|global|kuala lumpur|malaysia|selangor|petaling jaya|singapore)\b/i.test(siteText) ||
        /\b(addressLocality|addressRegion|areaServed|PostalAddress)\b/i.test(siteHtml),
      5,
      "Checked audited copy and structured data for geographic context.",
    ),
    check(
      "question-content",
      "Question-led explanatory content",
      match(siteHtml, /<h[2-4][^>]*>[^<]*(how|what|why|when|where|who)[^<]*<\/h[2-4]>/i) ||
        match(siteHtml, /faq/i),
      5,
      "Checked headings and markup for FAQ or question-led content.",
    ),
    check(
      "internal-links",
      "Useful internal navigation",
      internalLinks >= 4,
      4,
      `${internalLinks} unique same-origin homepage links were detected.`,
    ),
  ];

  const trustConversion = [
    check(
      "contact",
      "Contact route is visible",
      /\b(contact|call us|email us|get in touch|book a|schedule a)\b/i.test(
        homepageText,
      ),
      6,
      "Checked visible copy for a clear contact route.",
    ),
    check(
      "proof",
      "Evidence and proof signals",
      /\b(case stud|testimonial|review|client|customer|results|years of experience|certified|award)\b/i.test(
        siteText,
      ),
      7,
      "Checked visible copy for reviews, results, credentials, or case studies.",
    ),
    check(
      "about",
      "Business identity explained",
      /\b(about us|our story|our team|who we are)\b/i.test(siteText),
      5,
      "Checked for an about, team, or company-identity route.",
    ),
    check(
      "cta",
      "Action-oriented next step",
      /\b(get started|request|book|schedule|contact|get a quote|talk to|buy now|start now)\b/i.test(
        homepageText,
      ),
      7,
      "Checked the homepage for a clear action-oriented call to action.",
    ),
  ];

  const checks = [...technical, ...answerReadiness, ...trustConversion];
  const toCategory = (
    key: ScoreCategory["key"],
    label: string,
    group: CheckResult[],
  ): ScoreCategory => ({
    key,
    label,
    earned: group.reduce((sum, item) => sum + item.points, 0),
    maximum: group.reduce((sum, item) => sum + item.weight, 0),
  });

  const categories = [
    toCategory("technical", "Technical access", technical),
    toCategory("answerReadiness", "Answer readiness", answerReadiness),
    toCategory("trustConversion", "Trust & conversion", trustConversion),
  ];
  const score = categories.reduce((sum, category) => sum + category.earned, 0);

  const findingTemplates: Record<
    string,
    Omit<Finding, "evidence" | "evidenceKeys">
  > = {
    "structured-data": {
      priority: "High",
      title: "Make your business easier for machines to identify",
      impact:
        "Without explicit structured data, answer engines must infer core business facts from page copy alone.",
      recommendation:
        "Add valid Organization or LocalBusiness JSON-LD with your official name, URL, contact details, locations, and relevant sameAs profiles.",
    },
    "service-language": {
      priority: "High",
      title: "State your commercial offering more explicitly",
      impact:
        "Vague positioning makes it harder to match your company to high-intent buyer questions.",
      recommendation:
        "Create a concise, factual services block naming who you help, what you provide, and the problems each service solves.",
    },
    "proof": {
      priority: "High",
      title: "Give recommendation systems stronger proof",
      impact:
        "AI systems are less likely to recommend a business when important claims lack visible supporting evidence.",
      recommendation:
        "Add specific case studies, quantified results, named expertise, credentials, and attributable customer proof.",
    },
    "location-language": {
      priority: "Medium",
      title: "Clarify where the business operates",
      impact:
        "Missing geographic context weakens relevance for location-specific recommendation queries.",
      recommendation:
        "State your primary locations and service areas in visible copy and reinforce them on dedicated location pages.",
    },
    description: {
      priority: "Medium",
      title: "Improve the homepage summary",
      impact:
        "A missing or thin description gives crawlers less context about the page before deeper processing.",
      recommendation:
        "Write a specific homepage description covering the business, core offering, audience, and principal market.",
    },
    h1: {
      priority: "High",
      title: "Lead with one unambiguous primary heading",
      impact:
        "A weak or missing primary heading makes the page topic harder to determine.",
      recommendation:
        "Use one H1 that clearly names the core outcome or service instead of relying on a slogan alone.",
    },
    contact: {
      priority: "Medium",
      title: "Make the next step unmistakable",
      impact:
        "Even successful discovery underperforms when visitors cannot quickly identify how to engage.",
      recommendation:
        "Add a persistent, descriptive contact or consultation action in the header and at key decision points.",
    },
  };

  const findings = checks
    .filter((item) => !item.passed && findingTemplates[item.key])
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((item) => ({
      ...findingTemplates[item.key],
      evidence: item.evidence,
      evidenceKeys: [item.key],
    }));

  return {
    analysisMode: "rules-only",
    auditedAt: new Date().toISOString(),
    categories,
    checks,
    finalUrl: snapshot.finalUrl,
    findings,
    homepageTitle: title,
    methodologyVersion: METHODOLOGY_VERSION,
    narrativeModel: null,
    pagesAudited:
      context.pagesAudited ??
      [{ status: snapshot.status, title, url: snapshot.finalUrl }],
    score,
    summary:
      score >= 80
        ? "Your homepage has a strong technical and content foundation. The next gains will come from deeper topic coverage and measured platform visibility."
        : score >= 60
          ? "Your homepage is understandable, but several evidence and clarity gaps may reduce its chance of being selected in AI-generated recommendations."
          : "Your homepage currently leaves important business facts for machines to infer. Resolving the highest-priority gaps should materially improve its readiness.",
  };
}
