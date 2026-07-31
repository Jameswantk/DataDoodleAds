import { isSafeRedirect } from "./url";

const MAX_RESPONSE_BYTES = 3_000_000;
const MAX_COMPACT_HTML_BYTES = 1_250_000;
const MAX_REDIRECTS = 3;

export type HomepageSnapshot = {
  finalUrl: string;
  html: string;
  status: number;
};

export function compactHtml(html: string) {
  const compacted = html
    .replace(
      /<script\b(?![^>]*type=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi,
      " ",
    )
    .replace(/<(?:style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/(?:style|noscript|svg|template)>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<img\b[^>]*>/gi, " ")
    .replace(
      /\s(?:class|id|style|srcset|sizes|loading|decoding|data-[\w:-]+|aria-describedby|aria-labelledby)=("[^"]*"|'[^']*')/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();

  if (new TextEncoder().encode(compacted).byteLength <= MAX_COMPACT_HTML_BYTES) {
    return compacted;
  }

  const head = compacted.match(/<head\b[^>]*>[\s\S]*?<\/head>/i)?.[0] ?? "";
  const body = compacted.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? compacted;
  const meaningful = [
    ...body.matchAll(
      /<(?:a|address|article|button|dd|details|div|dl|dt|footer|h[1-6]|header|li|main|nav|p|section|summary)\b[^>]*>[\s\S]*?<\/(?:a|address|article|button|dd|details|div|dl|dt|footer|h[1-6]|header|li|main|nav|p|section|summary)>/gi,
    ),
  ]
    .map((match) => match[0])
    .join(" ");
  const reduced = `<html>${head}<body>${meaningful || body}</body></html>`;
  return new TextDecoder().decode(
    new TextEncoder().encode(reduced).slice(0, MAX_COMPACT_HTML_BYTES),
  );
}

export async function contentFingerprint(content: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(content),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function readLimitedText(response: Response) {
  const declaredSize = Number(response.headers.get("content-length") ?? "0");
  if (declaredSize > MAX_RESPONSE_BYTES) {
    throw new Error("PAGE_TOO_LARGE");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("PAGE_TOO_LARGE");
    }
    chunks.push(value);
  }

  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return compactHtml(new TextDecoder().decode(joined));
}

export async function fetchHomepage(startUrl: string): Promise<HomepageSnapshot> {
  let currentUrl = startUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const response = await fetch(currentUrl, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent":
          "SignalFound-Audit/0.2 (+https://github.com/Jameswantk/DataDoodleAds)",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("INVALID_REDIRECT");
      currentUrl = isSafeRedirect(new URL(location, currentUrl).toString());
      continue;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/html")) {
      throw new Error("NOT_HTML");
    }

    return {
      finalUrl: currentUrl,
      html: await readLimitedText(response),
      status: response.status,
    };
  }

  throw new Error("TOO_MANY_REDIRECTS");
}
