import type { AuditResult } from "../lib/audit/types";

export type AuditWorkflowParams = {
  auditId: string;
  baseUrl: string;
  locale: string;
  normalizedUrl: string;
  publicToken: string;
};

type WorkflowInstance = {
  id: string;
  status?(): Promise<unknown>;
};

type WorkflowBinding = {
  create(options: {
    id?: string;
    params: AuditWorkflowParams;
  }): Promise<WorkflowInstance>;
  get(id: string): Promise<WorkflowInstance>;
};

type WorkersAi = {
  run(
    model: string,
    input: Record<string, unknown>,
  ): Promise<{ response?: unknown } | unknown>;
};

export interface AuditEnv {
  AI?: WorkersAi;
  ASSETS: Fetcher;
  AUDIT_API_KEY?: string;
  AUDIT_CALLBACK_SIGNING_SECRET?: string;
  AUDIT_CALLBACK_URL?: string;
  AUDIT_WORKFLOW?: WorkflowBinding;
  DB: D1Database;
  EVIDENCE?: R2Bucket;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: {
          format: string;
          quality: number;
        }): Promise<{ response(): Response }>;
      };
    };
  };
  REPORT_CTA_LABEL?: string;
  REPORT_CTA_URL?: string;
  WORKERS_AI_MODEL?: string;
}

export type AuditEvidenceRecord = {
  auditId: string;
  result: AuditResult;
  storedAt: string;
};

export interface WorkerExecutionContext {
  passThroughOnException(): void;
  waitUntil(promise: Promise<unknown>): void;
}
