import { env } from "cloudflare:workers";
import type { AuditResult } from "@/lib/audit/types";

type D1ResultRow = Record<string, unknown>;

function binding(): D1Database {
  if (!env.DB) {
    throw new Error("D1 binding `DB` is unavailable.");
  }
  return env.DB as D1Database;
}

export async function ensureDatabase() {
  const db = binding();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY NOT NULL,
      contact_name TEXT NOT NULL,
      email TEXT NOT NULL,
      mobile TEXT NOT NULL,
      website_url TEXT NOT NULL,
      audit_consent_at TEXT NOT NULL,
      marketing_consent_at TEXT,
      attribution_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS audits (
      id TEXT PRIMARY KEY NOT NULL,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      public_token TEXT NOT NULL,
      normalized_url TEXT NOT NULL,
      status TEXT NOT NULL,
      score INTEGER,
      result_json TEXT,
      error_code TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY NOT NULL,
      audit_id TEXT NOT NULL REFERENCES audits(id),
      event_type TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      occurred_at TEXT NOT NULL
    )`),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS leads_email_idx ON leads(email)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at)",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS audits_public_token_uidx ON audits(public_token)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS audits_lead_id_idx ON audits(lead_id)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS audits_status_idx ON audits(status)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS audit_events_audit_id_idx ON audit_events(audit_id)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS audit_events_occurred_at_idx ON audit_events(occurred_at)",
    ),
  ]);
}

export type NewAudit = {
  auditId: string;
  attribution: Record<string, string>;
  contactName: string;
  email: string;
  leadId: string;
  marketingConsent: boolean;
  mobile: string;
  normalizedUrl: string;
  publicToken: string;
  websiteUrl: string;
};

export async function createAudit(input: NewAudit) {
  const db = binding();
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare(`INSERT INTO leads (
        id, contact_name, email, mobile, website_url, audit_consent_at,
        marketing_consent_at, attribution_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        input.leadId,
        input.contactName,
        input.email,
        input.mobile,
        input.websiteUrl,
        now,
        input.marketingConsent ? now : null,
        JSON.stringify(input.attribution),
        now,
      ),
    db
      .prepare(`INSERT INTO audits (
        id, lead_id, public_token, normalized_url, status, created_at
      ) VALUES (?, ?, ?, ?, 'processing', ?)`)
      .bind(
        input.auditId,
        input.leadId,
        input.publicToken,
        input.normalizedUrl,
        now,
      ),
    db
      .prepare(`INSERT INTO audit_events (
        id, audit_id, event_type, payload_json, occurred_at
      ) VALUES (?, ?, 'audit_requested', ?, ?)`)
      .bind(
        crypto.randomUUID(),
        input.auditId,
        JSON.stringify({ attribution: input.attribution }),
        now,
      ),
  ]);
}

export async function completeAudit(auditId: string, result: AuditResult) {
  const db = binding();
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare(`UPDATE audits
        SET status = 'completed', score = ?, result_json = ?, completed_at = ?
        WHERE id = ?`)
      .bind(result.score, JSON.stringify(result), now, auditId),
    db
      .prepare(`INSERT INTO audit_events (
        id, audit_id, event_type, payload_json, occurred_at
      ) VALUES (?, ?, 'audit_completed', ?, ?)`)
      .bind(
        crypto.randomUUID(),
        auditId,
        JSON.stringify({ score: result.score }),
        now,
      ),
  ]);
}

export async function failAudit(auditId: string, errorCode: string) {
  const db = binding();
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare(`UPDATE audits
        SET status = 'failed', error_code = ?, completed_at = ?
        WHERE id = ?`)
      .bind(errorCode, now, auditId),
    db
      .prepare(`INSERT INTO audit_events (
        id, audit_id, event_type, payload_json, occurred_at
      ) VALUES (?, ?, 'audit_failed', ?, ?)`)
      .bind(
        crypto.randomUUID(),
        auditId,
        JSON.stringify({ errorCode }),
        now,
      ),
  ]);
}

export async function getAuditByToken(publicToken: string) {
  const row = await binding()
    .prepare(`SELECT
      a.id, a.normalized_url, a.status, a.score, a.result_json,
      a.error_code, a.created_at, a.completed_at,
      l.contact_name, l.email
    FROM audits a
    JOIN leads l ON l.id = a.lead_id
    WHERE a.public_token = ?
    LIMIT 1`)
    .bind(publicToken)
    .first<D1ResultRow>();

  if (!row) return null;
  return {
    id: String(row.id),
    normalizedUrl: String(row.normalized_url),
    status: String(row.status),
    score: typeof row.score === "number" ? row.score : null,
    result:
      typeof row.result_json === "string"
        ? (JSON.parse(row.result_json) as AuditResult)
        : null,
    errorCode:
      typeof row.error_code === "string" ? row.error_code : null,
    createdAt: String(row.created_at),
    completedAt:
      typeof row.completed_at === "string" ? row.completed_at : null,
    contactName: String(row.contact_name),
    email: String(row.email),
  };
}

export async function recordReportView(auditId: string) {
  const now = new Date().toISOString();
  await binding()
    .prepare(`INSERT INTO audit_events (
      id, audit_id, event_type, payload_json, occurred_at
    ) VALUES (?, ?, 'report_viewed', '{}', ?)`)
    .bind(crypto.randomUUID(), auditId, now)
    .run();
}
