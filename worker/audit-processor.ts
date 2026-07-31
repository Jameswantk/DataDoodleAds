import {
  completeAudit,
  failAudit,
  getCachedAuditResult,
  getAuditJobById,
  markAuditProcessing,
  putCachedAuditResult,
  recordAuditEvent,
} from "../db/repository";
import { crawlSite } from "../lib/audit/crawl";
import { contentFingerprint, fetchHomepage } from "../lib/audit/inspect";
import {
  addAiNarrative,
  DEFAULT_WORKERS_AI_MODEL,
  NARRATIVE_VERSION,
} from "../lib/audit/narrative";
import { analysisCacheKey, cacheTtlDays } from "../lib/audit/cache";
import { METHODOLOGY_VERSION, scoreHomepage } from "../lib/audit/score";
import { deliverCompletionCallback } from "../lib/integrations/callback";
import type {
  AuditEnv,
  AuditEvidenceRecord,
  AuditWorkflowParams,
} from "./types";

export function reportUrl(params: AuditWorkflowParams) {
  return new URL(`/reports/${params.publicToken}`, params.baseUrl).toString();
}

export async function collectAuditResult(
  env: AuditEnv,
  params: AuditWorkflowParams,
) {
  const homepage = await fetchHomepage(params.normalizedUrl);
  const fingerprint = await contentFingerprint(homepage.html);
  const model = env.AI
    ? env.WORKERS_AI_MODEL || DEFAULT_WORKERS_AI_MODEL
    : "rules-only";
  const analysisKey = `${METHODOLOGY_VERSION}:${params.locale}:${model}:${NARRATIVE_VERSION}`;
  const cacheKey = analysisCacheKey(
    params.locale,
    `${model}:${NARRATIVE_VERSION}`,
    fingerprint,
  );
  const cached = await getCachedAuditResult(
    env.DB,
    params.normalizedUrl,
    fingerprint,
    analysisKey,
  );
  if (cached) {
    await recordAuditEvent(env.DB, params.auditId, "audit_cache_hit", {
      cachedAt: cached.createdAt,
      contentFingerprint: fingerprint,
    });
    return {
      ...cached.result,
      auditedAt: new Date().toISOString(),
    };
  }

  const crawl = await crawlSite(params.normalizedUrl, undefined, homepage);
  const scored = scoreHomepage(crawl.homepage, {
    pagesAudited: crawl.pagesAudited,
    siteHtml: crawl.combinedSnapshot.html,
  });
  const result = await addAiNarrative(
    env.AI,
    scored,
    params.locale,
    env.WORKERS_AI_MODEL,
  );
  const expiresAt = new Date(
    Date.now() + cacheTtlDays(env.AUDIT_CACHE_TTL_DAYS) * 86_400_000,
  ).toISOString();
  try {
    await putCachedAuditResult(env.DB, {
      analysisKey,
      cacheKey,
      contentFingerprint: fingerprint,
      expiresAt,
      normalizedUrl: params.normalizedUrl,
      result,
    });
  } catch {
    // Cache availability must never decide whether a completed audit succeeds.
  }
  return result;
}

export async function storeEvidence(
  env: AuditEnv,
  params: AuditWorkflowParams,
  result: Awaited<ReturnType<typeof collectAuditResult>>,
) {
  if (!env.EVIDENCE) return;
  const record: AuditEvidenceRecord = {
    auditId: params.auditId,
    result,
    storedAt: new Date().toISOString(),
  };
  await env.EVIDENCE.put(
    `audits/${params.auditId}/result.json`,
    JSON.stringify(record),
    {
      httpMetadata: { contentType: "application/json" },
      customMetadata: {
        methodologyVersion: result.methodologyVersion,
      },
    },
  );
}

export async function deliverAuditCallback(
  env: AuditEnv,
  params: AuditWorkflowParams,
) {
  const job = await getAuditJobById(env.DB, params.auditId);
  if (!job || job.status !== "completed") {
    throw new Error("COMPLETED_AUDIT_NOT_FOUND");
  }
  await deliverCompletionCallback(env, job, reportUrl(params));
}

export async function runAuditToCompletion(
  env: AuditEnv,
  params: AuditWorkflowParams,
) {
  try {
    await markAuditProcessing(env.DB, params.auditId);
    const result = await collectAuditResult(env, params);
    await storeEvidence(env, params, result);
    await completeAudit(env.DB, params.auditId, result);
  } catch (caught) {
    const code = caught instanceof Error ? caught.message : "AUDIT_FAILED";
    await failAudit(env.DB, params.auditId, code);
    throw caught;
  }

  try {
    await deliverAuditCallback(env, params);
  } catch {
    // In the non-durable fallback, callback failure is recorded but must not
    // turn a completed audit into a failed audit.
  }
}
