import type { AuditResult } from "./types";

export function compactAuditEvidence(result: AuditResult) {
  return {
    methodologyVersion: result.methodologyVersion,
    categories: result.categories.map(({ earned, key, maximum }) => ({
      earned,
      key,
      maximum,
    })),
    failedChecks: result.checks
      .filter((check) => !check.passed)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 6)
      .map(({ evidence, key, label, weight }) => ({
        evidence,
        key,
        label,
        weight,
      })),
    verifiedStrengths: result.checks
      .filter((check) => check.passed)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map(({ evidence, key, label }) => ({ evidence, key, label })),
    pagesAudited: result.pagesAudited.length,
  };
}
