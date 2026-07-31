import { fetchHomepage, type HomepageSnapshot } from "./inspect";
import type { AuditResult } from "./types";

const DEFAULT_PAGE_BUDGET = 6;
const PRIORITY_TERMS = [
  "service",
  "solution",
  "product",
  "about",
  "case",
  "result",
  "customer",
  "testimonial",
  "faq",
  "contact",
  "location",
];

function pageTitle(html: string) {
  return (
    html
      .match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?.replace(/\s+/g, " ")
      .trim()
      .slice(0, 240) ?? null
  );
}

function candidateUrls(homepage: HomepageSnapshot, limit: number) {
  const origin = new URL(homepage.finalUrl).origin;
  const candidates = new Map<string, number>();
  const links = homepage.html.matchAll(/<a\b[^>]+href=["']([^"'#]+)["']/gi);

  for (const match of links) {
    let url: URL;
    try {
      url = new URL(match[1], homepage.finalUrl);
    } catch {
      continue;
    }

    if (
      url.origin !== origin ||
      !["http:", "https:"].includes(url.protocol) ||
      /\.(?:avif|css|gif|jpe?g|js|json|pdf|png|svg|webp|xml|zip)$/i.test(
        url.pathname,
      )
    ) {
      continue;
    }

    url.hash = "";
    url.search = "";
    const normalized = url.toString();
    if (normalized === homepage.finalUrl) continue;

    const haystack = `${url.pathname} ${match[0]}`.toLowerCase();
    const priority = PRIORITY_TERMS.reduce(
      (score, term) => score + (haystack.includes(term) ? 2 : 0),
      0,
    );
    const depthPenalty = Math.max(0, url.pathname.split("/").length - 3);
    candidates.set(normalized, Math.max(candidates.get(normalized) ?? 0, priority - depthPenalty));
  }

  return [...candidates.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([url]) => url);
}

export type CrawlResult = {
  combinedSnapshot: HomepageSnapshot;
  homepage: HomepageSnapshot;
  pages: HomepageSnapshot[];
  pagesAudited: AuditResult["pagesAudited"];
};

export async function crawlSite(
  normalizedUrl: string,
  pageBudget = DEFAULT_PAGE_BUDGET,
  suppliedHomepage?: HomepageSnapshot,
): Promise<CrawlResult> {
  const homepage = suppliedHomepage ?? await fetchHomepage(normalizedUrl);
  const urls = candidateUrls(homepage, Math.max(0, pageBudget - 1));
  const pages = [homepage];

  for (const url of urls) {
    try {
      const page = await fetchHomepage(url);
      if (new URL(page.finalUrl).origin === new URL(homepage.finalUrl).origin) {
        pages.push(page);
      }
    } catch {
      // Partial crawl evidence is useful; an individual secondary page failure
      // does not invalidate the homepage audit.
    }
  }

  return {
    combinedSnapshot: {
      finalUrl: homepage.finalUrl,
      html: pages.map((page) => page.html).join("\n<!-- audit-page-boundary -->\n"),
      status: homepage.status,
    },
    homepage,
    pages,
    pagesAudited: pages.map((page) => ({
      status: page.status,
      title: pageTitle(page.html),
      url: page.finalUrl,
    })),
  };
}
