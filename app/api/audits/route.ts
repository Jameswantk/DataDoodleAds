import { NextResponse } from "next/server";
import {
  completeAudit,
  createAudit,
  ensureDatabase,
  failAudit,
} from "@/db/repository";
import { fetchHomepage } from "@/lib/audit/inspect";
import { scoreHomepage } from "@/lib/audit/score";
import { normalizePublicUrl } from "@/lib/audit/url";
import { notifyCrm } from "@/lib/integrations/crm";

export const runtime = "edge";

const ATTRIBUTION_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "ad_id",
  "adset_id",
  "campaign_id",
]);

type Payload = {
  attribution?: Record<string, unknown>;
  auditConsent?: string;
  contactName?: string;
  email?: string;
  marketingConsent?: string;
  mobile?: string;
  websiteUrl?: string;
};

function clean(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function publicToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sanitizeAttribution(value: Payload["attribution"]) {
  const result: Record<string, string> = {};
  if (!value || typeof value !== "object") return result;
  for (const [key, candidate] of Object.entries(value)) {
    if (ATTRIBUTION_KEYS.has(key) && typeof candidate === "string") {
      result[key] = candidate.slice(0, 300);
    }
  }
  return result;
}

function errorMessage(code: string) {
  const messages: Record<string, string> = {
    INVALID_URL: "Please enter a valid public website URL.",
    INVALID_PROTOCOL: "Only HTTP and HTTPS website addresses can be audited.",
    PRIVATE_DESTINATION: "That address is not a public website.",
    PAGE_TOO_LARGE: "The homepage is too large for this complimentary audit.",
    NOT_HTML: "The address did not return a website page.",
    TOO_MANY_REDIRECTS: "The website redirected too many times.",
    INVALID_REDIRECT: "The website returned an invalid redirect.",
  };
  return messages[code] ?? "We could not reach that website. Please check the URL and try again.";
}

export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const contactName = clean(payload.contactName, 100);
  const email = clean(payload.email, 254).toLowerCase();
  const mobile = clean(payload.mobile, 32);
  const websiteUrl = clean(payload.websiteUrl, 2048);

  if (
    contactName.length < 2 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    mobile.length < 7 ||
    payload.auditConsent !== "yes"
  ) {
    return NextResponse.json(
      { error: "Please complete all required fields and authorize the audit." },
      { status: 400 },
    );
  }

  let normalizedUrl: string;
  try {
    normalizedUrl = normalizePublicUrl(websiteUrl);
  } catch (caught) {
    const code = caught instanceof Error ? caught.message : "INVALID_URL";
    return NextResponse.json({ error: errorMessage(code) }, { status: 400 });
  }

  const leadId = crypto.randomUUID();
  const auditId = crypto.randomUUID();
  const token = publicToken();

  try {
    await ensureDatabase();
    await createAudit({
      auditId,
      attribution: sanitizeAttribution(payload.attribution),
      contactName,
      email,
      leadId,
      marketingConsent: payload.marketingConsent === "yes",
      mobile,
      normalizedUrl,
      publicToken: token,
      websiteUrl,
    });

    const snapshot = await fetchHomepage(normalizedUrl);
    const result = scoreHomepage(snapshot);
    await completeAudit(auditId, result);
    const reportUrl = `/audit/${token}`;

    try {
      await notifyCrm({
        auditId,
        contactName,
        email,
        event: "audit_completed",
        mobile,
        reportUrl,
        score: result.score,
        websiteUrl: normalizedUrl,
      });
    } catch {
      // CRM delivery is non-blocking; the audit remains available.
    }

    return NextResponse.json({
      auditId,
      reportUrl,
      status: "completed",
    });
  } catch (caught) {
    const code = caught instanceof Error ? caught.message : "AUDIT_FAILED";
    try {
      await failAudit(auditId, code);
    } catch {
      // Preserve the original, user-relevant audit error.
    }
    return NextResponse.json({ error: errorMessage(code) }, { status: 422 });
  }
}
