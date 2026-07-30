import {
  createOrGetAuditJob,
  ensureDatabase,
  getAuditJobById,
} from "../db/repository";
import {
  apiError,
  isAuthorized,
  parseCreateAuditRequest,
  validateIdempotencyKey,
} from "../lib/api/contracts";
import { runAuditToCompletion } from "./audit-processor";
import type {
  AuditEnv,
  AuditWorkflowParams,
  WorkerExecutionContext,
} from "./types";

function publicToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function responseHeaders(requestId: string) {
  return {
    "cache-control": "no-store",
    "content-type": "application/json",
    "x-request-id": requestId,
  };
}

function jobResponse(job: Awaited<ReturnType<typeof getAuditJobById>>, origin: string) {
  if (!job) return null;
  return {
    auditId: job.id,
    callbackStatus: job.callbackStatus,
    completedAt: job.completedAt,
    createdAt: job.createdAt,
    errorCode: job.errorCode,
    externalLeadId: job.externalLeadId,
    locale: job.locale,
    reportUrl:
      job.status === "completed"
        ? new URL(`/reports/${job.publicToken}`, origin).toString()
        : null,
    score: job.score,
    status: job.status,
    statusUrl: new URL(`/api/v1/audits/${job.id}`, origin).toString(),
    updatedAt: job.updatedAt,
    websiteUrl: job.normalizedUrl,
  };
}

function errorDetails(code: string) {
  const details: Record<string, [number, string]> = {
    IDEMPOTENCY_CONFLICT: [
      409,
      "This idempotency key was already used for a different audit request.",
    ],
    INVALID_EXTERNAL_LEAD_ID: [400, "externalLeadId is required."],
    INVALID_IDEMPOTENCY_KEY: [
      400,
      "Send an Idempotency-Key header containing 8–128 safe characters.",
    ],
    INVALID_JSON: [400, "The request body must be valid JSON."],
    INVALID_LOCALE: [400, "locale must be a valid language tag."],
    INVALID_WEBSITE_URL: [
      400,
      "websiteUrl must be a valid public HTTP or HTTPS website address.",
    ],
    REQUEST_TOO_LARGE: [413, "The request body is too large."],
  };
  return details[code] ?? [500, "The audit request could not be accepted."];
}

export async function handleAuditApi(
  request: Request,
  env: AuditEnv,
  ctx: WorkerExecutionContext,
): Promise<Response | null> {
  const url = new URL(request.url);
  const requestId = crypto.randomUUID();

  if (url.pathname === "/health" && request.method === "GET") {
    return Response.json(
      {
        service: "ai-visibility-audit",
        status: env.DB ? "ok" : "degraded",
        time: new Date().toISOString(),
      },
      { headers: responseHeaders(requestId), status: env.DB ? 200 : 503 },
    );
  }

  if (!url.pathname.startsWith("/api/v1/audits")) return null;

  if (!env.AUDIT_API_KEY) {
    return apiError(
      503,
      "SERVICE_NOT_CONFIGURED",
      "The audit API credential has not been configured.",
      requestId,
    );
  }
  if (!isAuthorized(request, env.AUDIT_API_KEY)) {
    return apiError(
      401,
      "UNAUTHORIZED",
      "A valid bearer credential is required.",
      requestId,
    );
  }

  await ensureDatabase(env.DB);

  if (url.pathname === "/api/v1/audits" && request.method === "POST") {
    try {
      const input = await parseCreateAuditRequest(request);
      const idempotencyKey = validateIdempotencyKey(
        request.headers.get("idempotency-key"),
      );
      const auditId = crypto.randomUUID();
      const token = publicToken();
      const { created, job } = await createOrGetAuditJob(env.DB, {
        externalLeadId: input.externalLeadId,
        id: auditId,
        idempotencyKey,
        locale: input.locale,
        normalizedUrl: input.normalizedUrl,
        publicToken: token,
        websiteUrl: input.websiteUrl,
      });

      if (created) {
        const params: AuditWorkflowParams = {
          auditId,
          baseUrl: url.origin,
          locale: input.locale,
          normalizedUrl: input.normalizedUrl,
          publicToken: token,
        };
        if (env.AUDIT_WORKFLOW) {
          await env.AUDIT_WORKFLOW.create({ id: auditId, params });
        } else {
          ctx.waitUntil(runAuditToCompletion(env, params));
        }
      }

      return Response.json(jobResponse(job, url.origin), {
        headers: {
          ...responseHeaders(requestId),
          "retry-after": job.status === "completed" ? "0" : "3",
        },
        status: created ? 202 : 200,
      });
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "INVALID_REQUEST";
      const [status, message] = errorDetails(code);
      return apiError(status, code, message, requestId);
    }
  }

  const match = url.pathname.match(
    /^\/api\/v1\/audits\/([0-9a-f-]{36})$/,
  );
  if (match && request.method === "GET") {
    const job = await getAuditJobById(env.DB, match[1]);
    if (!job) {
      return apiError(
        404,
        "AUDIT_NOT_FOUND",
        "No audit exists with that identifier.",
        requestId,
      );
    }
    return Response.json(jobResponse(job, url.origin), {
      headers: responseHeaders(requestId),
    });
  }

  return apiError(
    404,
    "ENDPOINT_NOT_FOUND",
    "The requested audit endpoint does not exist.",
    requestId,
  );
}
