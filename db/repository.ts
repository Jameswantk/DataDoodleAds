import type { AuditResult } from "../lib/audit/types";

type D1ResultRow = Record<string, unknown>;

export type AuditJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type AuditJob = {
  callbackAttempts: number;
  callbackStatus: string;
  completedAt: string | null;
  createdAt: string;
  errorCode: string | null;
  externalLeadId: string;
  id: string;
  idempotencyKey: string;
  locale: string;
  normalizedUrl: string;
  publicToken: string;
  result: AuditResult | null;
  score: number | null;
  startedAt: string | null;
  status: AuditJobStatus;
  updatedAt: string;
  websiteUrl: string;
};

function mapJob(row: D1ResultRow): AuditJob {
  return {
    callbackAttempts: Number(row.callback_attempts ?? 0),
    callbackStatus: String(row.callback_status),
    completedAt:
      typeof row.completed_at === "string" ? row.completed_at : null,
    createdAt: String(row.created_at),
    errorCode: typeof row.error_code === "string" ? row.error_code : null,
    externalLeadId: String(row.external_lead_id),
    id: String(row.id),
    idempotencyKey: String(row.idempotency_key),
    locale: String(row.locale),
    normalizedUrl: String(row.normalized_url),
    publicToken: String(row.public_token),
    result:
      typeof row.result_json === "string"
        ? (JSON.parse(row.result_json) as AuditResult)
        : null,
    score: typeof row.score === "number" ? row.score : null,
    startedAt: typeof row.started_at === "string" ? row.started_at : null,
    status: String(row.status) as AuditJobStatus,
    updatedAt: String(row.updated_at),
    websiteUrl: String(row.website_url),
  };
}

