import { normalizePublicUrl } from "../audit/url";

const MAX_BODY_BYTES = 16_384;

export type CreateAuditRequest = {
  externalLeadId: string;
  locale: string;
  normalizedUrl: string;
  websiteUrl: string;
};

function cleanString(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export function secureEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export function isAuthorized(request: Request, apiKey: string | undefined) {
  if (!apiKey) return false;
  const authorization = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${apiKey}`;
  return secureEqual(authorization, expected);
}

export function validateIdempotencyKey(value: string | null) {
  if (!value || !/^[A-Za-z0-9._:-]{8,128}$/.test(value)) {
    throw new Error("INVALID_IDEMPOTENCY_KEY");
  }
  return value;
}

export async function parseCreateAuditRequest(
  request: Request,
): Promise<CreateAuditRequest> {
  const declaredSize = Number(request.headers.get("content-length") ?? "0");
  if (declaredSize > MAX_BODY_BYTES) throw new Error("REQUEST_TOO_LARGE");

  const bodyText = await request.text();
  if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) {
    throw new Error("REQUEST_TOO_LARGE");
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(bodyText) as Record<string, unknown>;
  } catch {
    throw new Error("INVALID_JSON");
  }

  const externalLeadId = cleanString(payload.externalLeadId, 160);
  const websiteUrl = cleanString(payload.websiteUrl, 2_048);
  const locale = cleanString(payload.locale, 20) || "en";

  if (!externalLeadId) throw new Error("INVALID_EXTERNAL_LEAD_ID");
  if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale)) {
    throw new Error("INVALID_LOCALE");
  }

  let normalizedUrl: string;
  try {
    normalizedUrl = normalizePublicUrl(websiteUrl);
  } catch {
    throw new Error("INVALID_WEBSITE_URL");
  }

  return { externalLeadId, locale, normalizedUrl, websiteUrl };
}

export function apiError(
  status: number,
  code: string,
  message: string,
  requestId = crypto.randomUUID(),
) {
  return Response.json(
    { error: { code, message, requestId } },
    {
      status,
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json",
      },
    },
  );
}
