import { isSafeRedirect } from "./url";

const MAX_HTML_BYTES = 750_000;
const MAX_REDIRECTS = 3;

export type HomepageSnapshot = {
  finalUrl: string;
  html: string;
  status: number;
};

async function readLimitedText(response: Response) {
  const declaredSize = Number(response.headers.get("content-length") ?? "0");
  if (declaredSize > MAX_HTML_BYTES) {
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
    if (total > MAX_HTML_BYTES) {
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
  return new TextDecoder().decode(joined);
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