export async function ensureDatabase(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS audit_jobs (
      id TEXT PRIMARY KEY NOT NULL,
      idempotency_key TEXT NOT NULL,
      external_lead_id TEXT NOT NULL,
      website_url TEXT NOT NULL,
      normalized_url TEXT NOT NULL,
      locale TEXT NOT NULL DEFAULT 'en',
      status TEXT NOT NULL,
      public_token TEXT NOT NULL,
      score INTEGER,
      result_json TEXT,
      error_code TEXT,
      callback_status TEXT NOT NULL DEFAULT 'pending',
      callback_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      started_at TEXT,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS audit_service_events (
      id TEXT PRIMARY KEY NOT NULL,
      audit_id TEXT NOT NULL REFERENCES audit_jobs(id),
      event_type TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      occurred_at TEXT NOT NULL
    )`),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS audit_jobs_idempotency_key_uidx ON audit_jobs(idempotency_key)",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS audit_jobs_public_token_uidx ON audit_jobs(public_token)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS audit_jobs_external_lead_id_idx ON audit_jobs(external_lead_id)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS audit_jobs_status_idx ON audit_jobs(status)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS audit_jobs_created_at_idx ON audit_jobs(created_at)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS audit_service_events_audit_id_idx ON audit_service_events(audit_id)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS audit_service_events_occurred_at_idx ON audit_service_events(occurred_at)",
    ),
  ]);
}

export type NewAuditJob = {
  externalLeadId: string;
  id: string;
  idempotencyKey: string;
  locale: string;
  normalizedUrl: string;
  publicToken: string;
  websiteUrl: string;
};

export async function createOrGetAuditJob(
  db: D1Database,
  input: NewAuditJob,
) {
  const now = new Date().toISOString();
  const insertion = await db
    .prepare(`INSERT OR IGNORE INTO audit_jobs (
      id, idempotency_key, external_lead_id, website_url, normalized_url,
      locale, status, public_token, callback_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, 'pending', ?, ?)`)
    .bind(
      input.id,
      input.idempotencyKey,
      input.externalLeadId,
      input.websiteUrl,
      input.normalizedUrl,
      input.locale,
      input.publicToken,
      now,
      now,
    )
    .run();

  const job = await getAuditJobByIdempotencyKey(db, input.idempotencyKey);
  if (!job) throw new Error("AUDIT_CREATE_FAILED");

  if (
    job.externalLeadId !== input.externalLeadId ||
    job.normalizedUrl !== input.normalizedUrl
  ) {
    throw new Error("IDEMPOTENCY_CONFLICT");
  }

  if (insertion.meta.changes > 0) {
    await recordAuditEvent(db, input.id, "audit_queued", {
      externalLeadId: input.externalLeadId,
      locale: input.locale,
    });
  }

  return { created: insertion.meta.changes > 0, job };
}

export async function getAuditJobById(
  db: D1Database,
  auditId: string,
): Promise<AuditJob | null> {
  const row = await db
    .prepare("SELECT * FROM audit_jobs WHERE id = ? LIMIT 1")
    .bind(auditId)
    .first<D1ResultRow>();
  return row ? mapJob(row) : null;
}

export async function getAuditJobByIdempotencyKey(
  db: D1Database,
  idempotencyKey: string,
): Promise<AuditJob | null> {
  const row = await db
    .prepare("SELECT * FROM audit_jobs WHERE idempotency_key = ? LIMIT 1")
    .bind(idempotencyKey)
    .first<D1ResultRow>();
  return row ? mapJob(row) : null;
}

export async function getAuditJobByToken(
  db: D1Database,
  publicToken: string,
): Promise<AuditJob | null> {
  const row = await db
    .prepare("SELECT * FROM audit_jobs WHERE public_token = ? LIMIT 1")
    .bind(publicToken)
    .first<D1ResultRow>();
  return row ? mapJob(row) : null;
}

export async function markAuditProcessing(
  db: D1Database,
  auditId: string,
) {
  const now = new Date().toISOString();
  await db
    .prepare(`UPDATE audit_jobs
      SET status = 'processing', started_at = COALESCE(started_at, ?),
          updated_at = ?, error_code = NULL
      WHERE id = ? AND status IN ('queued', 'processing')`)
    .bind(now, now, auditId)
    .run();
  await recordAuditEvent(db, auditId, "audit_processing");
}

export async function completeAudit(
  db: D1Database,
  auditId: string,
  result: AuditResult,
) {
  const now = new Date().toISOString();
  await db
    .prepare(`UPDATE audit_jobs
      SET status = 'completed', score = ?, result_json = ?, completed_at = ?,
          updated_at = ?, error_code = NULL
      WHERE id = ?`)
    .bind(result.score, JSON.stringify(result), now, now, auditId)
    .run();
  await recordAuditEvent(db, auditId, "audit_completed", {
    analysisMode: result.analysisMode,
    pagesAudited: result.pagesAudited.length,
    score: result.score,
  });
}

export async function failAudit(
  db: D1Database,
  auditId: string,
  errorCode: string,
) {
  const now = new Date().toISOString();
  await db
    .prepare(`UPDATE audit_jobs
      SET status = 'failed', error_code = ?, completed_at = ?, updated_at = ?
      WHERE id = ?`)
    .bind(errorCode, now, now, auditId)
    .run();
  await recordAuditEvent(db, auditId, "audit_failed", { errorCode });
}

export async function recordAuditEvent(
  db: D1Database,
  auditId: string,
  eventType: string,
  payload: Record<string, unknown> = {},
) {
  await db
    .prepare(`INSERT INTO audit_service_events (
      id, audit_id, event_type, payload_json, occurred_at
    ) VALUES (?, ?, ?, ?, ?)`)
    .bind(
      crypto.randomUUID(),
      auditId,
      eventType,
      JSON.stringify(payload),
      new Date().toISOString(),
    )
    .run();
}

export async function recordReportView(db: D1Database, auditId: string) {
  await recordAuditEvent(db, auditId, "report_viewed");
}

export async function recordCallbackAttempt(
  db: D1Database,
  auditId: string,
  status: "delivered" | "failed" | "skipped",
  detail: Record<string, unknown> = {},
) {
  const now = new Date().toISOString();
  await db
    .prepare(`UPDATE audit_jobs
      SET callback_status = ?, callback_attempts = callback_attempts + 1,
          updated_at = ?
      WHERE id = ?`)
    .bind(status, now, auditId)
    .run();
  await recordAuditEvent(db, auditId, `callback_${status}`, detail);
}
