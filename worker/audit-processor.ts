import {
  completeAudit,
  failAudit,
  getAuditJobById,
  markAuditProcessing,
} from "../db/repository";
import { crawlSite } from "../lib/audit/crawl";
import { addAiNarrative } from "../lib/audit/narrative";
import { scoreHomepage } from "../lib/audit/score";
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
  const crawl = await crawlSite(params.normalizedUrl);
  const scored = scoreHomepage(crawl.combinedSnapshot, {
    pagesAudited: crawl.pagesAudited,
  });
  return addAiNarrative(
    env.AI,
    scored,
    params.locale,
    env.WORKERS_AI_MODEL,
  );
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
