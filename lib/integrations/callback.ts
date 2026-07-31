import {
  recordCallbackAttempt,
  type AuditJob,
} from "../../db/repository";

type CallbackEnv = {
  AUDIT_CALLBACK_SIGNING_SECRET?: string;
  AUDIT_CALLBACK_URL?: string;
  DB: D1Database;
};

function toHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function signCallback(
  secret: string,
  timestamp: string,
  body: string,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  return `sha256=${toHex(signature)}`;
}

export async function deliverCompletionCallback(
  env: CallbackEnv,
  job: AuditJob,
  reportUrl: string,
) {
  if (!env.AUDIT_CALLBACK_URL) {
    await recordCallbackAttempt(env.DB, job.id, "skipped");
    return;
  }
  if (!env.AUDIT_CALLBACK_SIGNING_SECRET) {
    await recordCallbackAttempt(env.DB, job.id, "failed", {
      reason: "missing_signing_secret",
    });
    throw new Error("CALLBACK_SIGNING_SECRET_MISSING");
  }

  const eventId = `audit:${job.id}:completed`;
  const timestamp = Math.floor(Date.now() / 1_000).toString();
  const body = JSON.stringify({
    schemaVersion: "1",
    event: "audit.completed",
    eventId,
    occurredAt: job.completedAt,
    auditId: job.id,
    externalLeadId: job.externalLeadId,
    reportUrl,
    score: job.score,
    status: job.status,
    websiteUrl: job.normalizedUrl,
  });
  const signature = await signCallback(
    env.AUDIT_CALLBACK_SIGNING_SECRET,
    timestamp,
    body,
  );

  try {
    const response = await fetch(env.AUDIT_CALLBACK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-audit-event-id": eventId,
        "x-audit-signature": signature,
        "x-audit-timestamp": timestamp,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`CALLBACK_HTTP_${response.status}`);
    }
    await recordCallbackAttempt(env.DB, job.id, "delivered", {
      eventId,
      responseStatus: response.status,
    });
  } catch (caught) {
    await recordCallbackAttempt(env.DB, job.id, "failed", {
      eventId,
      reason: caught instanceof Error ? caught.message : "callback_failed",
    });
    throw caught;
  }
}
