import { METHODOLOGY_VERSION } from "./score";

export function cacheTtlDays(value: string | undefined) {
  const parsed = Number(value ?? "14");
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 30
    ? Math.floor(parsed)
    : 14;
}

export function analysisCacheKey(
  locale: string,
  modelVersion: string,
  fingerprint: string,
) {
  return `${METHODOLOGY_VERSION}:${locale}:${modelVersion}:${fingerprint}`;
}
